/**
 * Analysis Service - Main Service Orchestrator
 * 
 * Integrates all services into a cohesive analysis system
 * Implements service composition pattern with dependency injection
 * 
 * @author Seasonality SaaS Team
 * @version 1.0.0
 */

const { PrismaClient } = require('@prisma/client');
const StatisticsService = require('./statisticsService');
const TimeframeService = require('./timeframeService');
const FilterService = require('./filterService');
const DataQueryService = require('./dataQueryService');
const CalculationEngine = require('./calculationEngine');
const CacheService = require('./cacheService');

/**
 * AnalysisService Class
 * Main orchestrator for all analysis operations
 */
class AnalysisService {
    constructor() {
        this.prisma = new PrismaClient();

        // Service composition - inject dependencies
        this.statisticsService = new StatisticsService();
        this.timeframeService = new TimeframeService();
        this.filterService = new FilterService();
        this.dataQueryService = new DataQueryService();
        this.calculationEngine = new CalculationEngine();
        this.cacheService = new CacheService();

        // Performance tracking
        this.performanceMetrics = {
            analysesPerformed: 0,
            totalExecutionTime: 0,
            cacheHitRate: 0,
            errorCount: 0
        };
    }

    /**
     * Perform Daily Analysis with All Filters
     * Main entry point for daily timeframe analysis
     * 
     * @param {Object} params - Analysis parameters
     * @returns {Object} Complete analysis results
     */
    async performDailyAnalysis(params) {
        const startTime = Date.now();
        const analysisId = this._generateAnalysisId();

        try {
            console.log(`🔍 Starting Daily Analysis [${analysisId}]`);

            // 1. Apply filters to get filtered dataset
            const filteredData = await this.filterService.buildFilterQuery({
                ...params,
                timeframe: 'DAILY'
            });

            if (!filteredData.data || filteredData.data.length === 0) {
                throw new Error('No data found matching the specified filters');
            }

            // 2. Calculate statistics on filtered data
            const statistics = await this.statisticsService.getDataTableStatistics(
                filteredData.data.map(record => record.returnPercentage).filter(val => val !== null)
            );

            // 3. Perform trending analysis
            const trendingDays = await this.statisticsService.getTrendingDays(
                filteredData.data,
                params.consecutiveDays || 3,
                params.trendDirection || 'more',
                params.percentageThreshold || 0,
                params.weekOffset || 1,
                params.monthOffset || 1,
                params.yearOffset || 1
            );

            // 4. Calculate consecutive values analysis
            const consecutiveAnalysis = await this.statisticsService.maximumConsecutiveValues(
                filteredData.data.map(record => record.returnPercentage).filter(val => val !== null)
            );

            // 5. Generate insights
            const insights = await this._generateDailyInsights(
                filteredData.data,
                statistics,
                trendingDays,
                consecutiveAnalysis
            );

            // 6. Cache results
            const cacheKey = `daily_analysis_${this._hashParams(params)}`;
            await this.cacheService.set(cacheKey, {
                statistics,
                trendingDays,
                consecutiveAnalysis,
                insights
            }, 3600); // 1 hour cache

            const executionTime = Date.now() - startTime;
            this._updatePerformanceMetrics(executionTime, true);

            console.log(`✅ Daily Analysis completed [${analysisId}] in ${executionTime}ms`);

            return {
                analysisId,
                timeframe: 'DAILY',
                metadata: {
                    ...filteredData.metadata,
                    executionTime,
                    cacheKey
                },
                results: {
                    statistics,
                    trendingDays,
                    consecutiveAnalysis,
                    insights
                }
            };

        } catch (error) {
            this._updatePerformanceMetrics(Date.now() - startTime, false);
            console.error(`❌ Daily Analysis failed [${analysisId}]:`, error);
            throw new Error(`Daily analysis failed: ${error.message}`);
        }
    }

    /**
     * Perform Weekly Analysis (Monday + Expiry)
     * Analyzes both Monday weekly and Expiry weekly data
     * 
     * @param {Object} params - Analysis parameters
     * @returns {Object} Weekly analysis results
     */
    async performWeeklyAnalysis(params) {
        const startTime = Date.now();
        const analysisId = this._generateAnalysisId();

        try {
            console.log(`🔍 Starting Weekly Analysis [${analysisId}]`);

            // Parallel analysis of both weekly types
            const [mondayResults, expiryResults] = await Promise.all([
                this._performSingleWeeklyAnalysis({ ...params, weekType: 'MONDAY_WEEKLY' }),
                this._performSingleWeeklyAnalysis({ ...params, weekType: 'EXPIRY_WEEKLY' })
            ]);

            // Compare and generate cross-weekly insights
            const crossWeeklyInsights = await this._generateCrossWeeklyInsights(
                mondayResults,
                expiryResults
            );

            const executionTime = Date.now() - startTime;
            this._updatePerformanceMetrics(executionTime, true);

            console.log(`✅ Weekly Analysis completed [${analysisId}] in ${executionTime}ms`);

            return {
                analysisId,
                timeframe: 'WEEKLY',
                metadata: {
                    executionTime,
                    mondayRecords: mondayResults.metadata.filteredRecords,
                    expiryRecords: expiryResults.metadata.filteredRecords
                },
                results: {
                    mondayWeekly: mondayResults.results,
                    expiryWeekly: expiryResults.results,
                    crossWeeklyInsights
                }
            };

        } catch (error) {
            this._updatePerformanceMetrics(Date.now() - startTime, false);
            console.error(`❌ Weekly Analysis failed [${analysisId}]:`, error);
            throw new Error(`Weekly analysis failed: ${error.message}`);
        }
    }

    /**
     * Perform Monthly Analysis
     * Comprehensive monthly timeframe analysis
     * 
     * @param {Object} params - Analysis parameters
     * @returns {Object} Monthly analysis results
     */
    async performMonthlyAnalysis(params) {
        const startTime = Date.now();
        const analysisId = this._generateAnalysisId();

        try {
            console.log(`🔍 Starting Monthly Analysis [${analysisId}]`);

            // 1. Get monthly data with filters
            const filteredData = await this.filterService.buildFilterQuery({
                ...params,
                timeframe: 'MONTHLY'
            });

            // 2. Calculate monthly statistics
            const statistics = await this.statisticsService.getDataTableStatistics(
                filteredData.data.map(record => record.returnPercentage).filter(val => val !== null)
            );

            // 3. Generate performance table
            const performanceTable = await this.statisticsService.generatePerformanceTable(
                filteredData.data,
                params.entryType || 'Open',
                params.exitType || 'Close',
                params.tradeType || 'Long',
                params.entryDay || 'Monday',
                params.exitDay || 'Friday',
                params.returnType || 'Percent'
            );

            // 4. Calculate seasonal patterns
            const seasonalPatterns = await this._calculateSeasonalPatterns(filteredData.data, 'MONTHLY');

            // 5. Generate monthly insights
            const insights = await this._generateMonthlyInsights(
                filteredData.data,
                statistics,
                performanceTable,
                seasonalPatterns
            );

            const executionTime = Date.now() - startTime;
            this._updatePerformanceMetrics(executionTime, true);

            console.log(`✅ Monthly Analysis completed [${analysisId}] in ${executionTime}ms`);

            return {
                analysisId,
                timeframe: 'MONTHLY',
                metadata: {
                    ...filteredData.metadata,
                    executionTime
                },
                results: {
                    statistics,
                    performanceTable,
                    seasonalPatterns,
                    insights
                }
            };

        } catch (error) {
            this._updatePerformanceMetrics(Date.now() - startTime, false);
            console.error(`❌ Monthly Analysis failed [${analysisId}]:`, error);
            throw new Error(`Monthly analysis failed: ${error.message}`);
        }
    }

    /**
     * Perform Yearly Analysis
     * Long-term yearly analysis with decade patterns
     * 
     * @param {Object} params - Analysis parameters
     * @returns {Object} Yearly analysis results
     */
    async performYearlyAnalysis(params) {
        const startTime = Date.now();
        const analysisId = this._generateAnalysisId();

        try {
            console.log(`🔍 Starting Yearly Analysis [${analysisId}]`);

            // 1. Get yearly data with filters
            const filteredData = await this.filterService.buildFilterQuery({
                ...params,
                timeframe: 'YEARLY'
            });

            // 2. Calculate yearly statistics
            const statistics = await this.statisticsService.getDataTableStatistics(
                filteredData.data.map(record => record.returnPercentage).filter(val => val !== null)
            );

            // 3. Calculate decade patterns
            const decadePatterns = await this._calculateDecadePatterns(filteredData.data);

            // 4. Calculate long-term trends
            const longTermTrends = await this._calculateLongTermTrends(filteredData.data);

            // 5. Generate yearly insights
            const insights = await this._generateYearlyInsights(
                filteredData.data,
                statistics,
                decadePatterns,
                longTermTrends
            );

            const executionTime = Date.now() - startTime;
            this._updatePerformanceMetrics(executionTime, true);

            console.log(`✅ Yearly Analysis completed [${analysisId}] in ${executionTime}ms`);

            return {
                analysisId,
                timeframe: 'YEARLY',
                metadata: {
                    ...filteredData.metadata,
                    executionTime
                },
                results: {
                    statistics,
                    decadePatterns,
                    longTermTrends,
                    insights
                }
            };

        } catch (error) {
            this._updatePerformanceMetrics(Date.now() - startTime, false);
            console.error(`❌ Yearly Analysis failed [${analysisId}]:`, error);
            throw new Error(`Yearly analysis failed: ${error.message}`);
        }
    }

    /**
     * Perform Election and Scenario Analysis
     * Special analysis for election periods and market events
     * 
     * @param {Object} params - Analysis parameters
     * @returns {Object} Election analysis results
     */
    async performElectionAnalysis(params) {
        const startTime = Date.now();
        const analysisId = this._generateAnalysisId();

        try {
            console.log(`🔍 Starting Election Analysis [${analysisId}]`);

            // 1. Get election dates from database
            const electionDates = await this.prisma.electionDate.findMany({
                where: {
                    date: {
                        gte: params.startDate ? new Date(params.startDate) : undefined,
                        lte: params.endDate ? new Date(params.endDate) : undefined
                    },
                    type: params.electionType || undefined
                },
                orderBy: { date: 'asc' }
            });

            if (electionDates.length === 0) {
                throw new Error('No election dates found for the specified criteria');
            }

            // 2. Analyze market behavior around each election
            const electionAnalyses = await Promise.all(
                electionDates.map(election => this._analyzeElectionPeriod(election, params))
            );

            // 3. Calculate aggregate election patterns
            const aggregatePatterns = await this._calculateElectionPatterns(electionAnalyses);

            // 4. Generate election insights
            const insights = await this._generateElectionInsights(
                electionDates,
                electionAnalyses,
                aggregatePatterns
            );

            const executionTime = Date.now() - startTime;
            this._updatePerformanceMetrics(executionTime, true);

            console.log(`✅ Election Analysis completed [${analysisId}] in ${executionTime}ms`);

            return {
                analysisId,
                timeframe: 'ELECTION',
                metadata: {
                    executionTime,
                    electionCount: electionDates.length,
                    dateRange: {
                        from: electionDates[0]?.date,
                        to: electionDates[electionDates.length - 1]?.date
                    }
                },
                results: {
                    electionDates,
                    individualAnalyses: electionAnalyses,
                    aggregatePatterns,
                    insights
                }
            };

        } catch (error) {
            this._updatePerformanceMetrics(Date.now() - startTime, false);
            console.error(`❌ Election Analysis failed [${analysisId}]:`, error);
            throw new Error(`Election analysis failed: ${error.message}`);
        }
    }

    /**
     * Perform Complex Consecutive Analysis
     * Advanced consecutive sequence analysis with multiple criteria
     * 
     * @param {Object} params - Analysis parameters
     * @returns {Object} Consecutive analysis results
     */
    async performConsecutiveAnalysis(params) {
        const startTime = Date.now();
        const analysisId = this._generateAnalysisId();

        try {
            console.log(`🔍 Starting Consecutive Analysis [${analysisId}]`);

            // 1. Get filtered data
            const filteredData = await this.filterService.buildFilterQuery(params);

            // 2. Prepare data table for consecutive analysis
            const dataTable = await this._prepareDataTableForConsecutiveAnalysis(filteredData.data);

            // 3. Perform consecutive sequence analysis
            const consecutiveSequences = await this.statisticsService.getNConsecutiveSequanceIndexFromList(
                dataTable,
                params.trendType || 'Bullish',
                params.consecutiveDays || 3,
                params.minimumAccuracy || 60,
                params.minimumTotalPnL || 0,
                params.minimumSampleSize || 10,
                params.minimumAveragePnL || 0,
                params.operation12 || 'AND',
                params.operation23 || 'AND',
                params.operation34 || 'AND'
            );

            // 4. Analyze found sequences
            const sequenceAnalysis = await this._analyzeConsecutiveSequences(
                consecutiveSequences,
                filteredData.data
            );

            // 5. Generate consecutive insights
            const insights = await this._generateConsecutiveInsights(
                consecutiveSequences,
                sequenceAnalysis
            );

            const executionTime = Date.now() - startTime;
            this._updatePerformanceMetrics(executionTime, true);

            console.log(`✅ Consecutive Analysis completed [${analysisId}] in ${executionTime}ms`);

            return {
                analysisId,
                timeframe: 'CONSECUTIVE',
                metadata: {
                    ...filteredData.metadata,
                    executionTime,
                    sequencesFound: consecutiveSequences.length
                },
                results: {
                    consecutiveSequences,
                    sequenceAnalysis,
                    insights
                }
            };

        } catch (error) {
            this._updatePerformanceMetrics(Date.now() - startTime, false);
            console.error(`❌ Consecutive Analysis failed [${analysisId}]:`, error);
            throw new Error(`Consecutive analysis failed: ${error.message}`);
        }
    }

    /**
     * Get Analysis History
     * Retrieve previous analysis results
     * 
     * @param {Object} filters - Query filters
     * @returns {Array} Analysis history
     */
    async getAnalysisHistory(filters = {}) {
        try {
            const calculationRuns = await this.prisma.calculationRun.findMany({
                where: {
                    userId: filters.userId,
                    analysisType: filters.analysisType,
                    status: filters.status || 'COMPLETED',
                    createdAt: {
                        gte: filters.startDate ? new Date(filters.startDate) : undefined,
                        lte: filters.endDate ? new Date(filters.endDate) : undefined
                    }
                },
                include: {
                    user: {
                        select: { name: true, email: true }
                    },
                    results: {
                        take: 5, // Limit results for performance
                        include: {
                            ticker: {
                                select: { symbol: true }
                            }
                        }
                    }
                },
                orderBy: { createdAt: 'desc' },
                take: filters.limit || 50
            });

            return calculationRuns.map(run => ({
                id: run.id,
                name: run.name,
                analysisType: run.analysisType,
                timeframe: run.timeframe,
                status: run.status,
                progress: run.progress,
                executionTime: run.executionTimeMs,
                createdAt: run.createdAt,
                completedAt: run.completedAt,
                user: run.user,
                resultCount: run.results.length,
                sampleResults: run.results.slice(0, 3)
            }));

        } catch (error) {
            console.error('Error fetching analysis history:', error);
            throw new Error(`Failed to fetch analysis history: ${error.message}`);
        }
    }

    /**
     * Save Analysis Results
     * Persist analysis results to database
     * 
     * @param {Object} analysisResult - Analysis result to save
     * @param {number} userId - User ID
     * @returns {Object} Saved calculation run
     */
    async saveAnalysisResults(analysisResult, userId) {
        try {
            const calculationRun = await this.prisma.calculationRun.create({
                data: {
                    name: analysisResult.name || `${analysisResult.timeframe} Analysis`,
                    description: analysisResult.description,
                    timeframe: analysisResult.timeframe,
                    analysisType: this._mapTimeframeToAnalysisType(analysisResult.timeframe),
                    startDate: analysisResult.metadata?.dateRange?.from || new Date(),
                    endDate: analysisResult.metadata?.dateRange?.to || new Date(),
                    parameters: analysisResult.parameters || {},
                    status: 'COMPLETED',
                    progress: 100,
                    totalTickers: analysisResult.metadata?.totalTickers || 1,
                    processedTickers: analysisResult.metadata?.processedTickers || 1,
                    executionTimeMs: analysisResult.metadata?.executionTime || 0,
                    userId,
                    completedAt: new Date()
                }
            });

            // Save individual results if available
            if (analysisResult.results && analysisResult.tickerResults) {
                const resultData = analysisResult.tickerResults.map(tickerResult => ({
                    runId: calculationRun.id,
                    tickerId: tickerResult.tickerId,
                    statistics: tickerResult.statistics || {},
                    totalReturns: tickerResult.totalReturns,
                    positiveReturns: tickerResult.positiveReturns,
                    negativeReturns: tickerResult.negativeReturns,
                    winRate: tickerResult.winRate,
                    avgReturn: tickerResult.avgReturn,
                    maxConsecutive: tickerResult.maxConsecutive
                }));

                await this.prisma.calculationResult.createMany({
                    data: resultData
                });
            }

            console.log(`💾 Analysis results saved [Run ID: ${calculationRun.id}]`);

            return calculationRun;

        } catch (error) {
            console.error('Error saving analysis results:', error);
            throw new Error(`Failed to save analysis results: ${error.message}`);
        }
    }

    // Private helper methods

    /**
     * Perform single weekly analysis (Monday or Expiry)
     */
    async _performSingleWeeklyAnalysis(params) {
        const filteredData = await this.filterService.buildFilterQuery(params);

        const statistics = await this.statisticsService.getDataTableStatistics(
            filteredData.data.map(record => record.returnPercentage).filter(val => val !== null)
        );

        const consecutiveAnalysis = await this.statisticsService.maximumConsecutiveValues(
            filteredData.data.map(record => record.returnPercentage).filter(val => val !== null)
        );

        const insights = await this._generateWeeklyInsights(
            filteredData.data,
            statistics,
            consecutiveAnalysis,
            params.weekType
        );

        return {
            metadata: filteredData.metadata,
            results: {
                statistics,
                consecutiveAnalysis,
                insights
            }
        };
    }

    /**
     * Generate daily insights from analysis results
     */
    async _generateDailyInsights(data, statistics, trendingDays, consecutiveAnalysis) {
        const insights = {
            summary: {
                totalDays: statistics['All Count'],
                winRate: statistics['Pos Count'] / statistics['All Count'] * 100,
                avgReturn: statistics['Avg Return All'],
                bestStreak: consecutiveAnalysis.maximumPositiveCount,
                worstStreak: consecutiveAnalysis.maximumNegativeCount
            },
            patterns: [],
            recommendations: []
        };

        // Pattern detection
        if (insights.summary.winRate > 60) {
            insights.patterns.push({
                type: 'HIGH_WIN_RATE',
                description: `High win rate of ${insights.summary.winRate.toFixed(1)}%`,
                confidence: 'HIGH'
            });
        }

        if (trendingDays && trendingDays.StartDate && trendingDays.StartDate.length > 0) {
            insights.patterns.push({
                type: 'TRENDING_PERIODS',
                description: `Found ${trendingDays.StartDate.length} trending periods`,
                confidence: 'MEDIUM'
            });
        }

        // Recommendations
        if (insights.summary.avgReturn > 0) {
            insights.recommendations.push({
                type: 'POSITIVE_BIAS',
                description: 'Consider long positions based on positive average returns',
                priority: 'HIGH'
            });
        }

        return insights;
    }

    /**
     * Generate weekly insights
     */
    async _generateWeeklyInsights(data, statistics, consecutiveAnalysis, weekType) {
        return {
            summary: {
                weekType,
                totalWeeks: statistics['All Count'],
                winRate: statistics['Pos Count'] / statistics['All Count'] * 100,
                avgReturn: statistics['Avg Return All']
            },
            patterns: [],
            recommendations: []
        };
    }

    /**
     * Generate cross-weekly insights
     */
    async _generateCrossWeeklyInsights(mondayResults, expiryResults) {
        const mondayWinRate = mondayResults.results.statistics['Pos Count'] /
            mondayResults.results.statistics['All Count'] * 100;
        const expiryWinRate = expiryResults.results.statistics['Pos Count'] /
            expiryResults.results.statistics['All Count'] * 100;

        return {
            comparison: {
                mondayWinRate,
                expiryWinRate,
                betterPerformer: mondayWinRate > expiryWinRate ? 'MONDAY_WEEKLY' : 'EXPIRY_WEEKLY',
                performanceDifference: Math.abs(mondayWinRate - expiryWinRate)
            },
            insights: [
                {
                    type: 'WEEKLY_COMPARISON',
                    description: `${mondayWinRate > expiryWinRate ? 'Monday' : 'Expiry'} weekly shows better performance`,
                    confidence: Math.abs(mondayWinRate - expiryWinRate) > 10 ? 'HIGH' : 'MEDIUM'
                }
            ]
        };
    }

    /**
     * Generate monthly insights
     */
    async _generateMonthlyInsights(data, statistics, performanceTable, seasonalPatterns) {
        return {
            summary: {
                totalMonths: statistics['All Count'],
                winRate: statistics['Pos Count'] / statistics['All Count'] * 100,
                avgReturn: statistics['Avg Return All']
            },
            seasonal: seasonalPatterns,
            patterns: [],
            recommendations: []
        };
    }

    /**
     * Generate yearly insights
     */
    async _generateYearlyInsights(data, statistics, decadePatterns, longTermTrends) {
        return {
            summary: {
                totalYears: statistics['All Count'],
                winRate: statistics['Pos Count'] / statistics['All Count'] * 100,
                avgReturn: statistics['Avg Return All']
            },
            decades: decadePatterns,
            trends: longTermTrends,
            patterns: [],
            recommendations: []
        };
    }

    /**
     * Generate election insights
     */
    async _generateElectionInsights(electionDates, analyses, patterns) {
        return {
            summary: {
                totalElections: electionDates.length,
                avgPreElectionReturn: patterns.preElectionAvg,
                avgPostElectionReturn: patterns.postElectionAvg
            },
            patterns: patterns.detectedPatterns,
            recommendations: []
        };
    }

    /**
     * Generate consecutive insights
     */
    async _generateConsecutiveInsights(sequences, analysis) {
        return {
            summary: {
                sequencesFound: sequences.length,
                avgSequenceLength: analysis.avgLength,
                totalReturn: analysis.totalReturn
            },
            patterns: analysis.patterns,
            recommendations: []
        };
    }

    /**
     * Calculate seasonal patterns
     */
    async _calculateSeasonalPatterns(data, timeframe) {
        // Implementation for seasonal pattern detection
        return {
            monthlyPatterns: {},
            quarterlyPatterns: {},
            seasonalBias: 'NEUTRAL'
        };
    }

    /**
     * Calculate decade patterns
     */
    async _calculateDecadePatterns(data) {
        // Implementation for decade pattern analysis
        return {
            decadeReturns: {},
            bestDecade: null,
            worstDecade: null
        };
    }

    /**
     * Calculate long-term trends
     */
    async _calculateLongTermTrends(data) {
        // Implementation for long-term trend analysis
        return {
            overallTrend: 'NEUTRAL',
            trendStrength: 0,
            cyclicalPatterns: []
        };
    }

    /**
     * Analyze election period
     */
    async _analyzeElectionPeriod(election, params) {
        // Implementation for individual election analysis
        return {
            electionDate: election.date,
            preElectionReturn: 0,
            postElectionReturn: 0,
            volatility: 0
        };
    }

    /**
     * Calculate election patterns
     */
    async _calculateElectionPatterns(analyses) {
        // Implementation for aggregate election pattern analysis
        return {
            preElectionAvg: 0,
            postElectionAvg: 0,
            detectedPatterns: []
        };
    }

    /**
     * Prepare data table for consecutive analysis
     */
    async _prepareDataTableForConsecutiveAnalysis(data) {
        // Convert data to format expected by consecutive analysis
        const statistics = await this.statisticsService.getDataTableStatistics(
            data.map(record => record.returnPercentage).filter(val => val !== null)
        );

        return {
            'Sum Return All': data.map(record => record.returnPercentage || 0),
            'Pos Accuracy': data.map(() => 50), // Placeholder - implement actual accuracy calculation
            'All Count': data.map(() => statistics['All Count'])
        };
    }

    /**
     * Analyze consecutive sequences
     */
    async _analyzeConsecutiveSequences(sequences, data) {
        return {
            avgLength: sequences.length > 0 ?
                sequences.reduce((sum, seq) => sum + (seq[1] - seq[0] + 1), 0) / sequences.length : 0,
            totalReturn: 0,
            patterns: []
        };
    }

    /**
     * Utility methods
     */
    _generateAnalysisId() {
        return `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    _hashParams(params) {
        return require('crypto').createHash('md5').update(JSON.stringify(params)).digest('hex');
    }

    _updatePerformanceMetrics(executionTime, success) {
        this.performanceMetrics.analysesPerformed++;
        this.performanceMetrics.totalExecutionTime += executionTime;
        if (!success) {
            this.performanceMetrics.errorCount++;
        }
    }

    _mapTimeframeToAnalysisType(timeframe) {
        const mapping = {
            'DAILY': 'BASIC_STATISTICS',
            'WEEKLY': 'TRENDING_ANALYSIS',
            'MONTHLY': 'SEASONAL_PATTERNS',
            'YEARLY': 'SEASONAL_PATTERNS',
            'ELECTION': 'CUSTOM_ANALYSIS',
            'CONSECUTIVE': 'CONSECUTIVE_ANALYSIS'
        };
        return mapping[timeframe] || 'BASIC_STATISTICS';
    }

    /**
     * Get service health status
     */
    async getHealthStatus() {
        try {
            const [dbHealth, cacheHealth] = await Promise.all([
                this.prisma.$queryRaw`SELECT 1 as health`,
                this.cacheService.ping()
            ]);

            return {
                status: 'HEALTHY',
                services: {
                    database: dbHealth ? 'HEALTHY' : 'UNHEALTHY',
                    cache: cacheHealth ? 'HEALTHY' : 'UNHEALTHY',
                    statistics: 'HEALTHY',
                    timeframe: 'HEALTHY',
                    filter: 'HEALTHY'
                },
                performance: this.performanceMetrics,
                uptime: process.uptime()
            };

        } catch (error) {
            return {
                status: 'UNHEALTHY',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Cleanup resources
     */
    async cleanup() {
        try {
            await Promise.all([
                this.prisma.$disconnect(),
                this.statisticsService.cleanup?.(),
                this.timeframeService.cleanup?.(),
                this.filterService.cleanup?.(),
                this.dataQueryService.cleanup?.(),
                this.calculationEngine.cleanup?.(),
                this.cacheService.cleanup?.()
            ]);

            console.log('✅ AnalysisService cleanup completed');

        } catch (error) {
            console.error('❌ Error during AnalysisService cleanup:', error);
        }
    }
}

module.exports = AnalysisService;