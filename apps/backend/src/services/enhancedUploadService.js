/**
 * Enhanced Upload Service - Multi-Timeframe Data Processing
 * 
 * Integrates with new schema and timeframe generation
 * Handles bulk CSV processing with multi-timeframe data creation
 * 
 * @author Seasonality SaaS Team
 * @version 1.0.0
 */

const { PrismaClient } = require('@prisma/client');
const TimeframeService = require('./timeframeService');
const CalculationEngine = require('./calculationEngine');
const CacheService = require('./cacheService');
const csvService = require('./csvService');

/**
 * EnhancedUploadService Class
 * Complete upload processing with multi-timeframe generation
 */
class EnhancedUploadService {
    constructor() {
        this.prisma = new PrismaClient();
        this.timeframeService = new TimeframeService();
        this.calculationEngine = new CalculationEngine();
        this.cacheService = new CacheService();

        // Processing metrics
        this.processingMetrics = {
            totalUploads: 0,
            successfulUploads: 0,
            failedUploads: 0,
            totalRecordsProcessed: 0,
            averageProcessingTime: 0
        };
    }

    /**
     * Process uploaded CSV file with multi-timeframe generation
     * 
     * @param {Object} file - Uploaded file object
     * @param {number} userId - User ID
     * @param {Object} options - Processing options
     * @returns {Object} Processing result
     */
    async processUploadedFile(file, userId, options = {}) {
        const startTime = Date.now();
        const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        try {
            console.log(`🚀 Starting enhanced upload processing [${batchId}]`);

            // 1. Create upload batch record
            const uploadBatch = await this.prisma.uploadBatch.create({
                data: {
                    id: batchId,
                    totalFiles: 1,
                    uploadedBy: userId,
                    originalName: file.originalname,
                    fileSize: BigInt(file.size)
                }
            });

            // 2. Create uploaded file record
            const uploadedFile = await this.prisma.uploadedFile.create({
                data: {
                    batchId: batchId,
                    objectKey: file.filename || file.originalname,
                    fileName: file.originalname,
                    fileSize: BigInt(file.size),
                    status: 'PROCESSING'
                }
            });

            // 3. Process CSV data
            const { records, warnings } = csvService.processCSV(file.buffer);

            if (!records || records.length === 0) {
                throw new Error('No valid records found in CSV file');
            }

            // 4. Determine timeframe from filename or options
            const timeframe = this._determineTimeframe(file.originalname, options);

            // 5. Group records by ticker
            const recordsByTicker = this._groupRecordsByTicker(records);

            // 6. Process each ticker with multi-timeframe generation
            const processingResults = await this._processTickersWithTimeframes(
                recordsByTicker,
                timeframe,
                uploadedFile.id
            );

            // 7. Update batch and file status
            await this._updateProcessingStatus(uploadBatch.id, uploadedFile.id, processingResults);

            // 8. Generate processing report
            const report = await this._generateProcessingReport(
                uploadBatch,
                processingResults,
                warnings,
                Date.now() - startTime
            );

            // 9. Clear related caches
            await this._clearRelatedCaches(Object.keys(recordsByTicker));

            this._updateProcessingMetrics(Date.now() - startTime, true);

            console.log(`✅ Enhanced upload processing completed [${batchId}]`);

            return report;

        } catch (error) {
            console.error(`❌ Enhanced upload processing failed [${batchId}]:`, error);

            // Update status to failed
            await this._updateFailedStatus(batchId, error.message);

            this._updateProcessingMetrics(Date.now() - startTime, false);

            throw new Error(`Upload processing failed: ${error.message}`);
        }
    }

    /**
     * Process multiple files in batch
     * 
     * @param {Array} files - Array of uploaded files
     * @param {number} userId - User ID
     * @param {Object} options - Processing options
     * @returns {Object} Batch processing result
     */
    async processBatchUpload(files, userId, options = {}) {
        const startTime = Date.now();
        const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        try {
            console.log(`🚀 Starting batch upload processing [${batchId}] - ${files.length} files`);

            // 1. Create upload batch record
            const uploadBatch = await this.prisma.uploadBatch.create({
                data: {
                    id: batchId,
                    totalFiles: files.length,
                    uploadedBy: userId,
                    originalName: `Batch Upload - ${files.length} files`,
                    fileSize: BigInt(files.reduce((sum, file) => sum + file.size, 0))
                }
            });

            // 2. Process files in parallel (with concurrency limit)
            const concurrencyLimit = options.concurrency || 3;
            const results = [];

            for (let i = 0; i < files.length; i += concurrencyLimit) {
                const batch = files.slice(i, i + concurrencyLimit);
                const batchPromises = batch.map(file =>
                    this._processSingleFileInBatch(file, batchId, options)
                        .catch(error => ({
                            fileName: file.originalname,
                            error: error.message,
                            success: false
                        }))
                );

                const batchResults = await Promise.all(batchPromises);
                results.push(...batchResults);

                // Progress update
                const progress = Math.min(100, ((i + batch.length) / files.length) * 100);
                await this.prisma.uploadBatch.update({
                    where: { id: batchId },
                    data: {
                        processedFiles: i + batch.length,
                        // Could add progress field to schema
                    }
                });

                console.log(`📈 Batch progress: ${progress.toFixed(1)}% (${i + batch.length}/${files.length})`);
            }

            // 3. Calculate final statistics
            const successfulFiles = results.filter(r => r.success).length;
            const failedFiles = results.length - successfulFiles;
            const totalRecords = results.reduce((sum, r) => sum + (r.recordsProcessed || 0), 0);

            // 4. Update batch status
            await this.prisma.uploadBatch.update({
                where: { id: batchId },
                data: {
                    status: failedFiles === 0 ? 'COMPLETED' :
                        successfulFiles === 0 ? 'FAILED' : 'PARTIAL',
                    processedFiles: successfulFiles,
                    failedFiles: failedFiles,
                    totalRecords: totalRecords,
                    processedRecords: totalRecords,
                    completedAt: new Date()
                }
            });

            const executionTime = Date.now() - startTime;

            console.log(`✅ Batch upload processing completed [${batchId}] in ${executionTime}ms`);

            return {
                batchId,
                totalFiles: files.length,
                successfulFiles,
                failedFiles,
                totalRecords,
                executionTime,
                results: results.slice(0, 10), // Limit results for response size
                summary: {
                    status: failedFiles === 0 ? 'SUCCESS' :
                        successfulFiles === 0 ? 'FAILED' : 'PARTIAL',
                    message: `Processed ${successfulFiles}/${files.length} files successfully`
                }
            };

        } catch (error) {
            console.error(`❌ Batch upload processing failed [${batchId}]:`, error);
            throw new Error(`Batch upload processing failed: ${error.message}`);
        }
    }

    /**
     * Get upload history for a user
     * 
     * @param {number} userId - User ID
     * @param {Object} filters - Query filters
     * @returns {Array} Upload history
     */
    async getUploadHistory(userId, filters = {}) {
        try {
            const uploadBatches = await this.prisma.uploadBatch.findMany({
                where: {
                    uploadedBy: userId,
                    status: filters.status,
                    createdAt: {
                        gte: filters.startDate ? new Date(filters.startDate) : undefined,
                        lte: filters.endDate ? new Date(filters.endDate) : undefined
                    }
                },
                include: {
                    files: {
                        select: {
                            fileName: true,
                            status: true,
                            recordsProcessed: true,
                            error: true
                        }
                    },
                    user: {
                        select: { name: true, email: true }
                    }
                },
                orderBy: { createdAt: 'desc' },
                take: filters.limit || 50
            });

            return uploadBatches.map(batch => ({
                id: batch.id,
                originalName: batch.originalName,
                status: batch.status,
                totalFiles: batch.totalFiles,
                processedFiles: batch.processedFiles,
                failedFiles: batch.failedFiles,
                totalRecords: batch.totalRecords,
                fileSize: batch.fileSize?.toString(),
                createdAt: batch.createdAt,
                completedAt: batch.completedAt,
                user: batch.user,
                files: batch.files.slice(0, 5) // Limit files for performance
            }));

        } catch (error) {
            console.error('Error fetching upload history:', error);
            throw new Error(`Failed to fetch upload history: ${error.message}`);
        }
    }

    /**
     * Get detailed upload batch information
     * 
     * @param {string} batchId - Batch ID
     * @param {number} userId - User ID (for authorization)
     * @returns {Object} Detailed batch information
     */
    async getUploadBatchDetails(batchId, userId) {
        try {
            const batch = await this.prisma.uploadBatch.findFirst({
                where: {
                    id: batchId,
                    uploadedBy: userId
                },
                include: {
                    files: {
                        include: {
                            // Could include related ticker data if needed
                        }
                    },
                    user: {
                        select: { name: true, email: true }
                    }
                }
            });

            if (!batch) {
                throw new Error('Upload batch not found or access denied');
            }

            return {
                ...batch,
                fileSize: batch.fileSize?.toString(),
                files: batch.files.map(file => ({
                    ...file,
                    fileSize: file.fileSize?.toString()
                }))
            };

        } catch (error) {
            console.error('Error fetching batch details:', error);
            throw new Error(`Failed to fetch batch details: ${error.message}`);
        }
    }

    /**
     * Retry failed upload processing
     * 
     * @param {string} batchId - Batch ID
     * @param {number} userId - User ID
     * @returns {Object} Retry result
     */
    async retryFailedUpload(batchId, userId) {
        try {
            const batch = await this.prisma.uploadBatch.findFirst({
                where: {
                    id: batchId,
                    uploadedBy: userId,
                    status: { in: ['FAILED', 'PARTIAL'] }
                },
                include: {
                    files: {
                        where: { status: 'FAILED' }
                    }
                }
            });

            if (!batch) {
                throw new Error('No failed upload batch found');
            }

            // Reset batch status
            await this.prisma.uploadBatch.update({
                where: { id: batchId },
                data: { status: 'PROCESSING' }
            });

            // Retry failed files
            const retryResults = [];
            for (const file of batch.files) {
                try {
                    // Reset file status
                    await this.prisma.uploadedFile.update({
                        where: { id: file.id },
                        data: {
                            status: 'PROCESSING',
                            error: null
                        }
                    });

                    // Retry processing (would need original file data)
                    // This is a simplified version - in practice, you'd need to store
                    // the original file data or have a way to re-access it

                    retryResults.push({
                        fileName: file.fileName,
                        success: true,
                        message: 'Retry initiated'
                    });

                } catch (error) {
                    retryResults.push({
                        fileName: file.fileName,
                        success: false,
                        error: error.message
                    });
                }
            }

            return {
                batchId,
                retriedFiles: retryResults.length,
                results: retryResults
            };

        } catch (error) {
            console.error('Error retrying failed upload:', error);
            throw new Error(`Failed to retry upload: ${error.message}`);
        }
    }

    // Private helper methods

    /**
     * Determine timeframe from filename or options
     */
    _determineTimeframe(filename, options) {
        if (options.timeframe) {
            return options.timeframe;
        }

        const lowerFilename = filename.toLowerCase();

        if (lowerFilename.includes('daily') || lowerFilename.includes('1_')) {
            return 'DAILY';
        } else if (lowerFilename.includes('monday') || lowerFilename.includes('2_')) {
            return 'MONDAY_WEEKLY';
        } else if (lowerFilename.includes('expiry') || lowerFilename.includes('3_')) {
            return 'EXPIRY_WEEKLY';
        } else if (lowerFilename.includes('monthly') || lowerFilename.includes('4_')) {
            return 'MONTHLY';
        } else if (lowerFilename.includes('yearly') || lowerFilename.includes('5_')) {
            return 'YEARLY';
        }

        return 'DAILY'; // Default
    }

    /**
     * Group records by ticker symbol
     */
    _groupRecordsByTicker(records) {
        const grouped = {};
        records.forEach(record => {
            const ticker = record.ticker.toUpperCase();
            if (!grouped[ticker]) {
                grouped[ticker] = [];
            }
            grouped[ticker].push(record);
        });
        return grouped;
    }

    /**
     * Process tickers with multi-timeframe generation
     */
    async _processTickersWithTimeframes(recordsByTicker, primaryTimeframe, uploadedFileId) {
        const results = {
            totalTickers: Object.keys(recordsByTicker).length,
            processedTickers: 0,
            totalRecords: 0,
            errors: []
        };

        for (const [tickerSymbol, records] of Object.entries(recordsByTicker)) {
            try {
                console.log(`📊 Processing ticker: ${tickerSymbol} (${records.length} records)`);

                // 1. Get or create ticker
                const ticker = await this.prisma.ticker.upsert({
                    where: { symbol: tickerSymbol },
                    update: { updatedAt: new Date() },
                    create: {
                        symbol: tickerSymbol,
                        name: records[0].name || tickerSymbol, // If available in CSV
                        sector: records[0].sector || null,
                        exchange: records[0].exchange || null
                    }
                });

                // 2. Calculate return percentages
                const recordsWithReturns = this.calculationEngine.calculateReturnPercentages(records);

                // 3. Store data in appropriate timeframe table
                await this._storeTimeframeData(ticker.id, recordsWithReturns, primaryTimeframe);

                // 4. Generate other timeframes if primary is daily
                if (primaryTimeframe === 'DAILY') {
                    await this._generateOtherTimeframes(ticker.id, recordsWithReturns);
                }

                results.processedTickers++;
                results.totalRecords += records.length;

                console.log(`✅ Ticker ${tickerSymbol} processed successfully`);

            } catch (error) {
                console.error(`❌ Error processing ticker ${tickerSymbol}:`, error);
                results.errors.push({
                    ticker: tickerSymbol,
                    recordCount: records.length,
                    error: error.message
                });
            }
        }

        return results;
    }

    /**
     * Store data in appropriate timeframe table
     */
    async _storeTimeframeData(tickerId, records, timeframe) {
        const dataToInsert = records.map(record => ({
            tickerId,
            date: record.date,
            open: record.open,
            high: record.high,
            low: record.low,
            close: record.close,
            volume: record.volume || 0,
            openInterest: record.openInterest || 0,
            returnPercentage: record.returnPercentage,
            logReturn: record.logReturn
        }));

        switch (timeframe) {
            case 'DAILY':
                await this.prisma.dailyData.createMany({
                    data: dataToInsert,
                    skipDuplicates: true
                });
                break;
            case 'MONDAY_WEEKLY':
            case 'EXPIRY_WEEKLY':
                await this.prisma.weeklyData.createMany({
                    data: dataToInsert.map(record => ({
                        ...record,
                        weekType: timeframe
                    })),
                    skipDuplicates: true
                });
                break;
            case 'MONTHLY':
                await this.prisma.monthlyData.createMany({
                    data: dataToInsert,
                    skipDuplicates: true
                });
                break;
            case 'YEARLY':
                await this.prisma.yearlyData.createMany({
                    data: dataToInsert,
                    skipDuplicates: true
                });
                break;
        }
    }

    /**
     * Generate other timeframes from daily data
     */
    async _generateOtherTimeframes(tickerId, dailyRecords) {
        try {
            // Generate weekly, monthly, and yearly data
            const timeframeData = await this.timeframeService.processTickerTimeframes(tickerId, dailyRecords);

            // Store generated timeframe data
            if (timeframeData.weekly.monday.length > 0) {
                await this.prisma.weeklyData.createMany({
                    data: timeframeData.weekly.monday.map(record => ({
                        tickerId,
                        date: record.date,
                        weekType: 'MONDAY_WEEKLY',
                        open: record.open,
                        high: record.high,
                        low: record.low,
                        close: record.close,
                        volume: record.volume,
                        openInterest: record.openInterest,
                        returnPercentage: record.returnPercentage
                    })),
                    skipDuplicates: true
                });
            }

            if (timeframeData.weekly.expiry.length > 0) {
                await this.prisma.weeklyData.createMany({
                    data: timeframeData.weekly.expiry.map(record => ({
                        tickerId,
                        date: record.date,
                        weekType: 'EXPIRY_WEEKLY',
                        open: record.open,
                        high: record.high,
                        low: record.low,
                        close: record.close,
                        volume: record.volume,
                        openInterest: record.openInterest,
                        returnPercentage: record.returnPercentage
                    })),
                    skipDuplicates: true
                });
            }

            if (timeframeData.monthly.length > 0) {
                await this.prisma.monthlyData.createMany({
                    data: timeframeData.monthly.map(record => ({
                        tickerId,
                        date: record.date,
                        open: record.open,
                        high: record.high,
                        low: record.low,
                        close: record.close,
                        volume: record.volume,
                        openInterest: record.openInterest,
                        returnPercentage: record.returnPercentage
                    })),
                    skipDuplicates: true
                });
            }

            if (timeframeData.yearly.length > 0) {
                await this.prisma.yearlyData.createMany({
                    data: timeframeData.yearly.map(record => ({
                        tickerId,
                        date: record.date,
                        open: record.open,
                        high: record.high,
                        low: record.low,
                        close: record.close,
                        volume: record.volume,
                        openInterest: record.openInterest,
                        returnPercentage: record.returnPercentage
                    })),
                    skipDuplicates: true
                });
            }

            console.log(`📈 Generated timeframes for ticker ${tickerId}`);

        } catch (error) {
            console.error(`Error generating timeframes for ticker ${tickerId}:`, error);
            // Don't throw - timeframe generation is optional
        }
    }

    /**
     * Process single file in batch
     */
    async _processSingleFileInBatch(file, batchId, options) {
        try {
            const uploadedFile = await this.prisma.uploadedFile.create({
                data: {
                    batchId: batchId,
                    objectKey: file.filename || file.originalname,
                    fileName: file.originalname,
                    fileSize: BigInt(file.size),
                    status: 'PROCESSING'
                }
            });

            const { records } = csvService.processCSV(file.buffer);
            const timeframe = this._determineTimeframe(file.originalname, options);
            const recordsByTicker = this._groupRecordsByTicker(records);

            const result = await this._processTickersWithTimeframes(
                recordsByTicker,
                timeframe,
                uploadedFile.id
            );

            await this.prisma.uploadedFile.update({
                where: { id: uploadedFile.id },
                data: {
                    status: 'COMPLETED',
                    recordsProcessed: result.totalRecords,
                    processedAt: new Date()
                }
            });

            return {
                fileName: file.originalname,
                success: true,
                recordsProcessed: result.totalRecords,
                tickersProcessed: result.processedTickers
            };

        } catch (error) {
            return {
                fileName: file.originalname,
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Update processing status
     */
    async _updateProcessingStatus(batchId, fileId, results) {
        await Promise.all([
            this.prisma.uploadBatch.update({
                where: { id: batchId },
                data: {
                    status: results.errors.length === 0 ? 'COMPLETED' : 'PARTIAL',
                    processedFiles: 1,
                    failedFiles: results.errors.length > 0 ? 1 : 0,
                    totalRecords: results.totalRecords,
                    processedRecords: results.totalRecords,
                    completedAt: new Date()
                }
            }),
            this.prisma.uploadedFile.update({
                where: { id: fileId },
                data: {
                    status: results.errors.length === 0 ? 'COMPLETED' : 'FAILED',
                    recordsProcessed: results.totalRecords,
                    error: results.errors.length > 0 ?
                        results.errors.map(e => e.error).join('; ') : null,
                    processedAt: new Date()
                }
            })
        ]);
    }

    /**
     * Update failed status
     */
    async _updateFailedStatus(batchId, errorMessage) {
        try {
            await this.prisma.uploadBatch.update({
                where: { id: batchId },
                data: {
                    status: 'FAILED',
                    errorSummary: { error: errorMessage },
                    completedAt: new Date()
                }
            });
        } catch (error) {
            console.error('Error updating failed status:', error);
        }
    }

    /**
     * Generate processing report
     */
    async _generateProcessingReport(batch, results, warnings, executionTime) {
        return {
            batchId: batch.id,
            status: results.errors.length === 0 ? 'SUCCESS' : 'PARTIAL',
            summary: {
                totalTickers: results.totalTickers,
                processedTickers: results.processedTickers,
                totalRecords: results.totalRecords,
                executionTime,
                errorCount: results.errors.length,
                warningCount: warnings?.length || 0
            },
            details: {
                errors: results.errors.slice(0, 10), // Limit errors
                warnings: warnings?.slice(0, 10) || []
            },
            performance: {
                recordsPerSecond: Math.round(results.totalRecords / (executionTime / 1000)),
                avgTimePerTicker: Math.round(executionTime / results.totalTickers)
            }
        };
    }

    /**
     * Clear related caches
     */
    async _clearRelatedCaches(tickerSymbols) {
        try {
            const cacheKeys = tickerSymbols.flatMap(symbol => [
                `ticker_data_${symbol}_*`,
                `analysis_*_${symbol}_*`,
                `aggregated_data_*`
            ]);

            await Promise.all(
                cacheKeys.map(pattern => this.cacheService.clear(pattern))
            );

        } catch (error) {
            console.warn('Error clearing caches:', error);
        }
    }

    /**
     * Update processing metrics
     */
    _updateProcessingMetrics(executionTime, success) {
        this.processingMetrics.totalUploads++;

        if (success) {
            this.processingMetrics.successfulUploads++;
        } else {
            this.processingMetrics.failedUploads++;
        }

        // Update average processing time
        this.processingMetrics.averageProcessingTime =
            (this.processingMetrics.averageProcessingTime * (this.processingMetrics.totalUploads - 1) + executionTime) /
            this.processingMetrics.totalUploads;
    }

    /**
     * Get processing metrics
     */
    getProcessingMetrics() {
        return {
            ...this.processingMetrics,
            successRate: this.processingMetrics.totalUploads > 0 ?
                (this.processingMetrics.successfulUploads / this.processingMetrics.totalUploads * 100).toFixed(2) + '%' : '0%'
        };
    }

    /**
     * Cleanup resources
     */
    async cleanup() {
        try {
            await Promise.all([
                this.prisma.$disconnect(),
                this.timeframeService.cleanup(),
                this.calculationEngine.cleanup(),
                this.cacheService.cleanup()
            ]);

            console.log('✅ EnhancedUploadService cleanup completed');

        } catch (error) {
            console.error('❌ Error during EnhancedUploadService cleanup:', error);
        }
    }
}

module.exports = EnhancedUploadService;