/**
 * Performance Optimization Utilities for Migration
 * 
 * Provides batch processing, memory management, and performance monitoring
 * for large-scale data migration operations
 * 
 * @author Seasonality SaaS Team
 * @version 1.0.0
 */

const { performance } = require('perf_hooks');

/**
 * Batch Processing Manager
 */
class BatchProcessor {
    constructor(batchSize = 1000, maxConcurrency = 5) {
        this.batchSize = batchSize;
        this.maxConcurrency = maxConcurrency;
        this.stats = {
            totalBatches: 0,
            processedBatches: 0,
            failedBatches: 0,
            totalItems: 0,
            processedItems: 0,
            startTime: null,
            endTime: null
        };
    }

    /**
     * Process items in batches with concurrency control
     */
    async processBatches(items, processorFunction, progressCallback = null) {
        this.stats.startTime = performance.now();
        this.stats.totalItems = items.length;
        this.stats.totalBatches = Math.ceil(items.length / this.batchSize);

        const batches = this.createBatches(items, this.batchSize);
        const results = [];

        // Process batches with concurrency control
        for (let i = 0; i < batches.length; i += this.maxConcurrency) {
            const concurrentBatches = batches.slice(i, i + this.maxConcurrency);

            const batchPromises = concurrentBatches.map(async (batch, batchIndex) => {
                const globalBatchIndex = i + batchIndex;

                try {
                    const result = await processorFunction(batch, globalBatchIndex);
                    this.stats.processedBatches++;
                    this.stats.processedItems += batch.length;

                    if (progressCallback) {
                        progressCallback({
                            batchIndex: globalBatchIndex,
                            totalBatches: this.stats.totalBatches,
                            processedItems: this.stats.processedItems,
                            totalItems: this.stats.totalItems,
                            progress: (this.stats.processedItems / this.stats.totalItems) * 100
                        });
                    }

                    return result;
                } catch (error) {
                    this.stats.failedBatches++;
                    console.error(`Batch ${globalBatchIndex} failed:`, error.message);
                    return { error: error.message, batchIndex: globalBatchIndex };
                }
            });

            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults);
        }

        this.stats.endTime = performance.now();
        return {
            results,
            stats: this.getStats()
        };
    }

    /**
     * Create batches from array
     */
    createBatches(array, batchSize) {
        const batches = [];
        for (let i = 0; i < array.length; i += batchSize) {
            batches.push(array.slice(i, i + batchSize));
        }
        return batches;
    }

    /**
     * Get processing statistics
     */
    getStats() {
        const duration = this.stats.endTime ?
            (this.stats.endTime - this.stats.startTime) / 1000 : 0;

        return {
            ...this.stats,
            duration,
            itemsPerSecond: duration > 0 ? Math.round(this.stats.processedItems / duration) : 0,
            successRate: this.stats.totalBatches > 0 ?
                (this.stats.processedBatches / this.stats.totalBatches) * 100 : 0
        };
    }
}

/**
 * Memory Management Utilities
 */
class MemoryManager {
    constructor(maxMemoryMB = 1024) {
        this.maxMemoryMB = maxMemoryMB;
        this.maxMemoryBytes = maxMemoryMB * 1024 * 1024;
        this.checkInterval = null;
        this.memoryWarnings = 0;
    }

    /**
     * Start memory monitoring
     */
    startMonitoring(intervalMs = 5000) {
        this.checkInterval = setInterval(() => {
            const usage = this.getMemoryUsage();

            if (usage.heapUsed > this.maxMemoryBytes * 0.8) {
                this.memoryWarnings++;
                console.warn(`⚠️  High memory usage: ${usage.heapUsedMB}MB (${usage.heapUsedPercent}%)`);

                if (usage.heapUsed > this.maxMemoryBytes) {
                    console.error(`❌ Memory limit exceeded: ${usage.heapUsedMB}MB`);
                    this.forceGarbageCollection();
                }
            }
        }, intervalMs);
    }

    /**
     * Stop memory monitoring
     */
    stopMonitoring() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
    }

    /**
     * Get current memory usage
     */
    getMemoryUsage() {
        const usage = process.memoryUsage();

        return {
            heapUsed: usage.heapUsed,
            heapTotal: usage.heapTotal,
            external: usage.external,
            heapUsedMB: Math.round(usage.heapUsed / 1024 / 1024 * 100) / 100,
            heapTotalMB: Math.round(usage.heapTotal / 1024 / 1024 * 100) / 100,
            externalMB: Math.round(usage.external / 1024 / 1024 * 100) / 100,
            heapUsedPercent: Math.round((usage.heapUsed / this.maxMemoryBytes) * 100)
        };
    }

    /**
     * Force garbage collection if available
     */
    forceGarbageCollection() {
        if (global.gc) {
            global.gc();
            console.log('🗑️  Forced garbage collection');
        } else {
            console.warn('⚠️  Garbage collection not available (run with --expose-gc)');
        }
    }

    /**
     * Check if memory usage is within limits
     */
    isMemoryWithinLimits() {
        const usage = this.getMemoryUsage();
        return usage.heapUsed < this.maxMemoryBytes;
    }
}

/**
 * Progress Tracking
 */
class ProgressTracker {
    constructor(totalItems, updateIntervalMs = 1000) {
        this.totalItems = totalItems;
        this.processedItems = 0;
        this.startTime = performance.now();
        this.lastUpdateTime = this.startTime;
        this.updateIntervalMs = updateIntervalMs;
        this.errors = 0;
        this.warnings = 0;
    }

    /**
     * Update progress
     */
    update(processedCount = 1, errors = 0, warnings = 0) {
        this.processedItems += processedCount;
        this.errors += errors;
        this.warnings += warnings;

        const now = performance.now();
        if (now - this.lastUpdateTime >= this.updateIntervalMs) {
            this.displayProgress();
            this.lastUpdateTime = now;
        }
    }

    /**
     * Display current progress
     */
    displayProgress() {
        const progress = (this.processedItems / this.totalItems) * 100;
        const elapsed = (performance.now() - this.startTime) / 1000;
        const rate = this.processedItems / elapsed;
        const eta = (this.totalItems - this.processedItems) / rate;

        const progressBar = this.createProgressBar(progress);

        console.log(
            `${progressBar} ${progress.toFixed(1)}% ` +
            `(${this.processedItems.toLocaleString()}/${this.totalItems.toLocaleString()}) ` +
            `${Math.round(rate)}/s ETA: ${this.formatTime(eta)}`
        );

        if (this.errors > 0 || this.warnings > 0) {
            console.log(`  Errors: ${this.errors}, Warnings: ${this.warnings}`);
        }
    }

    /**
     * Create visual progress bar
     */
    createProgressBar(progress, width = 30) {
        const filled = Math.round((progress / 100) * width);
        const empty = width - filled;
        return `[${'█'.repeat(filled)}${' '.repeat(empty)}]`;
    }

    /**
     * Format time in human readable format
     */
    formatTime(seconds) {
        if (seconds < 60) {
            return `${Math.round(seconds)}s`;
        } else if (seconds < 3600) {
            return `${Math.round(seconds / 60)}m ${Math.round(seconds % 60)}s`;
        } else {
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.round((seconds % 3600) / 60);
            return `${hours}h ${minutes}m`;
        }
    }

    /**
     * Complete progress tracking
     */
    complete() {
        const totalTime = (performance.now() - this.startTime) / 1000;
        const avgRate = this.processedItems / totalTime;

        console.log('\n✅ Processing completed!');
        console.log(`Total time: ${this.formatTime(totalTime)}`);
        console.log(`Average rate: ${Math.round(avgRate)} items/second`);
        console.log(`Total errors: ${this.errors}`);
        console.log(`Total warnings: ${this.warnings}`);

        return {
            totalTime,
            avgRate,
            errors: this.errors,
            warnings: this.warnings,
            processedItems: this.processedItems
        };
    }
}

/**
 * Performance Monitor
 */
class PerformanceMonitor {
    constructor() {
        this.metrics = new Map();
        this.startTimes = new Map();
    }

    /**
     * Start timing an operation
     */
    startTimer(operationName) {
        this.startTimes.set(operationName, performance.now());
    }

    /**
     * End timing an operation
     */
    endTimer(operationName) {
        const startTime = this.startTimes.get(operationName);
        if (!startTime) {
            console.warn(`No start time found for operation: ${operationName}`);
            return 0;
        }

        const duration = performance.now() - startTime;
        this.startTimes.delete(operationName);

        if (!this.metrics.has(operationName)) {
            this.metrics.set(operationName, {
                count: 0,
                totalTime: 0,
                minTime: Infinity,
                maxTime: 0,
                avgTime: 0
            });
        }

        const metric = this.metrics.get(operationName);
        metric.count++;
        metric.totalTime += duration;
        metric.minTime = Math.min(metric.minTime, duration);
        metric.maxTime = Math.max(metric.maxTime, duration);
        metric.avgTime = metric.totalTime / metric.count;

        return duration;
    }

    /**
     * Get performance metrics
     */
    getMetrics() {
        const metrics = {};

        this.metrics.forEach((metric, operationName) => {
            metrics[operationName] = {
                count: metric.count,
                totalTime: Math.round(metric.totalTime),
                avgTime: Math.round(metric.avgTime),
                minTime: Math.round(metric.minTime),
                maxTime: Math.round(metric.maxTime)
            };
        });

        return metrics;
    }

    /**
     * Display performance report
     */
    displayReport() {
        console.log('\n📊 Performance Report');
        console.log('='.repeat(60));

        const metrics = this.getMetrics();

        Object.entries(metrics).forEach(([operation, metric]) => {
            console.log(`${operation}:`);
            console.log(`  Count: ${metric.count}`);
            console.log(`  Total: ${metric.totalTime}ms`);
            console.log(`  Average: ${metric.avgTime}ms`);
            console.log(`  Min: ${metric.minTime}ms`);
            console.log(`  Max: ${metric.maxTime}ms`);
            console.log('');
        });
    }

    /**
     * Reset all metrics
     */
    reset() {
        this.metrics.clear();
        this.startTimes.clear();
    }
}

module.exports = {
    BatchProcessor,
    MemoryManager,
    ProgressTracker,
    PerformanceMonitor
};