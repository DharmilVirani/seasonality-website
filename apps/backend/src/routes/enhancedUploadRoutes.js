/**
 * Enhanced Upload Routes - Multi-Timeframe Upload Processing
 * 
 * Provides enhanced upload endpoints with multi-timeframe data generation
 * Integrates with new schema and timeframe services
 * 
 * @author Seasonality SaaS Team
 * @version 1.0.0
 */

const express = require('express');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const EnhancedUploadService = require('../services/enhancedUploadService');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();
const enhancedUploadService = new EnhancedUploadService();

// Configure multer for file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit
        files: 20 // Maximum 20 files per request
    },
    fileFilter: (req, file, cb) => {
        // Accept only CSV files
        if (file.mimetype === 'text/csv' ||
            file.originalname.toLowerCase().endsWith('.csv')) {
            cb(null, true);
        } else {
            cb(new Error('Only CSV files are allowed'), false);
        }
    }
});

// Rate limiting for upload endpoints
const uploadRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 uploads per windowMs
    message: {
        error: 'Too many upload requests, please try again later',
        retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Apply rate limiting to upload routes
router.use(uploadRateLimit);

/**
 * POST /api/upload/enhanced/single
 * Upload single CSV file with multi-timeframe processing
 */
router.post('/single',
    authenticateToken,
    requireRole(['ADMIN', 'RESEARCH_TEAM']),
    upload.single('file'),
    async (req, res) => {
        const startTime = Date.now();

        try {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    error: 'No file uploaded',
                    message: 'Please select a CSV file to upload'
                });
            }

            const options = {
                timeframe: req.body.timeframe,
                generateAllTimeframes: req.body.generateAllTimeframes === 'true',
                calculateReturns: req.body.calculateReturns !== 'false'
            };

            const result = await enhancedUploadService.processUploadedFile(
                req.file,
                req.user.id,
                options
            );

            res.json({
                success: true,
                data: result,
                metadata: {
                    fileName: req.file.originalname,
                    fileSize: req.file.size,
                    uploadedBy: req.user.name,
                    uploadTime: new Date().toISOString(),
                    totalExecutionTime: Date.now() - startTime
                }
            });

        } catch (error) {
            console.error('Enhanced single upload error:', error);
            res.status(500).json({
                success: false,
                error: 'Upload processing failed',
                message: error.message,
                executionTime: Date.now() - startTime
            });
        }
    }
);

/**
 * POST /api/upload/enhanced/batch
 * Upload multiple CSV files with batch processing
 */
router.post('/batch',
    authenticateToken,
    requireRole(['ADMIN', 'RESEARCH_TEAM']),
    upload.array('files', 20),
    async (req, res) => {
        const startTime = Date.now();

        try {
            if (!req.files || req.files.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'No files uploaded',
                    message: 'Please select CSV files to upload'
                });
            }

            const options = {
                timeframe: req.body.timeframe,
                generateAllTimeframes: req.body.generateAllTimeframes === 'true',
                calculateReturns: req.body.calculateReturns !== 'false',
                concurrency: parseInt(req.body.concurrency) || 3
            };

            const result = await enhancedUploadService.processBatchUpload(
                req.files,
                req.user.id,
                options
            );

            res.json({
                success: true,
                data: result,
                metadata: {
                    totalFiles: req.files.length,
                    totalSize: req.files.reduce((sum, file) => sum + file.size, 0),
                    uploadedBy: req.user.name,
                    uploadTime: new Date().toISOString(),
                    totalExecutionTime: Date.now() - startTime
                }
            });

        } catch (error) {
            console.error('Enhanced batch upload error:', error);
            res.status(500).json({
                success: false,
                error: 'Batch upload processing failed',
                message: error.message,
                executionTime: Date.now() - startTime
            });
        }
    }
);

/**
 * GET /api/upload/enhanced/history
 * Get upload history for user
 */
router.get('/history',
    authenticateToken,
    async (req, res) => {
        try {
            const filters = {
                status: req.query.status,
                startDate: req.query.startDate,
                endDate: req.query.endDate,
                limit: parseInt(req.query.limit) || 50
            };

            const history = await enhancedUploadService.getUploadHistory(req.user.id, filters);

            res.json({
                success: true,
                data: history,
                metadata: {
                    totalResults: history.length,
                    filters: filters,
                    requestTime: new Date().toISOString()
                }
            });

        } catch (error) {
            console.error('Upload history error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch upload history',
                message: error.message
            });
        }
    }
);

/**
 * GET /api/upload/enhanced/batch/:batchId
 * Get detailed batch information
 */
router.get('/batch/:batchId',
    authenticateToken,
    async (req, res) => {
        try {
            const batchDetails = await enhancedUploadService.getUploadBatchDetails(
                req.params.batchId,
                req.user.id
            );

            res.json({
                success: true,
                data: batchDetails,
                requestTime: new Date().toISOString()
            });

        } catch (error) {
            console.error('Batch details error:', error);

            if (error.message.includes('not found') || error.message.includes('access denied')) {
                return res.status(404).json({
                    success: false,
                    error: 'Batch not found',
                    message: error.message
                });
            }

            res.status(500).json({
                success: false,
                error: 'Failed to fetch batch details',
                message: error.message
            });
        }
    }
);

/**
 * POST /api/upload/enhanced/retry/:batchId
 * Retry failed upload processing
 */
router.post('/retry/:batchId',
    authenticateToken,
    requireRole(['ADMIN', 'RESEARCH_TEAM']),
    async (req, res) => {
        try {
            const retryResult = await enhancedUploadService.retryFailedUpload(
                req.params.batchId,
                req.user.id
            );

            res.json({
                success: true,
                data: retryResult,
                message: 'Retry initiated successfully',
                requestTime: new Date().toISOString()
            });

        } catch (error) {
            console.error('Upload retry error:', error);

            if (error.message.includes('No failed upload')) {
                return res.status(404).json({
                    success: false,
                    error: 'No failed upload found',
                    message: error.message
                });
            }

            res.status(500).json({
                success: false,
                error: 'Failed to retry upload',
                message: error.message
            });
        }
    }
);

/**
 * GET /api/upload/enhanced/stats
 * Get upload processing statistics
 */
router.get('/stats',
    authenticateToken,
    requireRole(['ADMIN']),
    async (req, res) => {
        try {
            const stats = enhancedUploadService.getProcessingMetrics();

            res.json({
                success: true,
                data: stats,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Upload stats error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch upload statistics',
                message: error.message
            });
        }
    }
);

/**
 * DELETE /api/upload/enhanced/batch/:batchId
 * Delete upload batch and associated data (admin only)
 */
router.delete('/batch/:batchId',
    authenticateToken,
    requireRole(['ADMIN']),
    async (req, res) => {
        try {
            // First verify the batch exists and get details
            const batchDetails = await enhancedUploadService.getUploadBatchDetails(
                req.params.batchId,
                req.user.id
            );

            // Delete the batch (this should cascade to files)
            await enhancedUploadService.prisma.uploadBatch.delete({
                where: { id: req.params.batchId }
            });

            res.json({
                success: true,
                message: 'Upload batch deleted successfully',
                data: {
                    batchId: req.params.batchId,
                    deletedFiles: batchDetails.files.length
                },
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Batch deletion error:', error);

            if (error.message.includes('not found')) {
                return res.status(404).json({
                    success: false,
                    error: 'Batch not found',
                    message: error.message
                });
            }

            res.status(500).json({
                success: false,
                error: 'Failed to delete batch',
                message: error.message
            });
        }
    }
);

/**
 * GET /api/upload/enhanced/validate
 * Validate CSV file structure without processing
 */
router.post('/validate',
    authenticateToken,
    upload.single('file'),
    async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    error: 'No file uploaded',
                    message: 'Please select a CSV file to validate'
                });
            }

            // Use the CSV service to validate structure
            const csvService = require('../services/csvService');
            const { records, warnings, errors } = csvService.processCSV(req.file.buffer, { validateOnly: true });

            const validation = {
                isValid: errors.length === 0,
                recordCount: records.length,
                warnings: warnings,
                errors: errors,
                detectedTimeframe: enhancedUploadService._determineTimeframe(req.file.originalname, {}),
                sampleRecords: records.slice(0, 5) // First 5 records as sample
            };

            res.json({
                success: true,
                data: validation,
                metadata: {
                    fileName: req.file.originalname,
                    fileSize: req.file.size,
                    validatedAt: new Date().toISOString()
                }
            });

        } catch (error) {
            console.error('File validation error:', error);
            res.status(500).json({
                success: false,
                error: 'File validation failed',
                message: error.message
            });
        }
    }
);

/**
 * Error handling middleware for upload routes
 */
router.use((error, req, res, next) => {
    console.error('Enhanced upload route error:', error);

    // Handle multer errors
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                error: 'File too large',
                message: 'File size must be less than 50MB'
            });
        }

        if (error.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
                success: false,
                error: 'Too many files',
                message: 'Maximum 20 files allowed per upload'
            });
        }
    }

    // Handle file type errors
    if (error.message === 'Only CSV files are allowed') {
        return res.status(400).json({
            success: false,
            error: 'Invalid file type',
            message: 'Only CSV files are allowed'
        });
    }

    // Generic error response
    res.status(500).json({
        success: false,
        error: 'Upload processing error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred during upload'
    });
});

module.exports = router;