/**
 * Upload Routes
 * Handles CSV file uploads including bulk uploads with async processing
 */

const express = require('express')
const router = express.Router()
const multer = require('multer')
const { PrismaClient } = require('@prisma/client')
const Bull = require('bull')
const { getPresignedPutUrl, BUCKETS } = require('../config/minio')

const prisma = new PrismaClient()

// Configure multer for single file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: process.env.MAX_FILE_SIZE || 10 * 1024 * 1024, // 10MB default
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
            cb(null, true)
        } else {
            cb(new Error('Only CSV files are allowed'), false)
        }
    },
})

// Create Bull queue for processing jobs
const processingQueue = new Bull('csv-processing', {
    redis: {
        host: process.env.REDIS_HOST || '100.114.145.101',
        port: parseInt(process.env.REDIS_PORT) || 6379,
    },
})

/**
 * Parse date string to valid Date object
 * Handles dd-mm-yyyy format from CSV files
 */
function parseDate(dateStr) {
    if (!dateStr || dateStr.trim() === '') {
        throw new Error('Empty date value')
    }

    const trimmed = dateStr.trim()

    // Handle dd-mm-yyyy format (e.g., 24-12-2024)
    const ddmmyyyyMatch = trimmed.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/)
    if (ddmmyyyyMatch) {
        const [, day, month, year] = ddmmyyyyMatch
        const date = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day)))
        if (!isNaN(date.getTime())) {
            return date
        }
    }

    // Handle dd/mm/yyyy format (e.g., 24/12/2024)
    const ddmmyyyySlashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
    if (ddmmyyyySlashMatch) {
        const [, day, month, year] = ddmmyyyySlashMatch
        const date = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day)))
        if (!isNaN(date.getTime())) {
            return date
        }
    }

    // Handle yyyy-mm-dd format (ISO format)
    const yyyymmddMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
    if (yyyymmddMatch) {
        const [, year, month, day] = yyyymmddMatch
        const date = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day)))
        if (!isNaN(date.getTime())) {
            return date
        }
    }

    // Fallback: try standard JavaScript Date parsing
    const date = new Date(trimmed)
    if (!isNaN(date.getTime())) {
        return date
    }

    throw new Error(`Unable to parse date: "${dateStr}" (expected format: dd-mm-yyyy)`)
}

/**
 * Generate unique object key for MinIO
 * @param {string} fileName - Original filename
 * @param {string} batchId - Batch ID (optional)
 * @returns {string} Object key
 */
function generateObjectKey(fileName, batchId = null) {
    const timestamp = Date.now()
    const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_')
    if (batchId) {
        return `uploads/${batchId}/${timestamp}_${sanitizedName}`
    }
    return `uploads/${timestamp}_${sanitizedName}`
}

// =====================================================
// SINGLE FILE UPLOAD (Legacy - processes synchronously)
// =====================================================

/**
 * Process single CSV file
 * @param {Object} file - Multer file object
 * @returns {Promise<Object>} Processing result
 */
async function processSingleFile(file) {
    const csvContent = file.buffer.toString('utf-8')

    // Detect delimiter (tab, comma, or semicolon)
    const firstLine = csvContent.split('\n')[0]
    const tabCount = (firstLine.match(/\t/g) || []).length
    const commaCount = (firstLine.match(/,/g) || []).length
    const semicolonCount = (firstLine.match(/;/g) || []).length

    let delimiter = ','
    if (tabCount > commaCount && tabCount > semicolonCount) {
        delimiter = '\t'
    } else if (semicolonCount > commaCount) {
        delimiter = ';'
    }

    const rows = csvContent.split('\n').filter((row) => row.trim())
    const headerRow = rows[0].split(delimiter).map((h) => h.trim().toLowerCase().replace(/\s+/g, ''))

    const requiredColumns = ['date', 'ticker', 'close']
    const missingColumns = requiredColumns.filter((col) => !headerRow.includes(col))

    if (missingColumns.length > 0) {
        throw new Error(`Missing required columns: ${missingColumns.join(', ')}`)
    }

    const data = []
    for (let i = 1; i < rows.length; i++) {
        const values = rows[i].split(delimiter).map((v) => v.trim())
        const row = {}
        headerRow.forEach((header, index) => {
            row[header] = values[index] || null
        })
        data.push(row)
    }

    // Get or create tickers
    const tickerSymbols = [...new Set(data.map((row) => row.ticker))]
    const tickerResults = await Promise.all(
        tickerSymbols.map((symbol) =>
            prisma.ticker.upsert({
                where: { symbol },
                update: {},
                create: { symbol },
            })
        )
    )

    const tickerMap = {}
    tickerResults.forEach((t) => {
        tickerMap[t.symbol] = t.id
    })

    // Batch insert data with proper date parsing
    const seasonalityData = data.map((row, index) => {
        try {
            const date = parseDate(row.date)

            return {
                date,
                tickerId: tickerMap[row.ticker],
                open: parseFloat(row.open) || parseFloat(row.close) || 0,
                high: parseFloat(row.high) || parseFloat(row.close) || 0,
                low: parseFloat(row.low) || parseFloat(row.close) || 0,
                close: parseFloat(row.close) || 0,
                volume: parseFloat(row.volume) || 0,
                openInterest: parseFloat(row.openinterest) || 0,
            }
        } catch (error) {
            throw new Error(`Row ${index + 2} (Ticker: ${row.ticker}): ${error.message}`)
        }
    })

    // Insert in batches
    const BATCH_SIZE = 1000
    let totalInserted = 0

    for (let i = 0; i < seasonalityData.length; i += BATCH_SIZE) {
        const batch = seasonalityData.slice(i, i + BATCH_SIZE)

        await prisma.$transaction(
            batch.map((row) =>
                prisma.seasonalityData.upsert({
                    where: {
                        date_tickerId: {
                            date: row.date,
                            tickerId: row.tickerId,
                        },
                    },
                    update: {
                        open: row.open,
                        high: row.high,
                        low: row.low,
                        close: row.close,
                        volume: row.volume,
                        openInterest: row.openInterest,
                    },
                    create: row,
                })
            )
        )

        totalInserted += batch.length
    }

    return {
        recordsProcessed: data.length,
        tickersFound: tickerSymbols.length,
        tickersCreated: tickerResults.filter((t) => t.createdAt === t.updatedAt).length,
        dataEntriesCreated: totalInserted,
    }
}

// =====================================================
// BULK UPLOAD (New - async processing with queue)
// =====================================================

/**
 * Generate presigned URLs for bulk upload
 * POST /api/upload/bulk/presign
 * Body: { files: [{ name: string, size: number }] }
 */
router.post('/bulk/presign', async (req, res, next) => {
    try {
        const { files } = req.body

        if (!files || !Array.isArray(files) || files.length === 0) {
            return res.status(400).json({
                error: 'No files specified',
                message: 'Please provide an array of files to upload',
            })
        }

        if (files.length > 500) {
            return res.status(400).json({
                error: 'Too many files',
                message: 'Maximum 500 files per batch upload',
            })
        }

        // Generate batch ID
        const batchId = `batch_${Date.now()}`

        // Generate presigned URLs for each file
        const uploadUrls = files.map((file, index) => {
            const objectKey = generateObjectKey(file.name, batchId)
            return {
                fileName: file.name,
                fileSize: file.size,
                objectKey,
                uploadUrl: null, // Will be filled after async URL generation
            }
        })

        // Generate URLs asynchronously (can be slow for many files)
        const urlsWithPresigned = await Promise.all(
            uploadUrls.map(async (item) => {
                try {
                    const presignedUrl = await getPresignedPutUrl(
                        BUCKETS.UPLOADS,
                        item.objectKey,
                        3600 // 1 hour expiry
                    )
                    return {
                        ...item,
                        uploadUrl: presignedUrl,
                    }
                } catch (error) {
                    console.error(`Error generating presigned URL for ${item.fileName}:`, error.message)
                    return {
                        ...item,
                        uploadUrl: null,
                        error: 'Failed to generate upload URL',
                    }
                }
            })
        )

        res.json({
            success: true,
            data: {
                batchId,
                files: urlsWithPresigned,
                expiresIn: 3600, // 1 hour
            },
        })
    } catch (error) {
        next(error)
    }
})

/**
 * Confirm upload complete and start async processing
 * POST /api/upload/bulk/process
 * Body: { batchId: string, objectKeys: string[] }
 */
router.post('/bulk/process', async (req, res, next) => {
    try {
        const { batchId, objectKeys, fileNames } = req.body

        if (!batchId || !objectKeys || !Array.isArray(objectKeys)) {
            return res.status(400).json({
                error: 'Invalid request',
                message: 'Please provide batchId and objectKeys array',
            })
        }

        // Check if batch already exists
        const existingBatch = await prisma.uploadBatch.findUnique({
            where: { id: batchId },
        })

        if (existingBatch) {
            return res.status(400).json({
                error: 'Batch already exists',
                message: `Batch ${batchId} has already been submitted`,
            })
        }

        // Create batch record
        const batch = await prisma.uploadBatch.create({
            data: {
                id: batchId,
                status: 'PENDING',
                totalFiles: objectKeys.length,
                processedFiles: 0,
                failedFiles: 0,
                files: {
                    create: objectKeys.map((key, index) => ({
                        objectKey: key,
                        fileName: fileNames?.[index] || key.split('/').pop(),
                        status: 'PENDING',
                    })),
                },
            },
        })

        // Add all files to processing queue
        await Promise.all(
            objectKeys.map((objectKey, index) =>
                processingQueue.add(
                    {
                        objectKey,
                        batchId,
                        fileIndex: index,
                        fileName: fileNames?.[index] || objectKey.split('/').pop(),
                        priority: 10 - Math.min(index, 10), // Earlier files higher priority
                    },
                    {
                        priority: 10 - Math.min(index, 10),
                        attempts: 3,
                        backoff: { type: 'exponential', delay: 1000 },
                    }
                )
            )
        )

        res.json({
            success: true,
            data: {
                batchId,
                status: 'PROCESSING',
                totalFiles: objectKeys.length,
                message: `${objectKeys.length} files queued for processing`,
            },
        })
    } catch (error) {
        next(error)
    }
})

/**
 * Get batch processing status
 * GET /api/upload/bulk/:batchId/status
 */
router.get('/bulk/:batchId/status', async (req, res, next) => {
    try {
        const { batchId } = req.params

        const batch = await prisma.uploadBatch.findUnique({
            where: { id: batchId },
            include: {
                files: {
                    select: {
                        id: true,
                        fileName: true,
                        status: true,
                        recordsProcessed: true,
                        error: true,
                        processedAt: true,
                    },
                    orderBy: { id: 'asc' },
                },
            },
        })

        if (!batch) {
            return res.status(404).json({
                error: 'Batch not found',
                message: `No batch found with ID ${batchId}`,
            })
        }

        // Get queue status
        const queueStatus = await processingQueue.getJobCounts()

        // Calculate progress
        const progress =
            batch.totalFiles > 0 ? ((batch.processedFiles + batch.failedFiles) / batch.totalFiles) * 100 : 0

        res.json({
            success: true,
            data: {
                batchId: batch.id,
                status: batch.status,
                progress: Math.round(progress * 100) / 100,
                totalFiles: batch.totalFiles,
                processedFiles: batch.processedFiles,
                failedFiles: batch.failedFiles,
                pendingFiles: batch.totalFiles - batch.processedFiles - batch.failedFiles,
                createdAt: batch.createdAt,
                updatedAt: batch.updatedAt,
                queue: {
                    waiting: queueStatus.waiting,
                    active: queueStatus.active,
                    completed: queueStatus.completed,
                    failed: queueStatus.failed,
                    delayed: queueStatus.delayed,
                },
                files: batch.files.map((f) => ({
                    ...f,
                    status: f.status,
                })),
            },
        })
    } catch (error) {
        next(error)
    }
})

/**
 * List all batches
 * GET /api/upload/bulk
 */
router.get('/bulk', async (req, res, next) => {
    try {
        const { status, limit = 20, offset = 0 } = req.query

        const where = {}
        if (status) {
            where.status = status
        }

        const batches = await prisma.uploadBatch.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: parseInt(limit),
            skip: parseInt(offset),
            include: {
                _count: {
                    select: { files: true },
                },
            },
        })

        const total = await prisma.uploadBatch.count({ where })

        res.json({
            success: true,
            data: {
                batches: batches.map((b) => ({
                    batchId: b.id,
                    status: b.status,
                    totalFiles: b.totalFiles,
                    processedFiles: b.processedFiles,
                    failedFiles: b.failedFiles,
                    progress:
                        b.totalFiles > 0
                            ? Math.round(((b.processedFiles + b.failedFiles) / b.totalFiles) * 10000) / 100
                            : 0,
                    createdAt: b.createdAt,
                    updatedAt: b.updatedAt,
                })),
                pagination: {
                    total,
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                },
            },
        })
    } catch (error) {
        next(error)
    }
})

/**
 * Retry failed files in a batch
 * POST /api/upload/bulk/:batchId/retry
 */
router.post('/bulk/:batchId/retry', async (req, res, next) => {
    try {
        const { batchId } = req.params

        const batch = await prisma.uploadBatch.findUnique({
            where: { id: batchId },
            include: {
                files: {
                    where: { status: 'FAILED' },
                },
            },
        })

        if (!batch) {
            return res.status(404).json({
                error: 'Batch not found',
                message: `No batch found with ID ${batchId}`,
            })
        }

        const failedFiles = batch.files
        if (failedFiles.length === 0) {
            return res.status(400).json({
                error: 'No failed files',
                message: 'There are no failed files to retry in this batch',
            })
        }

        // Update batch status
        await prisma.uploadBatch.update({
            where: { id: batchId },
            data: {
                status: 'PROCESSING',
                failedFiles: 0, // Reset failed count
            },
        })

        // Reset file statuses
        await prisma.uploadedFile.updateMany({
            where: { batchId, status: 'FAILED' },
            data: {
                status: 'PENDING',
                error: null,
                processedAt: null,
            },
        })

        // Re-add failed files to queue
        await Promise.all(
            failedFiles.map((file) =>
                processingQueue.add(
                    {
                        objectKey: file.objectKey,
                        batchId,
                        fileName: file.fileName,
                        retry: true,
                    },
                    {
                        priority: 1, // High priority for retries
                        attempts: 3,
                        backoff: { type: 'exponential', delay: 2000 },
                    }
                )
            )
        )

        res.json({
            success: true,
            data: {
                batchId,
                status: 'PROCESSING',
                filesRetried: failedFiles.length,
                message: `${failedFiles.length} failed files queued for retry`,
            },
        })
    } catch (error) {
        next(error)
    }
})

// Health check for upload service
router.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'upload-service',
        maxFileSize: process.env.MAX_FILE_SIZE || '10MB',
        features: {
            singleUpload: true,
            bulkUpload: true,
            asyncProcessing: true,
        },
    })
})

module.exports = router
