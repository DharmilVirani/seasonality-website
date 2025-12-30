/**
 * Advanced Seasonality Analysis Routes
 *
 * Comprehensive API endpoints for advanced seasonality analysis
 * Integrates all migration features: multi-timeframe, political cycles, statistics
 */

const express = require('express')
const router = express.Router()
const prisma = require('../config/database')
const seasonalityService = require('../services/seasonalityService')
const politicalCycleService = require('../services/politicalCycleService')
const statisticalService = require('../services/statisticalService')

// =====================================================
// MULTI-TIMEFRAME ANALYSIS ENDPOINTS
// =====================================================

/**
 * Get processed data for specific timeframe
 * GET /api/analysis/timeframe/:tickerId/:timeframe
 */
router.get('/timeframe/:tickerId/:timeframe', async (req, res, next) => {
    try {
        const { tickerId, timeframe } = req.params
        const { startDate, endDate, limit = 1000 } = req.query

        // Validate timeframe
        const validTimeframes = ['DAILY', 'MONDAY_WEEKLY', 'EXPIRY_WEEKLY', 'MONTHLY', 'YEARLY']
        if (!validTimeframes.includes(timeframe)) {
            return res.status(400).json({
                error: 'Invalid timeframe',
                message: `Timeframe must be one of: ${validTimeframes.join(', ')}`,
            })
        }

        const whereClause = {
            tickerId: parseInt(tickerId),
            timeFrame: timeframe,
        }

        if (startDate || endDate) {
            whereClause.processedDate = {}
            if (startDate) whereClause.processedDate.gte = new Date(startDate)
            if (endDate) whereClause.processedDate.lte = new Date(endDate)
        }

        const data = await prisma.processedData.findMany({
            where: whereClause,
            include: {
                ticker: true,
                politicalCycle: true,
                specialDay: true,
            },
            orderBy: { processedDate: 'asc' },
            take: parseInt(limit),
        })

        res.json({
            success: true,
            data: {
                tickerId: parseInt(tickerId),
                timeframe,
                records: data,
                count: data.length,
            },
        })
    } catch (error) {
        next(error)
    }
})

/**
 * Get seasonality patterns for a ticker
 * GET /api/analysis/patterns/:tickerId
 */
router.get('/patterns/:tickerId', async (req, res, next) => {
    try {
        const { tickerId } = req.params
        const { patternType, timeFrame } = req.query

        const whereClause = { tickerId: parseInt(tickerId) }
        if (patternType) whereClause.patternType = patternType
        if (timeFrame) whereClause.timeFrame = timeFrame

        const patterns = await prisma.seasonalityPattern.findMany({
            where: whereClause,
            orderBy: [{ patternType: 'asc' }, { period: 'asc' }],
        })

        // Group patterns by type for easier consumption
        const groupedPatterns = patterns.reduce((acc, pattern) => {
            if (!acc[pattern.patternType]) {
                acc[pattern.patternType] = []
            }
            acc[pattern.patternType].push(pattern)
            return acc
        }, {})

        res.json({
            success: true,
            data: {
                tickerId: parseInt(tickerId),
                patterns: patterns,
                groupedPatterns,
                count: patterns.length,
            },
        })
    } catch (error) {
        next(error)
    }
})

/**
 * Get best and worst performing periods
 * GET /api/analysis/best-worst/:tickerId
 */
router.get('/best-worst/:tickerId', async (req, res, next) => {
    try {
        const { tickerId } = req.params

        const patterns = await prisma.seasonalityPattern.findMany({
            where: { tickerId: parseInt(tickerId) },
            orderBy: [{ avgReturn: 'desc' }],
        })

        if (patterns.length === 0) {
            return res.status(404).json({
                error: 'No patterns found',
                message: 'No seasonality patterns available for this ticker',
            })
        }

        // Separate by pattern type
        const monthlyPatterns = patterns.filter((p) => p.patternType === 'MONTHLY_SEASONAL')
        const weeklyPatterns = patterns.filter((p) => p.patternType === 'WEEKLY_SEASONAL')
        const quarterlyPatterns = patterns.filter((p) => p.patternType === 'QUARTERLY_SEASONAL')

        const result = {
            tickerId: parseInt(tickerId),
            monthly: {
                best: monthlyPatterns.length > 0 ? monthlyPatterns[0] : null,
                worst: monthlyPatterns.length > 0 ? monthlyPatterns[monthlyPatterns.length - 1] : null,
            },
            weekly: {
                best: weeklyPatterns.length > 0 ? weeklyPatterns[0] : null,
                worst: weeklyPatterns.length > 0 ? weeklyPatterns[weeklyPatterns.length - 1] : null,
            },
            quarterly: {
                best: quarterlyPatterns.length > 0 ? quarterlyPatterns[0] : null,
                worst: quarterlyPatterns.length > 0 ? quarterlyPatterns[quarterlyPatterns.length - 1] : null,
            },
            overall: {
                best: patterns[0],
                worst: patterns[patterns.length - 1],
            },
        }

        res.json({
            success: true,
            data: result,
        })
    } catch (error) {
        next(error)
    }
})

// =====================================================
// POLITICAL CYCLE ANALYSIS ENDPOINTS
// =====================================================

/**
 * Get political cycles
 * GET /api/analysis/political-cycles
 */
router.get('/political-cycles', async (req, res, next) => {
    try {
        const { country, cycleType, startDate, endDate } = req.query

        const whereClause = {}
        if (country) whereClause.country = country
        if (cycleType) whereClause.cycleType = cycleType

        if (startDate || endDate) {
            whereClause.AND = []
            if (startDate) whereClause.AND.push({ startDate: { gte: new Date(startDate) } })
            if (endDate) whereClause.AND.push({ endDate: { lte: new Date(endDate) } })
        }

        const cycles = await prisma.politicalCycle.findMany({
            where: whereClause,
            orderBy: { startDate: 'asc' },
        })

        res.json({
            success: true,
            data: {
                cycles,
                count: cycles.length,
            },
        })
    } catch (error) {
        next(error)
    }
})

/**
 * Get special days/events
 * GET /api/analysis/special-days
 */
router.get('/special-days', async (req, res, next) => {
    try {
        const { country, type, startDate, endDate } = req.query

        const whereClause = {}
        if (country) whereClause.country = country
        if (type) whereClause.type = type

        if (startDate || endDate) {
            whereClause.date = {}
            if (startDate) whereClause.date.gte = new Date(startDate)
            if (endDate) whereClause.date.lte = new Date(endDate)
        }

        const specialDays = await prisma.specialDay.findMany({
            where: whereClause,
            orderBy: { date: 'asc' },
        })

        res.json({
            success: true,
            data: {
                specialDays,
                count: specialDays.length,
            },
        })
    } catch (error) {
        next(error)
    }
})

/**
 * Get election impact analysis
 * GET /api/analysis/election-impact/:tickerId
 */
router.get('/election-impact/:tickerId', async (req, res, next) => {
    try {
        const { tickerId } = req.params
        const { electionCycle } = req.query

        const analysis = await politicalCycleService.generateElectionImpactAnalysis(parseInt(tickerId), electionCycle)

        res.json({
            success: true,
            data: analysis,
        })
    } catch (error) {
        next(error)
    }
})

/**
 * Get upcoming special events
 * GET /api/analysis/upcoming-events
 */
router.get('/upcoming-events', async (req, res, next) => {
    try {
        const { daysAhead = 30, country } = req.query

        const events = await politicalCycleService.getUpcomingSpecialEvents(parseInt(daysAhead), country)

        res.json({
            success: true,
            data: {
                events,
                daysAhead: parseInt(daysAhead),
                count: events.length,
            },
        })
    } catch (error) {
        next(error)
    }
})

// =====================================================
// STATISTICAL ANALYSIS ENDPOINTS
// =====================================================

/**
 * Get comprehensive statistics for a ticker
 * GET /api/analysis/statistics/:tickerId
 */
router.get('/statistics/:tickerId', async (req, res, next) => {
    try {
        const { tickerId } = req.params
        const { startDate, endDate } = req.query

        const statistics = await statisticalService.calculateComprehensiveStatistics(
            parseInt(tickerId),
            startDate ? new Date(startDate) : null,
            endDate ? new Date(endDate) : null
        )

        res.json({
            success: true,
            data: {
                tickerId: parseInt(tickerId),
                statistics,
            },
        })
    } catch (error) {
        next(error)
    }
})

/**
 * Get risk metrics for a ticker
 * GET /api/analysis/risk/:tickerId
 */
router.get('/risk/:tickerId', async (req, res, next) => {
    try {
        const { tickerId } = req.params
        const { startDate, endDate } = req.query

        const whereClause = { tickerId: parseInt(tickerId) }

        if (startDate || endDate) {
            whereClause.originalDate = {}
            if (startDate) whereClause.originalDate.gte = new Date(startDate)
            if (endDate) whereClause.originalDate.lte = new Date(endDate)
        }

        const data = await prisma.seasonalityData.findMany({
            where: whereClause,
            orderBy: { date: 'asc' },
        })

        if (data.length < 2) {
            return res.status(400).json({
                error: 'Insufficient data',
                message: 'Need at least 2 data points for risk analysis',
            })
        }

        const returns = statisticalService.calculateReturns(data)
        const riskMetrics = statisticalService.calculateRiskMetrics(returns)

        res.json({
            success: true,
            data: {
                tickerId: parseInt(tickerId),
                riskMetrics,
                dataPoints: data.length,
            },
        })
    } catch (error) {
        next(error)
    }
})

/**
 * Compare multiple tickers
 * POST /api/analysis/compare
 */
router.post('/compare', async (req, res, next) => {
    try {
        const { tickerIds, startDate, endDate, metrics = ['returns', 'risk'] } = req.body

        if (!tickerIds || !Array.isArray(tickerIds) || tickerIds.length === 0) {
            return res.status(400).json({
                error: 'Invalid ticker IDs',
                message: 'Please provide an array of ticker IDs',
            })
        }

        const comparison = {
            tickerIds: tickerIds.map((id) => parseInt(id)),
            metrics: {},
            summary: {},
        }

        for (const tickerId of tickerIds) {
            try {
                const whereClause = { tickerId }

                if (startDate || endDate) {
                    whereClause.originalDate = {}
                    if (startDate) whereClause.originalDate.gte = new Date(startDate)
                    if (endDate) whereClause.originalDate.lte = new Date(endDate)
                }

                const data = await prisma.seasonalityData.findMany({
                    where: whereClause,
                    orderBy: { date: 'asc' },
                    include: { ticker: true },
                })

                if (data.length < 2) continue

                const tickerSymbol = data[0].ticker.symbol
                comparison.metrics[tickerSymbol] = {}

                if (metrics.includes('returns')) {
                    const returns = statisticalService.calculateReturns(data)
                    comparison.metrics[tickerSymbol].returns = statisticalService.calculateReturnStatistics(returns)
                }

                if (metrics.includes('risk')) {
                    const returns = statisticalService.calculateReturns(data)
                    comparison.metrics[tickerSymbol].risk = statisticalService.calculateRiskMetrics(returns)
                }

                if (metrics.includes('performance')) {
                    const returns = statisticalService.calculateReturns(data)
                    comparison.metrics[tickerSymbol].performance =
                        statisticalService.calculatePerformanceMetrics(returns)
                }
            } catch (tickerError) {
                console.error(`Error processing ticker ${tickerId}:`, tickerError)
                // Continue with other tickers
            }
        }

        // Generate summary statistics
        const symbols = Object.keys(comparison.metrics)
        if (symbols.length > 0) {
            comparison.summary = {
                totalTickers: symbols.length,
                tickersWithData: symbols.length,
                commonMetrics: metrics,
                dateRange: { startDate, endDate },
            }
        }

        res.json({
            success: true,
            data: comparison,
        })
    } catch (error) {
        next(error)
    }
})

// =====================================================
// BATCH PROCESSING ENDPOINTS
// =====================================================

/**
 * Process seasonality data for all tickers
 * POST /api/analysis/process-all
 */
router.post('/process-all', async (req, res, next) => {
    try {
        const { forceReprocess = false } = req.body

        // Get all tickers
        const tickers = await prisma.ticker.findMany()

        if (tickers.length === 0) {
            return res.status(404).json({
                error: 'No tickers found',
                message: 'Please upload data first',
            })
        }

        let processedCount = 0
        let errorCount = 0
        const results = []

        for (const ticker of tickers) {
            try {
                // Check if data already processed (unless forceReprocess)
                if (!forceReprocess) {
                    const existingProcessed = await prisma.processedData.findFirst({
                        where: { tickerId: ticker.id },
                    })

                    if (existingProcessed) {
                        console.log(`Skipping ${ticker.symbol} - already processed`)
                        continue
                    }
                }

                // Get raw data for this ticker
                const rawData = await prisma.seasonalityData.findMany({
                    where: { tickerId: ticker.id },
                    orderBy: { date: 'asc' },
                })

                if (rawData.length === 0) {
                    console.log(`No raw data for ${ticker.symbol}`)
                    continue
                }

                // Convert to format expected by seasonality service
                const formattedData = rawData.map((record) => ({
                    date: record.date,
                    ticker: ticker.symbol,
                    open: record.open,
                    high: record.high,
                    low: record.low,
                    close: record.close,
                    volume: record.volume,
                    openInterest: record.openInterest,
                }))

                // Process the data
                const processed = await seasonalityService.processSeasonalityData(formattedData)

                processedCount++
                results.push({
                    tickerId: ticker.id,
                    symbol: ticker.symbol,
                    status: 'success',
                    recordsProcessed:
                        processed.daily.length +
                        processed.weekly.length +
                        processed.monthly.length +
                        processed.yearly.length,
                })

                console.log(
                    `Processed ${ticker.symbol}: ${processed.daily.length + processed.weekly.length + processed.monthly.length + processed.yearly.length} records`
                )
            } catch (tickerError) {
                console.error(`Error processing ${ticker.symbol}:`, tickerError)
                errorCount++
                results.push({
                    tickerId: ticker.id,
                    symbol: ticker.symbol,
                    status: 'error',
                    error: tickerError.message,
                })
            }
        }

        res.json({
            success: true,
            data: {
                totalTickers: tickers.length,
                processedCount,
                errorCount,
                results,
                message: `Processed ${processedCount} tickers with ${errorCount} errors`,
            },
        })
    } catch (error) {
        next(error)
    }
})

/**
 * Initialize political cycles and special days
 * POST /api/analysis/initialize-political-data
 */
router.post('/initialize-political-data', async (req, res, next) => {
    try {
        await politicalCycleService.initializeAll()

        res.json({
            success: true,
            message: 'Political cycles and special days initialized successfully',
        })
    } catch (error) {
        next(error)
    }
})

// =====================================================
// ELECTION YEAR ANALYSIS ENDPOINTS
// =====================================================

/**
 * Get election year analysis for a ticker
 * GET /api/analysis/election-years/:tickerId
 */
router.get('/election-years/:tickerId', async (req, res, next) => {
    try {
        const { tickerId } = req.params

        const analysis = await politicalCycleService.getElectionYearAnalysis(parseInt(tickerId))

        res.json({
            success: true,
            data: analysis,
        })
    } catch (error) {
        next(error)
    }
})

/**
 * Get election year data
 * GET /api/analysis/election-years
 */
router.get('/election-years', async (req, res, next) => {
    try {
        const { country = 'INDIA' } = req.query

        const electionYears = await prisma.electionYear.findMany({
            where: { country },
            orderBy: { year: 'asc' },
        })

        res.json({
            success: true,
            data: {
                electionYears,
                count: electionYears.length,
            },
        })
    } catch (error) {
        next(error)
    }
})

/**
 * Filter data by election cycle type
 * POST /api/analysis/filter-by-election
 */
router.post('/filter-by-election', async (req, res, next) => {
    try {
        const { tickerId, electionType, startDate, endDate } = req.body

        if (!tickerId || !electionType) {
            return res.status(400).json({
                error: 'Missing required parameters',
                message: 'tickerId and electionType are required',
            })
        }

        const whereClause = { tickerId: parseInt(tickerId) }
        if (startDate || endDate) {
            whereClause.originalDate = {}
            if (startDate) whereClause.originalDate.gte = new Date(startDate)
            if (endDate) whereClause.originalDate.lte = new Date(endDate)
        }

        const data = await prisma.dailySeasonalityData.findMany({
            where: whereClause,
            orderBy: { date: 'asc' },
        })

        if (data.length === 0) {
            return res.status(404).json({
                error: 'No data found',
                message: 'No data available for the specified criteria',
            })
        }

        // Apply election filter using political cycle service
        const filteredData = politicalCycleService.getElectionFilter(electionType, data)

        res.json({
            success: true,
            data: {
                tickerId: parseInt(tickerId),
                electionType,
                originalCount: data.length,
                filteredCount: filteredData.length,
                filteredData,
            },
        })
    } catch (error) {
        next(error)
    }
})

// =====================================================
// ADVANCED STATISTICAL ANALYSIS ENDPOINTS
// =====================================================

/**
 * Get data table statistics
 * POST /api/analysis/data-table-stats
 */
router.post('/data-table-stats', async (req, res, next) => {
    try {
        const { tickerId, timeframe = 'DAILY', startDate, endDate } = req.body

        if (!tickerId) {
            return res.status(400).json({
                error: 'Missing tickerId',
                message: 'tickerId is required',
            })
        }

        const whereClause = { tickerId: parseInt(tickerId) }
        if (startDate || endDate) {
            whereClause.date = {}
            if (startDate) whereClause.date.gte = new Date(startDate)
            if (endDate) whereClause.date.lte = new Date(endDate)
        }

        let data
        switch (timeframe) {
            case 'DAILY':
                data = await prisma.dailySeasonalityData.findMany({
                    where: whereClause,
                    orderBy: { date: 'asc' },
                })
                break
            case 'MONDAY_WEEKLY':
                data = await prisma.mondayWeeklySeasonalityData.findMany({
                    where: whereClause,
                    orderBy: { date: 'asc' },
                })
                break
            case 'EXPIRY_WEEKLY':
                data = await prisma.expiryWeeklySeasonalityData.findMany({
                    where: whereClause,
                    orderBy: { date: 'asc' },
                })
                break
            case 'MONTHLY':
                data = await prisma.monthlySeasonalityData.findMany({
                    where: whereClause,
                    orderBy: { date: 'asc' },
                })
                break
            case 'YEARLY':
                data = await prisma.yearlySeasonalityData.findMany({
                    where: whereClause,
                    orderBy: { date: 'asc' },
                })
                break
            default:
                return res.status(400).json({
                    error: 'Invalid timeframe',
                    message: 'Supported timeframes: DAILY, MONDAY_WEEKLY, EXPIRY_WEEKLY, MONTHLY, YEARLY',
                })
        }

        if (data.length === 0) {
            return res.status(404).json({
                error: 'No data found',
                message: 'No data available for the specified criteria',
            })
        }

        // Calculate return points for statistical analysis
        const returnPoints = data.map((record) => record.returnPoints || 0).filter((point) => point !== 0)
        const stats = statisticalService.calculateDataTableStatistics(returnPoints)

        res.json({
            success: true,
            data: {
                tickerId: parseInt(tickerId),
                timeframe,
                statistics: stats,
                dataPoints: data.length,
                dateRange: {
                    start: data[0].date,
                    end: data[data.length - 1].date,
                },
            },
        })
    } catch (error) {
        next(error)
    }
})

/**
 * Get trending days analysis
 * POST /api/analysis/trending-days
 */
router.post('/trending-days', async (req, res, next) => {
    try {
        const { tickerId, nTrades, trendType = 'Bullish', percentChange, nweek = 1, nmonth = 1, nyear = 1 } = req.body

        if (!tickerId || !nTrades || !percentChange) {
            return res.status(400).json({
                error: 'Missing required parameters',
                message: 'tickerId, nTrades, and percentChange are required',
            })
        }

        const data = await prisma.dailySeasonalityData.findMany({
            where: { tickerId: parseInt(tickerId) },
            orderBy: { date: 'asc' },
        })

        if (data.length === 0) {
            return res.status(404).json({
                error: 'No data found',
                message: 'No data available for this ticker',
            })
        }

        // Convert to format expected by statistical service
        const formattedData = data.map((record) => ({
            Date: record.date,
            Close: record.close,
            ReturnPercentage: record.returnPercentage || 0,
        }))

        const analysis = statisticalService.getTrendingDaysAnalysis(
            formattedData,
            nTrades,
            'more', // Assume we're looking for positive trends
            percentChange,
            nweek,
            nmonth,
            nyear
        )

        res.json({
            success: true,
            data: {
                tickerId: parseInt(tickerId),
                parameters: { nTrades, trendType, percentChange, nweek, nmonth, nyear },
                analysis,
                totalDataPoints: data.length,
            },
        })
    } catch (error) {
        next(error)
    }
})

/**
 * Get recent performance metrics
 * GET /api/analysis/recent-performance/:tickerId
 */
router.get('/recent-performance/:tickerId', async (req, res, next) => {
    try {
        const { tickerId } = req.params
        const { recentDays = 30, recentWeeks = 4, recentMonths = 3 } = req.query

        const data = await prisma.dailySeasonalityData.findMany({
            where: { tickerId: parseInt(tickerId) },
            orderBy: { date: 'asc' },
        })

        if (data.length === 0) {
            return res.status(404).json({
                error: 'No data found',
                message: 'No data available for this ticker',
            })
        }

        // Convert to format expected by statistical service
        const formattedData = data.map((record) => ({
            Date: record.date,
            Close: record.close,
            MondayWeeklyDate: record.mondayWeeklyDate,
        }))

        const recentPerformance = {
            days: statisticalService.getRecentDayReturnPercentage(formattedData, parseInt(recentDays)),
            weeks: statisticalService.getRecentWeekReturnPercentage(formattedData, parseInt(recentWeeks)),
            months: statisticalService.getRecentMonthReturnPercentage(formattedData, parseInt(recentMonths)),
        }

        res.json({
            success: true,
            data: {
                tickerId: parseInt(tickerId),
                recentPerformance,
                parameters: {
                    recentDays: parseInt(recentDays),
                    recentWeeks: parseInt(recentWeeks),
                    recentMonths: parseInt(recentMonths),
                },
                totalDataPoints: data.length,
                dateRange: {
                    start: data[0].date,
                    end: data[data.length - 1].date,
                },
            },
        })
    } catch (error) {
        next(error)
    }
})

/**
 * Generate month-on-month performance table
 * POST /api/analysis/monthly-performance
 */
router.post('/monthly-performance', async (req, res, next) => {
    try {
        const {
            tickerId,
            entryType = 'Open',
            exitType = 'Close',
            tradeType = 'Long',
            entryDay = 'Monday',
            exitDay = 'Friday',
            returnType = 'Percent',
        } = req.body

        if (!tickerId) {
            return res.status(400).json({
                error: 'Missing tickerId',
                message: 'tickerId is required',
            })
        }

        const data = await prisma.dailySeasonalityData.findMany({
            where: { tickerId: parseInt(tickerId) },
            orderBy: { date: 'asc' },
        })

        if (data.length === 0) {
            return res.status(404).json({
                error: 'No data found',
                message: 'No data available for this ticker',
            })
        }

        // Convert to format expected by statistical service
        const formattedData = data.map((record) => ({
            Date: record.date,
            Open: record.open,
            Close: record.close,
            Weekday: record.weekday,
        }))

        const performanceTable = statisticalService.generatePerformanceTable(
            formattedData,
            entryType,
            exitType,
            tradeType,
            entryDay,
            exitDay,
            returnType
        )

        if (!performanceTable) {
            return res.status(400).json({
                error: 'Invalid parameters',
                message: 'Entry day and exit day cannot be the same, or no valid trading sequences found',
            })
        }

        res.json({
            success: true,
            data: {
                tickerId: parseInt(tickerId),
                parameters: { entryType, exitType, tradeType, entryDay, exitDay, returnType },
                performanceTable,
                totalDataPoints: data.length,
            },
        })
    } catch (error) {
        next(error)
    }
})

// =====================================================
// UTILITY ENDPOINTS
// =====================================================

/**
 * Get analysis dashboard summary
 * GET /api/analysis/dashboard
 */
router.get('/dashboard', async (req, res, next) => {
    try {
        const [
            totalTickers,
            totalProcessedData,
            totalPatterns,
            totalPoliticalCycles,
            totalSpecialDays,
            recentPatterns,
            upcomingEvents,
        ] = await Promise.all([
            prisma.ticker.count(),
            prisma.processedData.count(),
            prisma.seasonalityPattern.count(),
            prisma.politicalCycle.count(),
            prisma.specialDay.count(),
            prisma.seasonalityPattern.findMany({
                take: 10,
                orderBy: { analysisDate: 'desc' },
                include: { ticker: true },
            }),
            politicalCycleService.getUpcomingSpecialEvents(30),
        ])

        const timeFrameDistribution = await prisma.processedData.groupBy({
            by: ['timeFrame'],
            _count: { timeFrame: true },
        })

        res.json({
            success: true,
            data: {
                summary: {
                    totalTickers,
                    totalProcessedData,
                    totalPatterns,
                    totalPoliticalCycles,
                    totalSpecialDays,
                    timeFrameDistribution: timeFrameDistribution.reduce((acc, item) => {
                        acc[item.timeFrame] = item._count.timeFrame
                        return acc
                    }, {}),
                },
                recentPatterns,
                upcomingEvents,
            },
        })
    } catch (error) {
        next(error)
    }
})

// =====================================================
// SEARCH AND FILTER ENDPOINTS
// =====================================================

/**
 * Search tickers by symbol or name
 * GET /api/analysis/search-tickers
 */
router.get('/search-tickers', async (req, res, next) => {
    try {
        const { query, limit = 20 } = req.query

        if (!query || query.trim().length === 0) {
            return res.status(400).json({
                error: 'Query parameter required',
                message: 'Please provide a search query',
            })
        }

        const tickers = await prisma.ticker.findMany({
            where: {
                OR: [{ symbol: { contains: query.toUpperCase() } }, { name: { contains: query, mode: 'insensitive' } }],
            },
            take: parseInt(limit),
            orderBy: { symbol: 'asc' },
        })

        res.json({
            success: true,
            data: {
                tickers,
                count: tickers.length,
                query: query.trim(),
            },
        })
    } catch (error) {
        next(error)
    }
})

/**
 * Get ticker analysis overview
 * GET /api/analysis/ticker-overview/:tickerId
 */
router.get('/ticker-overview/:tickerId', async (req, res, next) => {
    try {
        const { tickerId } = req.params
        const ticker = await prisma.ticker.findUnique({
            where: { id: parseInt(tickerId) },
        })

        if (!ticker) {
            return res.status(404).json({
                error: 'Ticker not found',
                message: 'Ticker with the specified ID does not exist',
            })
        }

        const [patternCount, processedDataCount, lastAnalysisDate, bestPerformingPattern, worstPerformingPattern] =
            await Promise.all([
                prisma.seasonalityPattern.count({ where: { tickerId: parseInt(tickerId) } }),
                prisma.processedData.count({ where: { tickerId: parseInt(tickerId) } }),
                prisma.seasonalityPattern.findFirst({
                    where: { tickerId: parseInt(tickerId) },
                    orderBy: { analysisDate: 'desc' },
                    select: { analysisDate: true },
                }),
                prisma.seasonalityPattern.findFirst({
                    where: { tickerId: parseInt(tickerId) },
                    orderBy: { avgReturn: 'desc' },
                }),
                prisma.seasonalityPattern.findFirst({
                    where: { tickerId: parseInt(tickerId) },
                    orderBy: { avgReturn: 'asc' },
                }),
            ])

        res.json({
            success: true,
            data: {
                ticker,
                overview: {
                    patternCount,
                    processedDataCount,
                    lastAnalysisDate: lastAnalysisDate?.analysisDate || null,
                    bestPerformingPattern,
                    worstPerformingPattern,
                },
            },
        })
    } catch (error) {
        next(error)
    }
})

/**
 * Export analysis data
 * GET /api/analysis/export/:tickerId
 */
router.get('/export/:tickerId', async (req, res, next) => {
    try {
        const { tickerId } = req.params
        const { format = 'json', timeframe, startDate, endDate } = req.query

        const ticker = await prisma.ticker.findUnique({
            where: { id: parseInt(tickerId) },
        })

        if (!ticker) {
            return res.status(404).json({
                error: 'Ticker not found',
                message: 'Ticker with the specified ID does not exist',
            })
        }

        // Get patterns
        const patterns = await prisma.seasonalityPattern.findMany({
            where: { tickerId: parseInt(tickerId) },
            orderBy: [{ patternType: 'asc' }, { period: 'asc' }],
        })

        // Get processed data
        const whereClause = { tickerId: parseInt(tickerId) }
        if (startDate || endDate) {
            whereClause.processedDate = {}
            if (startDate) whereClause.processedDate.gte = new Date(startDate)
            if (endDate) whereClause.processedDate.lte = new Date(endDate)
        }
        if (timeframe) whereClause.timeFrame = timeframe

        const processedData = await prisma.processedData.findMany({
            where: whereClause,
            include: {
                politicalCycle: true,
                specialDay: true,
            },
            orderBy: { processedDate: 'asc' },
        })

        const exportData = {
            ticker: {
                id: ticker.id,
                symbol: ticker.symbol,
                name: ticker.name,
                exchange: ticker.exchange,
            },
            exportDate: new Date().toISOString(),
            dataRange: {
                startDate: startDate || null,
                endDate: endDate || null,
                timeframe: timeframe || 'all',
            },
            patterns,
            processedData,
            summary: {
                totalPatterns: patterns.length,
                totalProcessedRecords: processedData.length,
            },
        }

        if (format === 'csv') {
            // Convert to CSV format
            const csvHeader = 'Date,Symbol,Timeframe,ReturnPercentage,Volume,PoliticalCycle,SpecialDay\n'
            const csvData = processedData
                .map(
                    (record) =>
                        `${record.processedDate.toISOString().split('T')[0]},${ticker.symbol},${record.timeFrame},${record.returnPercentage || ''},${record.volume || ''},${record.politicalCycle?.name || ''},${record.specialDay?.name || ''}`
                )
                .join('\n')

            res.setHeader('Content-Type', 'text/csv')
            res.setHeader('Content-Disposition', `attachment; filename="${ticker.symbol}_analysis.csv"`)
            res.send(csvHeader + csvData)
        } else {
            res.json({
                success: true,
                data: exportData,
            })
        }
    } catch (error) {
        next(error)
    }
})

// =====================================================
// HEALTH AND STATUS ENDPOINTS
// =====================================================

/**
 * Get API health status
 * GET /api/analysis/health
 */
router.get('/health', async (req, res, next) => {
    try {
        const dbStatus = await prisma.$queryRaw`SELECT 1 as test`

        const [tickerCount, patternCount, processedDataCount] = await Promise.all([
            prisma.ticker.count(),
            prisma.seasonalityPattern.count(),
            prisma.processedData.count(),
        ])

        res.json({
            success: true,
            status: 'healthy',
            timestamp: new Date().toISOString(),
            services: {
                database: dbStatus ? 'connected' : 'disconnected',
                seasonalityService: 'operational',
                politicalCycleService: 'operational',
                statisticalService: 'operational',
            },
            dataStats: {
                totalTickers: tickerCount,
                totalPatterns: patternCount,
                totalProcessedRecords: processedDataCount,
            },
        })
    } catch (error) {
        res.status(503).json({
            success: false,
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: error.message,
        })
    }
})

/**
 * Get available data types and timeframes
 * GET /api/analysis/metadata
 */
router.get('/metadata', async (req, res, next) => {
    try {
        const timeFrameDistribution = await prisma.processedData.groupBy({
            by: ['timeFrame'],
            _count: { timeFrame: true },
        })

        const countries = await prisma.politicalCycle.findMany({
            select: { country: true },
            distinct: ['country'],
        })

        const specialDayTypes = await prisma.specialDay.findMany({
            select: { type: true },
            distinct: ['type'],
        })

        res.json({
            success: true,
            data: {
                timeframes: {
                    available: ['DAILY', 'MONDAY_WEEKLY', 'EXPIRY_WEEKLY', 'MONTHLY', 'YEARLY'],
                    distribution: timeFrameDistribution.reduce((acc, item) => {
                        acc[item.timeFrame] = item._count.timeFrame
                        return acc
                    }, {}),
                },
                countries: countries.map((c) => c.country),
                specialDayTypes: specialDayTypes.map((t) => t.type),
                electionCycles: ['GENERAL', 'STATE', 'LOCAL'],
            },
        })
    } catch (error) {
        next(error)
    }
})

module.exports = router
