/**
 * Data Query Service - Optimized Database Queries
 * 
 * Handles optimized queries for large datasets with caching and performance monitoring
 * Implements query optimization strategies and real-time data updates
 * 
 * @author Seasonality SaaS Team
 * @version 1.0.0
 */

const { PrismaClient } = require('@prisma/client');
const CacheService = require('./cacheService');

/**
 * DataQueryService Class
 * Optimized database query operations with caching
 */
class DataQueryService {
    constructor() {
        this.prisma = new PrismaClient();
        this.cacheService = new CacheService();

        // Query performance tracking
        this.queryMetrics = {
            totalQueries: 0,
            cacheHits: 0,
            avgExecutionTime: 0,
            slowQueries: [],
            errorCount: 0
        };

        // Query optimization settings
        this.optimizationSettings = {
            defaultLimit: 10000,
            slowQueryThreshold: 1000, // ms
            cacheDefaultTTL: 300, // 5 minutes
            batchSize: 1000
        };
    }

    /**
     * Get ticker data with optimized queries
     * 
     * @param {string} symbol - Ticker symbol
     * @param {Object} options - Query options
     * @returns {Object} Ticker data with metadata
     */
    async getTickerData(symbol, options = {}) {
        const startTime = Date.now();
        const cacheKey = `ticker_data_${symbol}_${this._hashOptions(options)}`;

        try {
            // Check cache first
            const cachedData = await this.cacheService.get(cacheKey);
            if (cachedData) {
                this.queryMetrics.cacheHits++;
                return {
                    ...cachedData,
                    metadata: {
                        ...cachedData.metadata,
                        fromCache: true,
                        executionTime: Date.now() - startTime
                    }
                };
            }

            // Build optimized query
            const query = this._buildTickerQuery(symbol, options);

            // Execute query with performance monitoring
            const [ticker, data, totalCount] = await Promise.all([
                this.prisma.ticker.findUnique({
                    where: { symbol: symbol.toUpperCase() },
                    include: {
                        _count: {
                            select: {
                                dailyData: true,
                                weeklyData: true,
                                monthlyData: true,
                                yearlyData: true
                            }
                        }
                    }
                }),
                this._executeOptimizedQuery(query),
                this._getDataCount(symbol, options)
            ]);

            if (!ticker) {
                throw new Error(`Ticker ${symbol} not found`);
            }

            const result = {
                ticker,
                data,
                metadata: {
                    totalRecords: totalCount,
                    returnedRecords: data.length,
                    timeframe: options.timeframe || 'DAILY',
                    dateRange: this._getDateRange(data),
                    executionTime: Date.now() - startTime,
                    fromCache: false
                }
            };

            // Cache the result
            await this.cacheService.set(cacheKey, result, this.optimizationSettings.cacheDefaultTTL);

            this._updateQueryMetrics(Date.now() - startTime, true);

            return result;

        } catch (error) {
            this._updateQueryMetrics(Date.now() - startTime, false);
            console.error(`Error fetching ticker data for ${symbol}:`, error);
            throw new Error(`Failed to fetch ticker data: ${error.message}`);
        }
    }

    /**
     * Get multiple tickers data efficiently
     * 
     * @param {Array<string>} symbols - Array of ticker symbols
     * @param {Object} options - Query options
     * @returns {Object} Multiple tickers data
     */
    async getMultipleTickersData(symbols, options = {}) {
        const startTime = Date.now();

        try {
            // Process in batches for better performance
            const batches = this._createBatches(symbols, this.optimizationSettings.batchSize);
            const results = new Map();

            for (const batch of batches) {
                const batchPromises = batch.map(symbol =>
                    this.getTickerData(symbol, options)
                        .catch(error => ({
                            symbol,
                            error: error.message,
                            data: null
                        }))
                );

                const batchResults = await Promise.all(batchPromises);

                batchResults.forEach(result => {
                    if (result.error) {
                        results.set(result.symbol, { error: result.error });
                    } else {
                        results.set(result.symbol, result);
                    }
                });
            }

            const successCount = Array.from(results.values()).filter(r => !r.error).length;
            const errorCount = results.size - successCount;

            return {
                results: Object.fromEntries(results),
                metadata: {
                    totalSymbols: symbols.length,
                    successCount,
                    errorCount,
                    executionTime: Date.now() - startTime
                }
            };

        } catch (error) {
            console.error('Error fetching multiple tickers data:', error);
            throw new Error(`Failed to fetch multiple tickers data: ${error.message}`);
        }
    }

    /**
     * Get aggregated market data
     * 
     * @param {Object} options - Aggregation options
     * @returns {Object} Aggregated data
     */
    async getAggregatedData(options = {}) {
        const startTime = Date.now();
        const cacheKey = `aggregated_data_${this._hashOptions(options)}`;

        try {
            // Check cache
            const cachedData = await this.cacheService.get(cacheKey);
            if (cachedData) {
                this.queryMetrics.cacheHits++;
                return cachedData;
            }

            const timeframe = options.timeframe || 'DAILY';
            const tableName = this._getTableName(timeframe);

            // Build aggregation query
            const aggregationQuery = `
                SELECT 
                    DATE_TRUNC('${options.groupBy || 'month'}', date) as period,
                    COUNT(*) as record_count,
                    AVG("returnPercentage") as avg_return,
                    STDDEV("returnPercentage") as volatility,
                    MIN("returnPercentage") as min_return,
                    MAX("returnPercentage") as max_return,
                    COUNT(CASE WHEN "returnPercentage" > 0 THEN 1 END) as positive_days,
                    COUNT(CASE WHEN "returnPercentage" < 0 THEN 1 END) as negative_days
                FROM "${tableName}" 
                WHERE date >= $1 AND date <= $2
                ${options.tickerIds ? 'AND "tickerId" = ANY($3)' : ''}
                GROUP BY period
                ORDER BY period
            `;

            const params = [
                options.startDate || new Date('2000-01-01'),
                options.endDate || new Date(),
                ...(options.tickerIds ? [options.tickerIds] : [])
            ];

            const aggregatedData = await this.prisma.$queryRaw(aggregationQuery, ...params);

            const result = {
                data: aggregatedData,
                metadata: {
                    timeframe,
                    groupBy: options.groupBy || 'month',
                    recordCount: aggregatedData.length,
                    executionTime: Date.now() - startTime
                }
            };

            // Cache result
            await this.cacheService.set(cacheKey, result, this.optimizationSettings.cacheDefaultTTL);

            this._updateQueryMetrics(Date.now() - startTime, true);

            return result;

        } catch (error) {
            this._updateQueryMetrics(Date.now() - startTime, false);
            console.error('Error fetching aggregated data:', error);
            throw new Error(`Failed to fetch aggregated data: ${error.message}`);
        }
    }

    /**
     * Get real-time data updates
     * 
     * @param {string} symbol - Ticker symbol
     * @param {Date} lastUpdate - Last update timestamp
     * @returns {Object} Updated data
     */
    async getDataUpdates(symbol, lastUpdate) {
        const startTime = Date.now();

        try {
            const ticker = await this.prisma.ticker.findUnique({
                where: { symbol: symbol.toUpperCase() }
            });

            if (!ticker) {
                throw new Error(`Ticker ${symbol} not found`);
            }

            // Get updates across all timeframes
            const [dailyUpdates, weeklyUpdates, monthlyUpdates, yearlyUpdates] = await Promise.all([
                this.prisma.dailyData.findMany({
                    where: {
                        tickerId: ticker.id,
                        updatedAt: { gt: lastUpdate }
                    },
                    orderBy: { date: 'desc' },
                    take: 100
                }),
                this.prisma.weeklyData.findMany({
                    where: {
                        tickerId: ticker.id,
                        updatedAt: { gt: lastUpdate }
                    },
                    orderBy: { date: 'desc' },
                    take: 50
                }),
                this.prisma.monthlyData.findMany({
                    where: {
                        tickerId: ticker.id,
                        updatedAt: { gt: lastUpdate }
                    },
                    orderBy: { date: 'desc' },
                    take: 24
                }),
                this.prisma.yearlyData.findMany({
                    where: {
                        tickerId: ticker.id,
                        updatedAt: { gt: lastUpdate }
                    },
                    orderBy: { date: 'desc' },
                    take: 10
                })
            ]);

            const totalUpdates = dailyUpdates.length + weeklyUpdates.length +
                monthlyUpdates.length + yearlyUpdates.length;

            return {
                symbol,
                updates: {
                    daily: dailyUpdates,
                    weekly: weeklyUpdates,
                    monthly: monthlyUpdates,
                    yearly: yearlyUpdates
                },
                metadata: {
                    totalUpdates,
                    lastUpdate: new Date(),
                    executionTime: Date.now() - startTime
                }
            };

        } catch (error) {
            console.error(`Error fetching data updates for ${symbol}:`, error);
            throw new Error(`Failed to fetch data updates: ${error.message}`);
        }
    }

    /**
     * Execute complex analytical queries
     * 
     * @param {Object} queryConfig - Query configuration
     * @returns {Object} Query results
     */
    async executeAnalyticalQuery(queryConfig) {
        const startTime = Date.now();

        try {
            const { type, parameters } = queryConfig;

            let result;

            switch (type) {
                case 'CORRELATION_ANALYSIS':
                    result = await this._executeCorrelationQuery(parameters);
                    break;
                case 'VOLATILITY_ANALYSIS':
                    result = await this._executeVolatilityQuery(parameters);
                    break;
                case 'SEASONAL_ANALYSIS':
                    result = await this._executeSeasonalQuery(parameters);
                    break;
                case 'PERFORMANCE_COMPARISON':
                    result = await this._executePerformanceQuery(parameters);
                    break;
                default:
                    throw new Error(`Unknown query type: ${type}`);
            }

            this._updateQueryMetrics(Date.now() - startTime, true);

            return {
                ...result,
                metadata: {
                    ...result.metadata,
                    queryType: type,
                    executionTime: Date.now() - startTime
                }
            };

        } catch (error) {
            this._updateQueryMetrics(Date.now() - startTime, false);
            console.error('Error executing analytical query:', error);
            throw new Error(`Analytical query failed: ${error.message}`);
        }
    }

    /**
     * Get query performance statistics
     * 
     * @returns {Object} Performance metrics
     */
    getPerformanceMetrics() {
        return {
            ...this.queryMetrics,
            cacheHitRate: this.queryMetrics.totalQueries > 0 ?
                (this.queryMetrics.cacheHits / this.queryMetrics.totalQueries * 100).toFixed(2) + '%' : '0%',
            errorRate: this.queryMetrics.totalQueries > 0 ?
                (this.queryMetrics.errorCount / this.queryMetrics.totalQueries * 100).toFixed(2) + '%' : '0%'
        };
    }

    /**
     * Clear query cache
     */
    async clearCache() {
        await this.cacheService.clear();
        console.log('Query cache cleared');
    }

    // Private helper methods

    /**
     * Build optimized ticker query
     */
    _buildTickerQuery(symbol, options) {
        const timeframe = options.timeframe || 'DAILY';
        const tableName = this._getTableName(timeframe);

        const baseQuery = {
            where: {
                ticker: {
                    symbol: symbol.toUpperCase()
                }
            },
            orderBy: { date: options.sortOrder || 'asc' },
            take: options.limit || this.optimizationSettings.defaultLimit
        };

        // Add date filters
        if (options.startDate || options.endDate) {
            baseQuery.where.date = {};
            if (options.startDate) baseQuery.where.date.gte = new Date(options.startDate);
            if (options.endDate) baseQuery.where.date.lte = new Date(options.endDate);
        }

        // Add skip for pagination
        if (options.offset) {
            baseQuery.skip = options.offset;
        }

        // Add specific field selection for performance
        if (options.fields) {
            baseQuery.select = this._buildSelectFields(options.fields);
        }

        return { tableName, query: baseQuery };
    }

    /**
     * Execute optimized query with proper table selection
     */
    async _executeOptimizedQuery({ tableName, query }) {
        switch (tableName) {
            case 'DailyData':
                return await this.prisma.dailyData.findMany(query);
            case 'WeeklyData':
                return await this.prisma.weeklyData.findMany(query);
            case 'MonthlyData':
                return await this.prisma.monthlyData.findMany(query);
            case 'YearlyData':
                return await this.prisma.yearlyData.findMany(query);
            default:
                return await this.prisma.dailyData.findMany(query);
        }
    }

    /**
     * Get data count for pagination
     */
    async _getDataCount(symbol, options) {
        const timeframe = options.timeframe || 'DAILY';
        const countQuery = {
            where: {
                ticker: {
                    symbol: symbol.toUpperCase()
                }
            }
        };

        // Add date filters
        if (options.startDate || options.endDate) {
            countQuery.where.date = {};
            if (options.startDate) countQuery.where.date.gte = new Date(options.startDate);
            if (options.endDate) countQuery.where.date.lte = new Date(options.endDate);
        }

        switch (timeframe) {
            case 'WEEKLY':
                return await this.prisma.weeklyData.count(countQuery);
            case 'MONTHLY':
                return await this.prisma.monthlyData.count(countQuery);
            case 'YEARLY':
                return await this.prisma.yearlyData.count(countQuery);
            default:
                return await this.prisma.dailyData.count(countQuery);
        }
    }

    /**
     * Execute correlation analysis query
     */
    async _executeCorrelationQuery(parameters) {
        // Implementation for correlation analysis
        return {
            correlations: [],
            metadata: { analysisType: 'CORRELATION' }
        };
    }

    /**
     * Execute volatility analysis query
     */
    async _executeVolatilityQuery(parameters) {
        // Implementation for volatility analysis
        return {
            volatilityMetrics: {},
            metadata: { analysisType: 'VOLATILITY' }
        };
    }

    /**
     * Execute seasonal analysis query
     */
    async _executeSeasonalQuery(parameters) {
        // Implementation for seasonal analysis
        return {
            seasonalPatterns: {},
            metadata: { analysisType: 'SEASONAL' }
        };
    }

    /**
     * Execute performance comparison query
     */
    async _executePerformanceQuery(parameters) {
        // Implementation for performance comparison
        return {
            performanceMetrics: {},
            metadata: { analysisType: 'PERFORMANCE' }
        };
    }

    /**
     * Utility methods
     */
    _getTableName(timeframe) {
        const mapping = {
            'DAILY': 'DailyData',
            'MONDAY_WEEKLY': 'WeeklyData',
            'EXPIRY_WEEKLY': 'WeeklyData',
            'WEEKLY': 'WeeklyData',
            'MONTHLY': 'MonthlyData',
            'YEARLY': 'YearlyData'
        };
        return mapping[timeframe] || 'DailyData';
    }

    _buildSelectFields(fields) {
        const selectObj = {};
        fields.forEach(field => {
            selectObj[field] = true;
        });
        return selectObj;
    }

    _getDateRange(data) {
        if (!data || data.length === 0) return null;

        const dates = data.map(record => new Date(record.date)).sort((a, b) => a - b);
        return {
            from: dates[0],
            to: dates[dates.length - 1]
        };
    }

    _createBatches(array, batchSize) {
        const batches = [];
        for (let i = 0; i < array.length; i += batchSize) {
            batches.push(array.slice(i, i + batchSize));
        }
        return batches;
    }

    _hashOptions(options) {
        return require('crypto').createHash('md5').update(JSON.stringify(options)).digest('hex');
    }

    _updateQueryMetrics(executionTime, success) {
        this.queryMetrics.totalQueries++;

        // Update average execution time
        this.queryMetrics.avgExecutionTime =
            (this.queryMetrics.avgExecutionTime * (this.queryMetrics.totalQueries - 1) + executionTime) /
            this.queryMetrics.totalQueries;

        // Track slow queries
        if (executionTime > this.optimizationSettings.slowQueryThreshold) {
            this.queryMetrics.slowQueries.push({
                executionTime,
                timestamp: new Date()
            });

            // Keep only last 10 slow queries
            if (this.queryMetrics.slowQueries.length > 10) {
                this.queryMetrics.slowQueries.shift();
            }
        }

        if (!success) {
            this.queryMetrics.errorCount++;
        }
    }

    /**
     * Cleanup resources
     */
    async cleanup() {
        try {
            await this.prisma.$disconnect();
            await this.cacheService.cleanup();
            console.log('DataQueryService cleanup completed');
        } catch (error) {
            console.error('Error during DataQueryService cleanup:', error);
        }
    }
}

module.exports = DataQueryService;