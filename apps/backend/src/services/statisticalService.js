/**
 * Advanced Statistical Calculation Service
 *
 * Implements sophisticated statistical analysis for seasonality patterns
 * Migrated from Python system with enhanced mathematical capabilities
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

class StatisticalService {
    constructor() {
        this.RISK_FREE_RATE = 0.05 // 5% risk-free rate assumption
    }

    /**
     * Calculate comprehensive statistics for a ticker
     */
    async calculateComprehensiveStatistics(tickerId, startDate = null, endDate = null) {
        try {
            const whereClause = { tickerId }

            if (startDate || endDate) {
                whereClause.originalDate = {}
                if (startDate) whereClause.originalDate.gte = startDate
                if (endDate) whereClause.originalDate.lte = endDate
            }

            const data = await prisma.seasonalityData.findMany({
                where: whereClause,
                orderBy: { date: 'asc' },
            })

            if (data.length < 2) {
                throw new Error('Insufficient data for statistical analysis')
            }

            // Calculate returns
            const returns = this.calculateReturns(data)

            const statistics = {
                // Basic Statistics
                totalObservations: data.length,
                dateRange: {
                    start: data[0].date,
                    end: data[data.length - 1].date,
                },

                // Price Statistics
                price: this.calculatePriceStatistics(data),

                // Return Statistics
                returns: this.calculateReturnStatistics(returns),

                // Risk Metrics
                risk: this.calculateRiskMetrics(returns),

                // Seasonality Metrics
                seasonality: await this.calculateSeasonalityMetrics(tickerId),

                // Performance Metrics
                performance: this.calculatePerformanceMetrics(returns),

                // Distribution Analysis
                distribution: this.calculateDistributionAnalysis(returns),
            }

            return statistics
        } catch (error) {
            console.error('Error calculating comprehensive statistics:', error)
            throw error
        }
    }

    /**
     * Calculate returns from price data
     */
    calculateReturns(data) {
        const returns = []

        for (let i = 1; i < data.length; i++) {
            const currentClose = data[i].close
            const previousClose = data[i - 1].close

            if (previousClose !== 0) {
                const returnPct = ((currentClose - previousClose) / previousClose) * 100
                returns.push(returnPct)
            }
        }

        return returns
    }

    /**
     * Calculate price statistics
     */
    calculatePriceStatistics(data) {
        const prices = data.map((d) => d.close)
        const volumes = data.map((d) => d.volume || 0)

        return {
            current: prices[prices.length - 1],
            minimum: Math.min(...prices),
            maximum: Math.max(...prices),
            average: this.calculateMean(prices),
            median: this.calculateMedian(prices),
            standardDeviation: this.calculateStandardDeviation(prices),

            // Volume statistics
            averageVolume: this.calculateMean(volumes),
            totalVolume: volumes.reduce((sum, vol) => sum + vol, 0),

            // Price changes
            totalReturn: ((prices[prices.length - 1] - prices[0]) / prices[0]) * 100,

            // Quartiles
            q1: this.calculateQuantile(prices, 0.25),
            q2: this.calculateQuantile(prices, 0.5),
            q3: this.calculateQuantile(prices, 0.75),
        }
    }

    /**
     * Calculate return statistics
     */
    calculateReturnStatistics(returns) {
        if (returns.length === 0) {
            return { error: 'No returns data available' }
        }

        return {
            count: returns.length,
            mean: this.calculateMean(returns),
            median: this.calculateMedian(returns),
            standardDeviation: this.calculateStandardDeviation(returns),
            minimum: Math.min(...returns),
            maximum: Math.max(...returns),

            // Percentiles
            percentile5: this.calculateQuantile(returns, 0.05),
            percentile95: this.calculateQuantile(returns, 0.95),

            // Skewness and Kurtosis
            skewness: this.calculateSkewness(returns),
            kurtosis: this.calculateKurtosis(returns),

            // Positive vs Negative returns
            positiveReturns: returns.filter((r) => r > 0).length,
            negativeReturns: returns.filter((r) => r < 0).length,
            neutralReturns: returns.filter((r) => r === 0).length,
            positiveRatio: returns.filter((r) => r > 0).length / returns.length,

            // Consecutive patterns
            consecutiveWins: this.calculateMaxConsecutive(returns.map((r) => r > 0)),
            consecutiveLosses: this.calculateMaxConsecutive(returns.map((r) => r < 0)),
        }
    }

    /**
     * Calculate risk metrics
     */
    calculateRiskMetrics(returns) {
        if (returns.length === 0) {
            return { error: 'No returns data available' }
        }

        const mean = this.calculateMean(returns)
        const volatility = this.calculateStandardDeviation(returns)

        // Value at Risk (VaR)
        const var95 = this.calculateQuantile(returns, 0.05)
        const var99 = this.calculateQuantile(returns, 0.01)

        // Expected Shortfall (Conditional VaR)
        const es95 = this.calculateExpectedShortfall(returns, 0.05)
        const es99 = this.calculateExpectedShortfall(returns, 0.01)

        // Sharpe Ratio
        const sharpeRatio = volatility > 0 ? (mean - this.RISK_FREE_RATE / 252) / volatility : 0

        // Maximum Drawdown
        const maxDrawdown = this.calculateMaximumDrawdown(returns)

        // Downside Deviation (only negative returns)
        const negativeReturns = returns.filter((r) => r < 0)
        const downsideDeviation = negativeReturns.length > 0 ? this.calculateStandardDeviation(negativeReturns) : 0

        // Sortino Ratio
        const sortinoRatio = downsideDeviation > 0 ? (mean - this.RISK_FREE_RATE / 252) / downsideDeviation : 0

        return {
            volatility: volatility,
            variance: Math.pow(volatility, 2),

            // Value at Risk
            var95,
            var99,

            // Expected Shortfall
            es95,
            es99,

            // Risk-adjusted returns
            sharpeRatio,
            sortinoRatio,

            // Drawdown analysis
            maxDrawdown,

            // Downside risk
            downsideDeviation,
            downsideDeviationRatio: volatility > 0 ? downsideDeviation / volatility : 0,
        }
    }

    /**
     * Calculate seasonality metrics
     */
    async calculateSeasonalityMetrics(tickerId) {
        try {
            const patterns = await prisma.seasonalityPattern.findMany({
                where: { tickerId },
            })

            if (patterns.length === 0) {
                return { message: 'No seasonality patterns found' }
            }

            const monthlyPatterns = patterns.filter((p) => p.patternType === 'MONTHLY_SEASONAL')
            const weeklyPatterns = patterns.filter((p) => p.patternType === 'WEEKLY_SEASONAL')
            const quarterlyPatterns = patterns.filter((p) => p.patternType === 'QUARTERLY_SEASONAL')

            return {
                totalPatterns: patterns.length,

                monthly: {
                    count: monthlyPatterns.length,
                    bestMonth: this.findBestPeriod(monthlyPatterns),
                    worstMonth: this.findWorstPeriod(monthlyPatterns),
                    avgReturn:
                        monthlyPatterns.length > 0 ? this.calculateMean(monthlyPatterns.map((p) => p.avgReturn)) : 0,
                },

                weekly: {
                    count: weeklyPatterns.length,
                    bestDay: this.findBestPeriod(weeklyPatterns),
                    worstDay: this.findWorstPeriod(weeklyPatterns),
                    avgReturn:
                        weeklyPatterns.length > 0 ? this.calculateMean(weeklyPatterns.map((p) => p.avgReturn)) : 0,
                },

                quarterly: {
                    count: quarterlyPatterns.length,
                    bestQuarter: this.findBestPeriod(quarterlyPatterns),
                    worstQuarter: this.findWorstPeriod(quarterlyPatterns),
                    avgReturn:
                        quarterlyPatterns.length > 0
                            ? this.calculateMean(quarterlyPatterns.map((p) => p.avgReturn))
                            : 0,
                },

                // Overall seasonality strength
                seasonalityStrength: this.calculateSeasonalityStrength(patterns),

                // Statistical significance
                significantPatterns: patterns.filter((p) => p.significance > 1.96).length,
                highConfidencePatterns: patterns.filter((p) => p.confidence > 0.8).length,
            }
        } catch (error) {
            console.error('Error calculating seasonality metrics:', error)
            return { error: error.message }
        }
    }

    /**
     * Calculate performance metrics
     */
    calculatePerformanceMetrics(returns) {
        if (returns.length === 0) {
            return { error: 'No returns data available' }
        }

        const cumulativeReturns = this.calculateCumulativeReturns(returns)
        const totalReturn = cumulativeReturns[cumulativeReturns.length - 1]

        // Annualized metrics (assuming daily data)
        const tradingDays = returns.length
        const years = tradingDays / 252
        const annualizedReturn = Math.pow(1 + totalReturn / 100, 1 / years) - 1
        const annualizedVolatility = this.calculateStandardDeviation(returns) * Math.sqrt(252)

        // Win rate and consistency
        const winRate = returns.filter((r) => r > 0).length / returns.length
        const avgWin = this.calculateMean(returns.filter((r) => r > 0))
        const avgLoss = this.calculateMean(returns.filter((r) => r < 0))
        const winLossRatio = avgLoss !== 0 ? Math.abs(avgWin / avgLoss) : 0

        // Profit Factor
        const totalWins = returns.filter((r) => r > 0).reduce((sum, r) => sum + r, 0)
        const totalLosses = Math.abs(returns.filter((r) => r < 0).reduce((sum, r) => sum + r, 0))
        const profitFactor = totalLosses !== 0 ? totalWins / totalLosses : 0

        // Calmar Ratio
        const maxDrawdown = this.calculateMaximumDrawdown(returns)
        const calmarRatio = maxDrawdown !== 0 ? (annualizedReturn * 100) / maxDrawdown : 0

        return {
            totalReturn: totalReturn,
            annualizedReturn: annualizedReturn * 100,
            annualizedVolatility: annualizedVolatility,

            // Consistency metrics
            winRate: winRate * 100,
            avgWin,
            avgLoss,
            winLossRatio,

            // Advanced metrics
            profitFactor,
            calmarRatio,

            // Return distribution
            positiveMonths: cumulativeReturns.filter((r) => r > 0).length,
            negativeMonths: cumulativeReturns.filter((r) => r < 0).length,

            // Best and worst periods
            bestSingleDay: Math.max(...returns),
            worstSingleDay: Math.min(...returns),
            bestMonth: Math.max(...this.calculateMonthlyReturns(cumulativeReturns)),
            worstMonth: Math.min(...this.calculateMonthlyReturns(cumulativeReturns)),
        }
    }

    /**
     * Calculate distribution analysis
     */
    calculateDistributionAnalysis(returns) {
        if (returns.length === 0) {
            return { error: 'No returns data available' }
        }

        const mean = this.calculateMean(returns)
        const std = this.calculateStandardDeviation(returns)

        // Jarque-Bera test for normality
        const jarqueBera = this.calculateJarqueBera(returns)

        // Anderson-Darling test
        const andersonDarling = this.calculateAndersonDarling(returns)

        // Tail analysis
        const sortedReturns = [...returns].sort((a, b) => a - b)
        const tailReturns = sortedReturns.slice(0, Math.floor(returns.length * 0.05))
        const extremeReturns = sortedReturns.slice(Math.floor(returns.length * 0.95))

        return {
            mean,
            standardDeviation: std,

            // Normality tests
            jarqueBera: {
                statistic: jarqueBera.statistic,
                pValue: jarqueBera.pValue,
                isNormal: jarqueBara.pValue > 0.05,
            },

            andersonDarling: {
                statistic: andersonDarling.statistic,
                criticalValues: andersonDarling.criticalValues,
                isNormal: andersonDarling.statistic < andersonDarling.criticalValues[2],
            },

            // Tail analysis
            leftTail: {
                mean: this.calculateMean(tailReturns),
                extremeEvents: tailReturns.filter((r) => r < mean - 2 * std).length,
            },

            rightTail: {
                mean: this.calculateMean(extremeReturns),
                extremeEvents: extremeReturns.filter((r) => r > mean + 2 * std).length,
            },

            // Percentiles
            percentiles: {
                p1: this.calculateQuantile(returns, 0.01),
                p5: this.calculateQuantile(returns, 0.05),
                p25: this.calculateQuantile(returns, 0.25),
                p50: this.calculateQuantile(returns, 0.5),
                p75: this.calculateQuantile(returns, 0.75),
                p95: this.calculateQuantile(returns, 0.95),
                p99: this.calculateQuantile(returns, 0.99),
            },
        }
    }

    // Utility mathematical functions

    calculateMean(values) {
        if (values.length === 0) return 0
        return values.reduce((sum, val) => sum + val, 0) / values.length
    }

    calculateMedian(values) {
        if (values.length === 0) return 0
        const sorted = [...values].sort((a, b) => a - b)
        const mid = Math.floor(sorted.length / 2)
        return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
    }

    calculateStandardDeviation(values) {
        if (values.length === 0) return 0
        const mean = this.calculateMean(values)
        const squaredDiffs = values.map((val) => Math.pow(val - mean, 2))
        const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length
        return Math.sqrt(variance)
    }

    calculateQuantile(values, quantile) {
        if (values.length === 0) return 0
        const sorted = [...values].sort((a, b) => a - b)
        const index = quantile * (sorted.length - 1)
        const lower = Math.floor(index)
        const upper = Math.ceil(index)
        const weight = index % 1

        if (upper >= sorted.length) return sorted[sorted.length - 1]
        if (lower < 0) return sorted[0]

        return sorted[lower] * (1 - weight) + sorted[upper] * weight
    }

    calculateSkewness(values) {
        if (values.length === 0) return 0
        const mean = this.calculateMean(values)
        const std = this.calculateStandardDeviation(values)

        if (std === 0) return 0

        const skewness =
            values.reduce((sum, val) => {
                return sum + Math.pow((val - mean) / std, 3)
            }, 0) / values.length

        return skewness
    }

    calculateKurtosis(values) {
        if (values.length === 0) return 0
        const mean = this.calculateMean(values)
        const std = this.calculateStandardDeviation(values)

        if (std === 0) return 0

        const kurtosis =
            values.reduce((sum, val) => {
                return sum + Math.pow((val - mean) / std, 4)
            }, 0) / values.length

        return kurtosis - 3 // Excess kurtosis
    }

    calculateMaxConsecutive(booleans) {
        let maxCount = 0
        let currentCount = 0

        for (const bool of booleans) {
            if (bool) {
                currentCount++
                maxCount = Math.max(maxCount, currentCount)
            } else {
                currentCount = 0
            }
        }

        return maxCount
    }

    calculateExpectedShortfall(returns, percentile) {
        const varValue = this.calculateQuantile(returns, percentile)
        const tailReturns = returns.filter((r) => r <= varValue)
        return tailReturns.length > 0 ? this.calculateMean(tailReturns) : varValue
    }

    calculateMaximumDrawdown(returns) {
        let maxDrawdown = 0
        let peak = 0
        let cumulative = 0

        for (const ret of returns) {
            cumulative += ret
            peak = Math.max(peak, cumulative)
            const drawdown = ((cumulative - peak) / peak) * 100
            maxDrawdown = Math.min(maxDrawdown, drawdown)
        }

        return Math.abs(maxDrawdown)
    }

    calculateCumulativeReturns(returns) {
        const cumulative = [0] // Start with 0%

        for (const ret of returns) {
            const lastCumulative = cumulative[cumulative.length - 1]
            const newCumulative = lastCumulative + ret
            cumulative.push(newCumulative)
        }

        return cumulative
    }

    calculateMonthlyReturns(cumulativeReturns) {
        // Simplified: group cumulative returns into months
        const monthlyReturns = []
        const chunkSize = 21 // Approximate trading days per month

        for (let i = 0; i < cumulativeReturns.length; i += chunkSize) {
            const chunk = cumulativeReturns.slice(i, i + chunkSize)
            if (chunk.length > 1) {
                const monthReturn = chunk[chunk.length - 1] - chunk[0]
                monthlyReturns.push(monthReturn)
            }
        }

        return monthlyReturns
    }

    calculateJarqueBera(returns) {
        const n = returns.length
        const skewness = this.calculateSkewness(returns)
        const kurtosis = this.calculateKurtosis(returns)

        const jb = (n / 6) * (Math.pow(skewness, 2) + Math.pow(kurtosis, 2) / 4)
        const pValue = 1 - this.chiSquareCDF(jb, 2)

        return { statistic: jb, pValue }
    }

    calculateAndersonDarling(returns) {
        // Simplified Anderson-Darling test
        const n = returns.length
        const sorted = [...returns].sort((a, b) => a - b)

        let ad = 0
        for (let i = 0; i < n; i++) {
            const fi = (i + 1) / n
            const fni = i / n
            ad += (2 * i + 1) * (Math.log(this.normalCDF(sorted[i])) + Math.log(1 - this.normalCDF(sorted[n - 1 - i])))
        }

        const statistic = -n - ad / n
        const criticalValues = [0.656, 0.787, 0.918, 1.092] // 15%, 10%, 5%, 2.5%

        return { statistic, criticalValues }
    }

    normalCDF(x) {
        return 0.5 * (1 + this.erf(x / Math.sqrt(2)))
    }

    erf(x) {
        // Approximation of the error function
        const a1 = 0.254829592
        const a2 = -0.284496736
        const a3 = 1.421413741
        const a4 = -1.453152027
        const a5 = 1.061405429
        const p = 0.3275911

        const sign = x < 0 ? -1 : 1
        x = Math.abs(x)

        const t = 1.0 / (1.0 + p * x)
        const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x)

        return sign * y
    }

    chiSquareCDF(x, k) {
        // Simplified chi-square CDF approximation
        if (x <= 0) return 0
        if (x >= 10) return 1

        let sum = 1
        let term = 1

        for (let i = 1; i <= k / 2; i++) {
            term *= x / (2 * i)
            sum += term
        }

        return 1 - Math.exp(-x / 2) * sum
    }

    findBestPeriod(patterns) {
        if (patterns.length === 0) return null
        return patterns.reduce((best, pattern) => (pattern.avgReturn > best.avgReturn ? pattern : best))
    }

    findWorstPeriod(patterns) {
        if (patterns.length === 0) return null
        return patterns.reduce((worst, pattern) => (pattern.avgReturn < worst.avgReturn ? pattern : worst))
    }

    calculateSeasonalityStrength(patterns) {
        if (patterns.length === 0) return 0

        const avgSignificance = this.calculateMean(patterns.map((p) => p.significance))
        const avgConfidence = this.calculateMean(patterns.map((p) => p.confidence))
        const significantCount = patterns.filter((p) => p.significance > 1.96).length

        return {
            avgSignificance,
            avgConfidence,
            significantPatternRatio: significantCount / patterns.length,
            strength: (avgSignificance * avgConfidence * significantCount) / patterns.length,
        }
    }

    /**
     * Calculate data table statistics (Ported from Python helper.py getDataTableStatistics)
     */
    calculateDataTableStatistics(allDayReturnPoints) {
        if (!allDayReturnPoints || allDayReturnPoints.length === 0) {
            return {
                'All Count': 0,
                'Avg Return All': 0,
                'Sum Return All': 0,
                'Pos Count': 0,
                'Avg Return Pos': 0,
                'Sum Return Pos': 0,
                'Neg Count': 0,
                'Avg Return Neg': 0,
                'Sum Return Neg': 0,
            }
        }

        const positiveReturnPoints = allDayReturnPoints.filter((point) => point > 0)
        const negativeReturnPoints = allDayReturnPoints.filter((point) => point < 0)

        return {
            'All Count': allDayReturnPoints.length,
            'Avg Return All': this.calculateMean(allDayReturnPoints),
            'Sum Return All': allDayReturnPoints.reduce((sum, point) => sum + point, 0),
            'Pos Count': positiveReturnPoints.length,
            'Avg Return Pos': positiveReturnPoints.length > 0 ? this.calculateMean(positiveReturnPoints) : 0,
            'Sum Return Pos': positiveReturnPoints.reduce((sum, point) => sum + point, 0),
            'Neg Count': negativeReturnPoints.length,
            'Avg Return Neg': negativeReturnPoints.length > 0 ? this.calculateMean(negativeReturnPoints) : 0,
            'Sum Return Neg': negativeReturnPoints.reduce((sum, point) => sum + point, 0),
        }
    }

    /**
     * Get accuracy calculation (Ported from Python helper.py getAccuracy)
     */
    getAccuracy(row, countType) {
        if (row['All Count'] === 0) {
            return '0(0%)'
        }
        const percentage = Math.round((row[countType] / row['All Count']) * 100 * 100) / 100
        return `${row[countType]}(${percentage}%)`
    }

    /**
     * Calculate maximum consecutive values (Ported from Python helper.py)
     */
    calculateMaximumConsecutiveValues(arr) {
        let maximumPositiveCount = 0
        let currentPositiveCount = 0
        let maximumNegativeCount = 0
        let currentNegativeCount = 0

        for (const num of arr) {
            if (num > 0) {
                currentPositiveCount += 1
                maximumPositiveCount = Math.max(maximumPositiveCount, currentPositiveCount)
                currentNegativeCount = 0
            } else if (num < 0) {
                currentNegativeCount += 1
                maximumNegativeCount = Math.max(maximumNegativeCount, currentNegativeCount)
                currentPositiveCount = 0
            } else {
                currentPositiveCount = 0
                currentNegativeCount = 0
            }
        }

        return { maximumPositiveCount, maximumNegativeCount }
    }

    /**
     * Get recent day return percentage (Ported from Python helper.py)
     */
    getRecentDayReturnPercentage(df, recentDayValue) {
        if (!df || df.length === 0 || !recentDayValue || recentDayValue <= 0) {
            return 0
        }

        try {
            const dayReturnData = df.slice(-(recentDayValue + 1)) // +1 for calculation

            if (dayReturnData.length > 1) {
                const startValue = dayReturnData[0].Close
                const endValue = dayReturnData[dayReturnData.length - 1].Close
                return Math.round(100 * ((endValue - startValue) / startValue) * 100) / 100
            }
        } catch (error) {
            console.error(`Error in calculating recent day return for ${recentDayValue} days:`, error)
        }

        return 0
    }

    /**
     * Get recent week return percentage (Ported from Python helper.py)
     */
    getRecentWeekReturnPercentage(df, recentWeekValue) {
        if (!df || df.length === 0 || !recentWeekValue || recentWeekValue <= 0) {
            return 0
        }

        try {
            const uniqueWeeks = [...new Set(df.map((row) => row.MondayWeeklyDate))].sort()

            if (uniqueWeeks.length >= recentWeekValue) {
                const week_start = uniqueWeeks[uniqueWeeks.length - recentWeekValue]
                const weekData = df.filter((row) => row.MondayWeeklyDate >= week_start)

                if (weekData.length > 1) {
                    const startValue = weekData[0].Close
                    const endValue = weekData[weekData.length - 1].Close
                    return Math.round(100 * ((endValue - startValue) / startValue) * 100) / 100
                }
            }
        } catch (error) {
            console.error(`Error in calculating recent week return for ${recentWeekValue} weeks:`, error)
        }

        return 0
    }

    /**
     * Get recent month return percentage (Ported from Python helper.py)
     */
    getRecentMonthReturnPercentage(df, recentmonthValue) {
        if (!df || df.length === 0 || !recentmonthValue || recentmonthValue <= 0) {
            return 0
        }

        try {
            const endDate = new Date(Math.max(...df.map((row) => new Date(row.Date))))
            const yearValue = endDate.getFullYear()
            const monthValue = endDate.getMonth() + 1

            let startYear = yearValue
            let startMonth = monthValue - (recentmonthValue - 1)

            if (startMonth <= 0) {
                startYear -= 1
                startMonth = 12 + startMonth
            }

            const date_start = new Date(startYear, startMonth - 1, 1)

            const monthData = df.filter((row) => new Date(row.Date) >= date_start)

            if (monthData.length > 1) {
                const startValue = monthData[0].Close
                const endValue = monthData[monthData.length - 1].Close
                return Math.round(100 * ((endValue - startValue) / startValue) * 100) / 100
            }
        } catch (error) {
            console.error(`Error in calculating recent month return for ${recentmonthValue} months:`, error)
        }

        return 0
    }

    /**
     * Get election filter data frame (Ported from Python helper.py)
     */
    getElectionFilterDataFrame(typeName, df) {
        const currentYear = new Date().getFullYear()

        switch (typeName) {
            case 'All Years':
                return df
            case 'Current Year':
                return df.filter((row) => new Date(row.Date).getFullYear() === currentYear)
            default:
                return df // Default to all data for other cases
        }
    }

    /**
     * Get trending days analysis (Simplified version of Python helper.py getTrendingDays)
     */
    getTrendingDaysAnalysis(df, nTrades, opt, percentChange, nweek, nmonth, nyear) {
        if (!nTrades || nTrades === 0 || !percentChange) {
            return null
        }

        let consecutive_count = 0
        const result = {
            StartDate: [],
            StartClose: [],
            EndDate: [],
            EndClose: [],
            TotalDays: [],
            PercentChange: [],
            WeekDate: [],
            WeekClose: [],
            WeekPercent: [],
            MonthDate: [],
            MonthClose: [],
            MonthPercent: [],
            YearDate: [],
            YearClose: [],
            YearPercent: [],
        }

        let startDate = null
        let startClose = 0

        for (let i = 0; i < df.length; i++) {
            const row = df[i]
            const meetsCondition =
                opt === 'less' ? row.ReturnPercentage < percentChange : row.ReturnPercentage > percentChange

            if (meetsCondition) {
                consecutive_count += 1
                if (consecutive_count === 1) {
                    startDate = new Date(row.Date)
                    startClose = row.Close
                }
            } else {
                if (consecutive_count >= nTrades) {
                    const row_date = new Date(row.Date)
                    const pc = ((row.Close - startClose) / startClose) * 100

                    result['StartDate'].push(startDate)
                    result['StartClose'].push(startClose)
                    result['EndDate'].push(row_date)
                    result['EndClose'].push(row.Close)
                    result['TotalDays'].push(consecutive_count)
                    result['PercentChange'].push(pc)

                    // Add future date projections
                    result['WeekDate'].push(this.addWeeks(row_date, nweek))
                    result['MonthDate'].push(this.addMonths(row_date, nmonth))
                    result['YearDate'].push(this.addYears(row_date, nyear))
                }
                consecutive_count = 0
            }
        }

        return result
    }

    /**
     * Helper method to add weeks to a date
     */
    addWeeks(date, weeks) {
        const result = new Date(date)
        result.setDate(result.getDate() + weeks * 7)
        return result
    }

    /**
     * Helper method to add months to a date
     */
    addMonths(date, months) {
        const result = new Date(date)
        result.setMonth(result.getMonth() + months)
        return result
    }

    /**
     * Helper method to add years to a date
     */
    addYears(date, years) {
        const result = new Date(date)
        result.setFullYear(result.getFullYear() + years)
        return result
    }
}

module.exports = new StatisticalService()
