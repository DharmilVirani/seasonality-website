/**
 * Seasonality Analysis Service
 *
 * Migrated from Python system with enhanced capabilities
 * Handles multi-timeframe analysis, political cycles, and statistical calculations
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

class SeasonalityService {
    constructor() {
        this.timeFrameMap = {
            '1_Daily': 'DAILY',
            '2_MondayWeekly': 'MONDAY_WEEKLY',
            '3_ExpiryWeekly': 'EXPIRY_WEEKLY',
            '4_Monthly': 'MONTHLY',
            '5_Yearly': 'YEARLY',
        }
    }

    /**
     * Process raw seasonality data into multi-timeframe analysis
     * @param {Array} rawData - Raw CSV data with date, ticker, OHLCV
     * @returns {Promise<Object>} Processing results
     */
    async processSeasonalityData(rawData) {
        try {
            const results = {
                daily: [],
                weekly: [],
                monthly: [],
                yearly: [],
                patterns: [],
                statistics: {},
            }

            // Group data by ticker
            const tickerGroups = this.groupByTicker(rawData)

            for (const [ticker, data] of tickerGroups) {
                console.log(`Processing ${ticker} with ${data.length} records`)

                // Get ticker ID
                const tickerRecord = await prisma.ticker.upsert({
                    where: { symbol: ticker },
                    update: {},
                    create: { symbol: ticker },
                })

                // Process different timeframes (All Python equivalent processing)
                const dailyData = this.processDailyData(data, tickerRecord.id)
                const mondayWeeklyData = this.processWeeklyData(data, tickerRecord.id)
                const expiryWeeklyData = this.processExpiryWeeklyData(data, tickerRecord.id)
                const monthlyData = this.processMonthlyData(data, tickerRecord.id)
                const yearlyData = this.processYearlyData(data, tickerRecord.id)

                // Cross-reference data between timeframes (Python equivalent cross-referencing)
                const crossReferencedData = this.crossReferenceTimeframes({
                    daily: dailyData,
                    mondayWeekly: mondayWeeklyData,
                    expiryWeekly: expiryWeeklyData,
                    monthly: monthlyData,
                    yearly: yearlyData,
                })

                // Store in database (will be updated to new schema tables)
                await this.storeProcessedData([
                    ...crossReferencedData.daily,
                    ...crossReferencedData.mondayWeekly,
                    ...crossReferencedData.expiryWeekly,
                    ...crossReferencedData.monthly,
                    ...crossReferencedData.yearly,
                ])

                // Analyze patterns
                const patterns = await this.analyzeSeasonalityPatterns(tickerRecord.id)
                results.patterns.push(...patterns)

                results.daily.push(...dailyData)
                results.weekly.push(...weeklyData)
                results.monthly.push(...monthlyData)
                results.yearly.push(...yearlyData)
            }

            // Calculate overall statistics
            results.statistics = await this.calculateOverallStatistics()

            return results
        } catch (error) {
            console.error('Error in processSeasonalityData:', error)
            throw error
        }
    }

    /**
     * Group raw data by ticker symbol
     */
    groupByTicker(rawData) {
        const groups = new Map()

        rawData.forEach((record) => {
            const ticker = record.ticker
            if (!groups.has(ticker)) {
                groups.set(ticker, [])
            }
            groups.get(ticker).push(record)
        })

        // Sort each group by date
        for (const [ticker, data] of groups) {
            data.sort((a, b) => new Date(a.date) - new Date(b.date))
        }

        return groups
    }

    /**
     * Process daily data with enhanced calculations (Ported from Python GenerateFiles.py)
     */
    processDailyData(data, tickerId) {
        const processed = []

        // Sort data by date
        const sortedData = data.sort((a, b) => new Date(a.date) - new Date(b.date))

        for (let i = 0; i < sortedData.length; i++) {
            const record = sortedData[i]
            const prevRecord = i > 0 ? sortedData[i - 1] : null
            const date = new Date(record.date)

            // Calendar day calculations (Python equivalent: symbolDailyData['CalenderMonthDay'] = symbolDailyData['Date'].dt.day)
            const calendarMonthDay = date.getDate()
            const calendarYearDay = this.getDayOfYear(date)

            // Trading day calculations (Python equivalent: sequential trading days within month/year)
            const { tradingMonthDay, tradingYearDay } = this.calculateTradingDays(sortedData, i, date)

            // Even/Odd Classifications (Python equivalent: ((symbolDailyData['CalenderMonthDay'] % 2) == 0))
            const evenCalendarMonthDay = calendarMonthDay % 2 === 0
            const evenCalendarYearDay = calendarYearDay % 2 === 0
            const evenTradingMonthDay = tradingMonthDay ? tradingMonthDay % 2 === 0 : null
            const evenTradingYearDay = tradingYearDay ? tradingYearDay % 2 === 0 : null

            // Return Calculations (Python equivalent: ReturnPoints and ReturnPercentage)
            const returnPoints = prevRecord ? record.close - prevRecord.close : 0
            const returnPercentage = prevRecord ? Math.round((returnPoints / prevRecord.close) * 100) / 100 : 0
            const positiveDay = returnPoints > 0

            // Weekday (Python equivalent: symbolDailyData['Weekday'] = symbolDailyData['Date'].dt.day_name())
            const weekday = date.toLocaleDateString('en-US', { weekday: 'long' })

            // Monday Weekly calculations (Python equivalent: MondayWeeklyDate calculations)
            const mondayWeeklyDate = this.getMondayWeeklyDate(date)
            const expiryWeeklyDate = this.getExpiryWeeklyDate(date)

            // Cross-timeframe linkages will be populated after processing other timeframes
            const dailyRecord = {
                tickerId,
                date: date,
                open: record.open,
                high: record.high,
                low: record.low,
                close: record.close,
                volume: record.volume || 0,
                openInterest: record.openInterest || 0,
                weekday,

                // Calendar calculations
                calendarMonthDay,
                calendarYearDay,

                // Trading day calculations
                tradingMonthDay,
                tradingYearDay,

                // Even/Odd classifications
                evenCalendarMonthDay,
                evenCalendarYearDay,
                evenTradingMonthDay,
                evenTradingYearDay,

                // Return calculations
                returnPoints,
                returnPercentage,
                positiveDay,

                // Cross-timeframe linkages
                mondayWeeklyDate,
                expiryWeeklyDate,

                // Placeholders for cross-timeframe data (will be populated later)
                mondayWeekNumberMonthly: null,
                mondayWeekNumberYearly: null,
                evenMondayWeekNumberMonthly: null,
                evenMondayWeekNumberYearly: null,
                mondayWeeklyReturnPoints: null,
                mondayWeeklyReturnPercentage: null,
                positiveMondayWeek: null,

                expiryWeekNumberMonthly: null,
                expiryWeekNumberYearly: null,
                evenExpiryWeekNumberMonthly: null,
                evenExpiryWeekNumberYearly: null,
                expiryWeeklyReturnPoints: null,
                expiryWeeklyReturnPercentage: null,
                positiveExpiryWeek: null,

                evenMonth: null,
                monthlyReturnPoints: null,
                monthlyReturnPercentage: null,
                positiveMonth: null,

                evenYear: null,
                yearlyReturnPoints: null,
                yearlyReturnPercentage: null,
                positiveYear: null,
            }

            processed.push(dailyRecord)
        }

        return processed
    }

    /**
     * Process Monday weekly data (Ported from Python GenerateFiles.py)
     */
    processWeeklyData(data, tickerId) {
        const weeklyGroups = new Map()
        const processed = []

        // Group by Monday of each week (Python equivalent: symbolMondayWeeklyData.resample('W-SUN'))
        data.forEach((record) => {
            const date = new Date(record.date)
            const monday = this.getMonday(date)
            const mondayKey = monday.toISOString().split('T')[0]

            if (!weeklyGroups.has(mondayKey)) {
                weeklyGroups.set(mondayKey, [])
            }
            weeklyGroups.get(mondayKey).push(record)
        })

        // Sort weekly groups by date
        const sortedWeeks = Array.from(weeklyGroups.entries()).sort((a, b) => new Date(a[0]) - new Date(b[0]))

        let weekNumberMonthly = 0
        let weekNumberYearly = 0
        let prevMonth = null
        let prevYear = null

        // Process each week with Python equivalent logic
        for (const [weekKey, weekData] of sortedWeeks) {
            const monday = new Date(weekKey)

            // Week numbering logic (Python equivalent: sequential week numbering)
            if (prevMonth === null || monday.getMonth() !== prevMonth) {
                weekNumberMonthly = 1
            } else {
                weekNumberMonthly += 1
            }

            if (prevYear === null || monday.getFullYear() !== prevYear) {
                weekNumberYearly = 1
            } else {
                weekNumberYearly += 1
            }

            prevMonth = monday.getMonth()
            prevYear = monday.getFullYear()

            // Even/Odd classifications (Python equivalent: ((symbolMondayWeeklyData['WeekNumberMonthly'] % 2) == 0))
            const evenWeekNumberMonthly = weekNumberMonthly % 2 === 0
            const evenWeekNumberYearly = weekNumberYearly % 2 === 0

            // Aggregate OHLCV data using Python columnLogic
            const aggregated = this.aggregateTimeframeDataPython(weekData)

            // Return calculations (Python equivalent: ReturnPoints and ReturnPercentage)
            const prevWeekData = processed.length > 0 ? processed[processed.length - 1] : null
            const returnPoints = prevWeekData ? aggregated.close - prevWeekData.close : 0
            const returnPercentage = prevWeekData ? Math.round((returnPoints / prevWeekData.close) * 100) / 100 : 0
            const positiveWeek = returnPoints > 0

            const weekday = monday.toLocaleDateString('en-US', { weekday: 'long' })

            processed.push({
                tickerId,
                date: monday,

                // OHLCV data (Python columnLogic equivalent)
                open: aggregated.open,
                high: aggregated.high,
                low: aggregated.low,
                close: aggregated.close,
                volume: aggregated.volume,
                openInterest: aggregated.openInterest,
                weekday,

                // Week numbering
                weekNumberMonthly,
                weekNumberYearly,
                evenWeekNumberMonthly,
                evenWeekNumberYearly,

                // Return calculations
                returnPoints,
                returnPercentage,
                positiveWeek,

                // Monthly/Yearly integration (will be populated later)
                evenMonth: null,
                monthlyReturnPoints: null,
                monthlyReturnPercentage: null,
                positiveMonth: null,

                evenYear: null,
                yearlyReturnPoints: null,
                yearlyReturnPercentage: null,
                positiveYear: null,
            })
        }

        return processed
    }

    /**
     * Process monthly data (Ported from Python GenerateFiles.py)
     */
    processMonthlyData(data, tickerId) {
        const monthlyGroups = new Map()
        const processed = []

        // Group by month (Python equivalent: symbolMonthlyData.resample('M'))
        data.forEach((record) => {
            const date = new Date(record.date)
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

            if (!monthlyGroups.has(monthKey)) {
                monthlyGroups.set(monthKey, [])
            }
            monthlyGroups.get(monthKey).push(record)
        })

        // Sort monthly groups by date
        const sortedMonths = Array.from(monthlyGroups.entries()).sort(
            (a, b) => new Date(a[0] + '-01') - new Date(b[0] + '-01')
        )

        // Process each month with Python equivalent logic
        for (const [monthKey, monthData] of sortedMonths) {
            const monthDate = new Date(monthKey + '-01')

            // Even/Odd classifications (Python equivalent: ((symbolMonthlyData['Date'].dt.month % 2) == 0))
            const evenMonth = monthDate.getMonth() % 2 === 0

            // Aggregate OHLCV data using Python columnLogic
            const aggregated = this.aggregateTimeframeDataPython(monthData)

            // Return calculations (Python equivalent: ReturnPoints and ReturnPercentage)
            const prevMonthData = processed.length > 0 ? processed[processed.length - 1] : null
            const returnPoints = prevMonthData ? aggregated.close - prevMonthData.close : 0
            const returnPercentage = prevMonthData ? Math.round((returnPoints / prevMonthData.close) * 100) / 100 : 0
            const positiveMonth = returnPoints > 0

            const weekday = monthDate.toLocaleDateString('en-US', { weekday: 'long' })

            processed.push({
                tickerId,
                date: monthDate,

                // OHLCV data (Python columnLogic equivalent)
                open: aggregated.open,
                high: aggregated.high,
                low: aggregated.low,
                close: aggregated.close,
                volume: aggregated.volume,
                openInterest: aggregated.openInterest,
                weekday,

                // Even/Odd classifications
                evenMonth,

                // Return calculations
                returnPoints,
                returnPercentage,
                positiveMonth,

                // Yearly integration (will be populated later)
                evenYear: null,
                yearlyReturnPoints: null,
                yearlyReturnPercentage: null,
                positiveYear: null,
            })
        }

        return processed
    }

    /**
     * Process yearly data (Ported from Python GenerateFiles.py)
     */
    processYearlyData(data, tickerId) {
        const yearlyGroups = new Map()
        const processed = []

        // Group by year (Python equivalent: symbolYearlyData.resample('Y'))
        data.forEach((record) => {
            const date = new Date(record.date)
            const yearKey = date.getFullYear().toString()

            if (!yearlyGroups.has(yearKey)) {
                yearlyGroups.set(yearKey, [])
            }
            yearlyGroups.get(yearKey).push(record)
        })

        // Sort yearly groups by date
        const sortedYears = Array.from(yearlyGroups.entries()).sort(
            (a, b) => new Date(a[0] + '-01-01') - new Date(b[0] + '-01-01')
        )

        // Process each year with Python equivalent logic
        for (const [yearKey, yearData] of sortedYears) {
            const yearDate = new Date(yearKey + '-01-01')

            // Even/Odd classifications (Python equivalent: ((symbolYearlyData['Date'].dt.year % 2) == 0))
            const evenYear = yearDate.getFullYear() % 2 === 0

            // Aggregate OHLCV data using Python columnLogic
            const aggregated = this.aggregateTimeframeDataPython(yearData)

            // Return calculations (Python equivalent: ReturnPoints and ReturnPercentage)
            const prevYearData = processed.length > 0 ? processed[processed.length - 1] : null
            const returnPoints = prevYearData ? aggregated.close - prevYearData.close : 0
            const returnPercentage = prevYearData ? Math.round((returnPoints / prevYearData.close) * 100) / 100 : 0
            const positiveYear = returnPoints > 0

            const weekday = yearDate.toLocaleDateString('en-US', { weekday: 'long' })

            processed.push({
                tickerId,
                date: yearDate,

                // OHLCV data (Python columnLogic equivalent)
                open: aggregated.open,
                high: aggregated.high,
                low: aggregated.low,
                close: aggregated.close,
                volume: aggregated.volume,
                openInterest: aggregated.openInterest,
                weekday,

                // Even/Odd classifications
                evenYear,

                // Return calculations
                returnPoints,
                returnPercentage,
                positiveYear,
            })
        }

        return processed
    }

    /**
     * Process expiry weekly data (Ported from Python GenerateFiles.py)
     */
    processExpiryWeeklyData(data, tickerId) {
        const weeklyGroups = new Map()
        const processed = []

        // Group by Thursday expiry week (Python equivalent: symbolExpiryWeeklyData.resample('W-THU'))
        data.forEach((record) => {
            const date = new Date(record.date)
            const expiryThursday = this.getExpiryWeeklyDate(date)
            const expiryKey = expiryThursday.toISOString().split('T')[0]

            if (!weeklyGroups.has(expiryKey)) {
                weeklyGroups.set(expiryKey, [])
            }
            weeklyGroups.get(expiryKey).push(record)
        })

        // Sort weekly groups by date
        const sortedWeeks = Array.from(weeklyGroups.entries()).sort((a, b) => new Date(a[0]) - new Date(b[0]))

        let weekNumberMonthly = 0
        let weekNumberYearly = 0
        let prevMonth = null
        let prevYear = null

        // Process each week with Python equivalent logic
        for (const [weekKey, weekData] of sortedWeeks) {
            const expiryThursday = new Date(weekKey)

            // Week numbering logic (Python equivalent: sequential week numbering)
            if (prevMonth === null || expiryThursday.getMonth() !== prevMonth) {
                weekNumberMonthly = 1
            } else {
                weekNumberMonthly += 1
            }

            if (prevYear === null || expiryThursday.getFullYear() !== prevYear) {
                weekNumberYearly = 1
            } else {
                weekNumberYearly += 1
            }

            prevMonth = expiryThursday.getMonth()
            prevYear = expiryThursday.getFullYear()

            // Even/Odd classifications (Python equivalent: ((symbolExpiryWeeklyData['WeekNumberMonthly'] % 2) == 0))
            const evenWeekNumberMonthly = weekNumberMonthly % 2 === 0
            const evenWeekNumberYearly = weekNumberYearly % 2 === 0

            // Calculate start date (Python equivalent: symbolExpiryWeeklyData['StartDate'])
            const startDate = new Date(expiryThursday)
            startDate.setDate(expiryThursday.getDate() - 6) // Week before Thursday

            // Aggregate OHLCV data using Python columnLogic
            const aggregated = this.aggregateTimeframeDataPython(weekData)

            // Return calculations (Python equivalent: ReturnPoints and ReturnPercentage)
            const prevWeekData = processed.length > 0 ? processed[processed.length - 1] : null
            const returnPoints = prevWeekData ? aggregated.close - prevWeekData.close : 0
            const returnPercentage = prevWeekData ? Math.round((returnPoints / prevWeekData.close) * 100) / 100 : 0
            const positiveWeek = returnPoints > 0

            const weekday = expiryThursday.toLocaleDateString('en-US', { weekday: 'long' })

            processed.push({
                tickerId,
                date: expiryThursday,
                startDate,

                // OHLCV data (Python columnLogic equivalent)
                open: aggregated.open,
                high: aggregated.high,
                low: aggregated.low,
                close: aggregated.close,
                volume: aggregated.volume,
                openInterest: aggregated.openInterest,
                weekday,

                // Week numbering
                weekNumberMonthly,
                weekNumberYearly,
                evenWeekNumberMonthly,
                evenWeekNumberYearly,

                // Return calculations
                returnPoints,
                returnPercentage,
                positiveWeek,

                // Monthly/Yearly integration (will be populated later)
                evenMonth: null,
                monthlyReturnPoints: null,
                monthlyReturnPercentage: null,
                positiveMonth: null,

                evenYear: null,
                yearlyReturnPoints: null,
                yearlyReturnPercentage: null,
                positiveYear: null,
            })
        }

        return processed
    }

    /**
     * Aggregate data using exact Python columnLogic (Ported from GenerateFiles.py)
     */
    aggregateTimeframeDataPython(timeframeData) {
        if (timeframeData.length === 0) {
            return {
                open: 0,
                high: 0,
                low: 0,
                close: 0,
                volume: 0,
                openInterest: 0,
            }
        }

        const sortedData = timeframeData.sort((a, b) => new Date(a.date) - new Date(b.date))

        // Python columnLogic equivalent:
        // 'Ticker': 'first', 'Open': 'first', 'High': 'max', 'Low': 'min',
        // 'Close': 'last', 'Volume': 'sum', 'OpenInterest': 'last', 'Weekday': 'first'
        return {
            open: sortedData[0].open,
            high: Math.max(...sortedData.map((d) => d.high)),
            low: Math.min(...sortedData.map((d) => d.low)),
            close: sortedData[sortedData.length - 1].close,
            volume: sortedData.reduce((sum, d) => sum + (d.volume || 0), 0),
            openInterest: sortedData[sortedData.length - 1].openInterest || 0,
        }
    }

    /**
     * Aggregate data for a timeframe (OHLCV calculations)
     */
    aggregateTimeframeData(timeframeData, timeFrame) {
        if (timeframeData.length === 0) {
            return {
                open: 0,
                high: 0,
                low: 0,
                close: 0,
                volume: 0,
                openInterest: 0,
                returns: 0,
                volatility: 0,
            }
        }

        const sortedData = timeframeData.sort((a, b) => new Date(a.date) - new Date(b.date))

        const open = sortedData[0].open
        const close = sortedData[sortedData.length - 1].close
        const high = Math.max(...sortedData.map((d) => d.high))
        const low = Math.min(...sortedData.map((d) => d.low))
        const volume = sortedData.reduce((sum, d) => sum + (d.volume || 0), 0)
        const openInterest = sortedData.reduce((sum, d) => sum + (d.openInterest || 0), 0)

        // Calculate returns
        const returns = sortedData.length > 1 ? ((close - open) / open) * 100 : 0

        // Calculate volatility for this timeframe
        const volatility = this.calculateVolatilityForPeriod(sortedData)

        return {
            timeFrame,
            open,
            high,
            low,
            close,
            volume,
            openInterest,
            returns,
            volatility,
        }
    }

    /**
     * Calculate volatility for a specific period
     */
    calculateVolatilityForPeriod(periodData) {
        if (periodData.length < 2) return 0

        const returns = []
        for (let i = 1; i < periodData.length; i++) {
            const ret = ((periodData[i].close - periodData[i - 1].close) / periodData[i - 1].close) * 100
            returns.push(ret)
        }

        if (returns.length === 0) return 0

        const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length
        const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length

        return Math.sqrt(variance)
    }

    /**
     * Calculate volatility using rolling window
     */
    calculateVolatility(data, currentIndex, windowSize) {
        const start = Math.max(0, currentIndex - windowSize + 1)
        const periodData = data.slice(start, currentIndex + 1)

        return this.calculateVolatilityForPeriod(periodData)
    }

    /**
     * Calculate seasonality components from date
     */
    calculateSeasonalityComponents(date) {
        return {
            monthOfYear: date.getMonth() + 1, // 1-12
            dayOfWeek: date.getDay(), // 0-6 (Sunday = 0)
            weekOfYear: this.getWeekNumber(date), // 1-52
            quarter: Math.ceil((date.getMonth() + 1) / 3), // 1-4
        }
    }

    /**
     * Get Monday of the week for a given date
     */
    getMonday(date) {
        const day = date.getDay()
        const diff = date.getDate() - day + (day === 0 ? -6 : 1) // Adjust when day is Sunday
        const monday = new Date(date.setDate(diff))
        monday.setHours(0, 0, 0, 0)
        return monday
    }

    /**
     * Get week number in year
     */
    getWeekNumber(date) {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
        const dayNum = d.getUTCDay() || 7
        d.setUTCDate(d.getUTCDate() + 4 - dayNum)
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
        return Math.ceil(((d - yearStart) / 86400000 + 1) / 7)
    }

    /**
     * Get day of year (1-366) - Python equivalent: symbolDailyData['CalenderYearDay'] = symbolDailyData['Date'].dt.dayofyear
     */
    getDayOfYear(date) {
        const start = new Date(date.getFullYear(), 0, 0)
        const diff = date - start
        return Math.floor(diff / 86400000)
    }

    /**
     * Calculate trading days (sequential trading days within month/year) - Python equivalent logic
     */
    calculateTradingDays(sortedData, currentIndex, currentDate) {
        let tradingMonthDay = 1
        let tradingYearDay = 1

        if (currentIndex > 0) {
            const prevDate = new Date(sortedData[currentIndex - 1].date)

            // Check if we're in a new month
            if (
                currentDate.getMonth() === prevDate.getMonth() &&
                currentDate.getFullYear() === prevDate.getFullYear()
            ) {
                tradingMonthDay = sortedData[currentIndex - 1].tradingMonthDay + 1
            }

            // Check if we're in a new year
            if (currentDate.getFullYear() === prevDate.getFullYear()) {
                tradingYearDay = sortedData[currentIndex - 1].tradingYearDay + 1
            }
        }

        return { tradingMonthDay, tradingYearDay }
    }

    /**
     * Get Monday weekly date (backdate to Monday) - Python equivalent: x - pd.tseries.frequencies.to_offset(str(x.weekday()) + 'D')
     */
    getMondayWeeklyDate(date) {
        const day = date.getDay()
        const monday = new Date(date)
        monday.setDate(date.getDate() - day + (day === 0 ? -6 : 1))
        monday.setHours(0, 0, 0, 0)
        return monday
    }

    /**
     * Get expiry weekly date (forward to Thursday) - Python equivalent complex logic
     */
    getExpiryWeeklyDate(date) {
        const day = date.getDay()
        const expiry = new Date(date)

        if (day === 4) {
            // Thursday
            expiry.setDate(date.getDate() + 6) // Next Thursday
        } else {
            const daysUntilThursday = (4 - day + 7) % 7
            expiry.setDate(date.getDate() + daysUntilThursday)
        }

        expiry.setHours(0, 0, 0, 0)
        return expiry
    }

    /**
     * Store processed data in enhanced database schema
     */
    async storeProcessedData(processedData) {
        if (processedData.length === 0) return

        try {
            // Group data by timeframe
            const timeframeGroups = {
                DAILY: [],
                MONDAY_WEEKLY: [],
                EXPIRY_WEEKLY: [],
                MONTHLY: [],
                YEARLY: [],
            }

            processedData.forEach((data) => {
                const timeframe = data.timeFrame || 'DAILY'
                if (timeframeGroups[timeframe]) {
                    timeframeGroups[timeframe].push(data)
                }
            })

            // Store each timeframe in its respective table
            await Promise.all([
                this.storeDailyData(timeframeGroups.DAILY),
                this.storeMondayWeeklyData(timeframeGroups.MONDAY_WEEKLY),
                this.storeExpiryWeeklyData(timeframeGroups.EXPIRY_WEEKLY),
                this.storeMonthlyData(timeframeGroups.MONTHLY),
                this.storeYearlyData(timeframeGroups.YEARLY),
            ])

            console.log(`Stored processed data: ${Object.values(timeframeGroups).flat().length} records`)
        } catch (error) {
            console.error('Error storing processed data:', error)
            throw error
        }
    }

    /**
     * Store daily data in DailySeasonalityData table
     */
    async storeDailyData(dailyData) {
        if (dailyData.length === 0) return

        const batchSize = 500
        for (let i = 0; i < dailyData.length; i += batchSize) {
            const batch = dailyData.slice(i, i + batchSize)

            await prisma.$transaction(
                batch.map((data) =>
                    prisma.dailySeasonalityData.upsert({
                        where: {
                            tickerId_date: {
                                tickerId: data.tickerId,
                                date: new Date(data.processedDate || data.date),
                            },
                        },
                        update: {
                            open: data.open,
                            high: data.high,
                            low: data.low,
                            close: data.close,
                            volume: data.volume || 0,
                            openInterest: data.openInterest || 0,
                            weekday: data.weekday,
                            calendarMonthDay: data.calendarMonthDay,
                            calendarYearDay: data.calendarYearDay,
                            tradingMonthDay: data.tradingMonthDay,
                            tradingYearDay: data.tradingYearDay,
                            evenCalendarMonthDay: data.evenCalendarMonthDay,
                            evenCalendarYearDay: data.evenCalendarYearDay,
                            evenTradingMonthDay: data.evenTradingMonthDay,
                            evenTradingYearDay: data.evenTradingYearDay,
                            returnPoints: data.returnPoints,
                            returnPercentage: data.returnPercentage,
                            positiveDay: data.positiveDay,
                            mondayWeeklyDate: data.mondayWeeklyDate,
                            expiryWeeklyDate: data.expiryWeeklyDate,
                            mondayWeekNumberMonthly: data.mondayWeekNumberMonthly,
                            mondayWeekNumberYearly: data.mondayWeekNumberYearly,
                            evenMondayWeekNumberMonthly: data.evenMondayWeekNumberMonthly,
                            evenMondayWeekNumberYearly: data.evenMondayWeekNumberYearly,
                            mondayWeeklyReturnPoints: data.mondayWeeklyReturnPoints,
                            mondayWeeklyReturnPercentage: data.mondayWeeklyReturnPercentage,
                            positiveMondayWeek: data.positiveMondayWeek,
                            expiryWeekNumberMonthly: data.expiryWeekNumberMonthly,
                            expiryWeekNumberYearly: data.expiryWeekNumberYearly,
                            evenExpiryWeekNumberMonthly: data.evenExpiryWeekNumberMonthly,
                            evenExpiryWeekNumberYearly: data.evenExpiryWeekNumberYearly,
                            expiryWeeklyReturnPoints: data.expiryWeeklyReturnPoints,
                            expiryWeeklyReturnPercentage: data.expiryWeeklyReturnPercentage,
                            positiveExpiryWeek: data.positiveExpiryWeek,
                            evenMonth: data.evenMonth,
                            monthlyReturnPoints: data.monthlyReturnPoints,
                            monthlyReturnPercentage: data.monthlyReturnPercentage,
                            positiveMonth: data.positiveMonth,
                            evenYear: data.evenYear,
                            yearlyReturnPoints: data.yearlyReturnPoints,
                            yearlyReturnPercentage: data.yearlyReturnPercentage,
                            positiveYear: data.positiveYear,
                        },
                        create: {
                            tickerId: data.tickerId,
                            date: new Date(data.processedDate || data.date),
                            open: data.open,
                            high: data.high,
                            low: data.low,
                            close: data.close,
                            volume: data.volume || 0,
                            openInterest: data.openInterest || 0,
                            weekday: data.weekday,
                            calendarMonthDay: data.calendarMonthDay,
                            calendarYearDay: data.calendarYearDay,
                            tradingMonthDay: data.tradingMonthDay,
                            tradingYearDay: data.tradingYearDay,
                            evenCalendarMonthDay: data.evenCalendarMonthDay,
                            evenCalendarYearDay: data.evenCalendarYearDay,
                            evenTradingMonthDay: data.evenTradingMonthDay,
                            evenTradingYearDay: data.evenTradingYearDay,
                            returnPoints: data.returnPoints,
                            returnPercentage: data.returnPercentage,
                            positiveDay: data.positiveDay,
                            mondayWeeklyDate: data.mondayWeeklyDate,
                            expiryWeeklyDate: data.expiryWeeklyDate,
                            mondayWeekNumberMonthly: data.mondayWeekNumberMonthly,
                            mondayWeekNumberYearly: data.mondayWeekNumberYearly,
                            evenMondayWeekNumberMonthly: data.evenMondayWeekNumberMonthly,
                            evenMondayWeekNumberYearly: data.evenMondayWeekNumberYearly,
                            mondayWeeklyReturnPoints: data.mondayWeeklyReturnPoints,
                            mondayWeeklyReturnPercentage: data.mondayWeeklyReturnPercentage,
                            positiveMondayWeek: data.positiveMondayWeek,
                            expiryWeekNumberMonthly: data.expiryWeekNumberMonthly,
                            expiryWeekNumberYearly: data.expiryWeekNumberYearly,
                            evenExpiryWeekNumberMonthly: data.evenExpiryWeekNumberMonthly,
                            evenExpiryWeekNumberYearly: data.evenExpiryWeekNumberYearly,
                            expiryWeeklyReturnPoints: data.expiryWeeklyReturnPoints,
                            expiryWeeklyReturnPercentage: data.expiryWeeklyReturnPercentage,
                            positiveExpiryWeek: data.positiveExpiryWeek,
                            evenMonth: data.evenMonth,
                            monthlyReturnPoints: data.monthlyReturnPoints,
                            monthlyReturnPercentage: data.monthlyReturnPercentage,
                            positiveMonth: data.positiveMonth,
                            evenYear: data.evenYear,
                            yearlyReturnPoints: data.yearlyReturnPoints,
                            yearlyReturnPercentage: data.yearlyReturnPercentage,
                            positiveYear: data.positiveYear,
                        },
                    })
                )
            )
        }
    }

    /**
     * Store Monday weekly data
     */
    async storeMondayWeeklyData(weeklyData) {
        if (weeklyData.length === 0) return

        const batchSize = 500
        for (let i = 0; i < weeklyData.length; i += batchSize) {
            const batch = weeklyData.slice(i, i + batchSize)

            await prisma.$transaction(
                batch.map((data) =>
                    prisma.mondayWeeklySeasonalityData.upsert({
                        where: {
                            tickerId_date: {
                                tickerId: data.tickerId,
                                date: new Date(data.processedDate || data.date),
                            },
                        },
                        update: {
                            open: data.open,
                            high: data.high,
                            low: data.low,
                            close: data.close,
                            volume: data.volume || 0,
                            openInterest: data.openInterest || 0,
                            weekday: data.weekday,
                            weekNumberMonthly: data.weekNumberMonthly,
                            weekNumberYearly: data.weekNumberYearly,
                            evenWeekNumberMonthly: data.evenWeekNumberMonthly,
                            evenWeekNumberYearly: data.evenWeekNumberYearly,
                            returnPoints: data.returnPoints,
                            returnPercentage: data.returnPercentage,
                            positiveWeek: data.positiveWeek,
                            evenMonth: data.evenMonth,
                            monthlyReturnPoints: data.monthlyReturnPoints,
                            monthlyReturnPercentage: data.monthlyReturnPercentage,
                            positiveMonth: data.positiveMonth,
                            evenYear: data.evenYear,
                            yearlyReturnPoints: data.yearlyReturnPoints,
                            yearlyReturnPercentage: data.yearlyReturnPercentage,
                            positiveYear: data.positiveYear,
                        },
                        create: {
                            tickerId: data.tickerId,
                            date: new Date(data.processedDate || data.date),
                            open: data.open,
                            high: data.high,
                            low: data.low,
                            close: data.close,
                            volume: data.volume || 0,
                            openInterest: data.openInterest || 0,
                            weekday: data.weekday,
                            weekNumberMonthly: data.weekNumberMonthly,
                            weekNumberYearly: data.weekNumberYearly,
                            evenWeekNumberMonthly: data.evenWeekNumberMonthly,
                            evenWeekNumberYearly: data.evenWeekNumberYearly,
                            returnPoints: data.returnPoints,
                            returnPercentage: data.returnPercentage,
                            positiveWeek: data.positiveWeek,
                            evenMonth: data.evenMonth,
                            monthlyReturnPoints: data.monthlyReturnPoints,
                            monthlyReturnPercentage: data.monthlyReturnPercentage,
                            positiveMonth: data.positiveMonth,
                            evenYear: data.evenYear,
                            yearlyReturnPoints: data.yearlyReturnPoints,
                            yearlyReturnPercentage: data.yearlyReturnPercentage,
                            positiveYear: data.positiveYear,
                        },
                    })
                )
            )
        }
    }

    /**
     * Store expiry weekly data
     */
    async storeExpiryWeeklyData(expiryData) {
        if (expiryData.length === 0) return

        const batchSize = 500
        for (let i = 0; i < expiryData.length; i += batchSize) {
            const batch = expiryData.slice(i, i + batchSize)

            await prisma.$transaction(
                batch.map((data) =>
                    prisma.expiryWeeklySeasonalityData.upsert({
                        where: {
                            tickerId_date: {
                                tickerId: data.tickerId,
                                date: new Date(data.processedDate || data.date),
                            },
                        },
                        update: {
                            startDate: data.startDate,
                            open: data.open,
                            high: data.high,
                            low: data.low,
                            close: data.close,
                            volume: data.volume || 0,
                            openInterest: data.openInterest || 0,
                            weekday: data.weekday,
                            weekNumberMonthly: data.weekNumberMonthly,
                            weekNumberYearly: data.weekNumberYearly,
                            evenWeekNumberMonthly: data.evenWeekNumberMonthly,
                            evenWeekNumberYearly: data.evenWeekNumberYearly,
                            returnPoints: data.returnPoints,
                            returnPercentage: data.returnPercentage,
                            positiveWeek: data.positiveWeek,
                            evenMonth: data.evenMonth,
                            monthlyReturnPoints: data.monthlyReturnPoints,
                            monthlyReturnPercentage: data.monthlyReturnPercentage,
                            positiveMonth: data.positiveMonth,
                            evenYear: data.evenYear,
                            yearlyReturnPoints: data.yearlyReturnPoints,
                            yearlyReturnPercentage: data.yearlyReturnPercentage,
                            positiveYear: data.positiveYear,
                        },
                        create: {
                            tickerId: data.tickerId,
                            date: new Date(data.processedDate || data.date),
                            startDate: data.startDate,
                            open: data.open,
                            high: data.high,
                            low: data.low,
                            close: data.close,
                            volume: data.volume || 0,
                            openInterest: data.openInterest || 0,
                            weekday: data.weekday,
                            weekNumberMonthly: data.weekNumberMonthly,
                            weekNumberYearly: data.weekNumberYearly,
                            evenWeekNumberMonthly: data.evenWeekNumberMonthly,
                            evenWeekNumberYearly: data.evenWeekNumberYearly,
                            returnPoints: data.returnPoints,
                            returnPercentage: data.returnPercentage,
                            positiveWeek: data.positiveWeek,
                            evenMonth: data.evenMonth,
                            monthlyReturnPoints: data.monthlyReturnPoints,
                            monthlyReturnPercentage: data.monthlyReturnPercentage,
                            positiveMonth: data.positiveMonth,
                            evenYear: data.evenYear,
                            yearlyReturnPoints: data.yearlyReturnPoints,
                            yearlyReturnPercentage: data.yearlyReturnPercentage,
                            positiveYear: data.positiveYear,
                        },
                    })
                )
            )
        }
    }

    /**
     * Store monthly data
     */
    async storeMonthlyData(monthlyData) {
        if (monthlyData.length === 0) return

        const batchSize = 500
        for (let i = 0; i < monthlyData.length; i += batchSize) {
            const batch = monthlyData.slice(i, i + batchSize)

            await prisma.$transaction(
                batch.map((data) =>
                    prisma.monthlySeasonalityData.upsert({
                        where: {
                            tickerId_date: {
                                tickerId: data.tickerId,
                                date: new Date(data.processedDate || data.date),
                            },
                        },
                        update: {
                            open: data.open,
                            high: data.high,
                            low: data.low,
                            close: data.close,
                            volume: data.volume || 0,
                            openInterest: data.openInterest || 0,
                            weekday: data.weekday,
                            evenMonth: data.evenMonth,
                            returnPoints: data.returnPoints,
                            returnPercentage: data.returnPercentage,
                            positiveMonth: data.positiveMonth,
                            evenYear: data.evenYear,
                            yearlyReturnPoints: data.yearlyReturnPoints,
                            yearlyReturnPercentage: data.yearlyReturnPercentage,
                            positiveYear: data.positiveYear,
                        },
                        create: {
                            tickerId: data.tickerId,
                            date: new Date(data.processedDate || data.date),
                            open: data.open,
                            high: data.high,
                            low: data.low,
                            close: data.close,
                            volume: data.volume || 0,
                            openInterest: data.openInterest || 0,
                            weekday: data.weekday,
                            evenMonth: data.evenMonth,
                            returnPoints: data.returnPoints,
                            returnPercentage: data.returnPercentage,
                            positiveMonth: data.positiveMonth,
                            evenYear: data.evenYear,
                            yearlyReturnPoints: data.yearlyReturnPoints,
                            yearlyReturnPercentage: data.yearlyReturnPercentage,
                            positiveYear: data.positiveYear,
                        },
                    })
                )
            )
        }
    }

    /**
     * Store yearly data
     */
    async storeYearlyData(yearlyData) {
        if (yearlyData.length === 0) return

        const batchSize = 500
        for (let i = 0; i < yearlyData.length; i += batchSize) {
            const batch = yearlyData.slice(i, i + batchSize)

            await prisma.$transaction(
                batch.map((data) =>
                    prisma.yearlySeasonalityData.upsert({
                        where: {
                            tickerId_date: {
                                tickerId: data.tickerId,
                                date: new Date(data.processedDate || data.date),
                            },
                        },
                        update: {
                            open: data.open,
                            high: data.high,
                            low: data.low,
                            close: data.close,
                            volume: data.volume || 0,
                            openInterest: data.openInterest || 0,
                            weekday: data.weekday,
                            evenYear: data.evenYear,
                            returnPoints: data.returnPoints,
                            returnPercentage: data.returnPercentage,
                            positiveYear: data.positiveYear,
                        },
                        create: {
                            tickerId: data.tickerId,
                            date: new Date(data.processedDate || data.date),
                            open: data.open,
                            high: data.high,
                            low: data.low,
                            close: data.close,
                            volume: data.volume || 0,
                            openInterest: data.openInterest || 0,
                            weekday: data.weekday,
                            evenYear: data.evenYear,
                            returnPoints: data.returnPoints,
                            returnPercentage: data.returnPercentage,
                            positiveYear: data.positiveYear,
                        },
                    })
                )
            )
        }
    }

    /**
     * Analyze seasonality patterns for a ticker
     */
    async analyzeSeasonalityPatterns(tickerId) {
        const patterns = []

        try {
            // Monthly seasonality patterns
            const monthlyPatterns = await this.calculateMonthlyPatterns(tickerId)
            patterns.push(...monthlyPatterns)

            // Weekly seasonality patterns
            const weeklyPatterns = await this.calculateWeeklyPatterns(tickerId)
            patterns.push(...weeklyPatterns)

            // Quarterly patterns
            const quarterlyPatterns = await this.calculateQuarterlyPatterns(tickerId)
            patterns.push(...quarterlyPatterns)

            // Store patterns in database
            if (patterns.length > 0) {
                await prisma.$transaction(
                    patterns.map((pattern) =>
                        prisma.seasonalityPattern.upsert({
                            where: {
                                tickerId_timeFrame_patternType_period: {
                                    tickerId: pattern.tickerId,
                                    timeFrame: pattern.timeFrame,
                                    patternType: pattern.patternType,
                                    period: pattern.period,
                                },
                            },
                            update: {
                                avgReturn: pattern.avgReturn,
                                volatility: pattern.volatility,
                                winRate: pattern.winRate,
                                maxGain: pattern.maxGain,
                                maxLoss: pattern.maxLoss,
                                sampleSize: pattern.sampleSize,
                                confidence: pattern.confidence,
                                significance: pattern.significance,
                            },
                            create: pattern,
                        })
                    )
                )
            }

            return patterns
        } catch (error) {
            console.error('Error analyzing seasonality patterns:', error)
            throw error
        }
    }

    /**
     * Calculate monthly seasonality patterns
     */
    async calculateMonthlyPatterns(tickerId) {
        const monthlyData = await prisma.processedData.findMany({
            where: {
                tickerId,
                timeFrame: 'DAILY',
                monthOfYear: { not: null },
            },
            orderBy: { originalDate: 'asc' },
        })

        const patterns = []
        const monthGroups = new Map()

        // Group by month
        monthlyData.forEach((record) => {
            const month = record.monthOfYear
            if (!monthGroups.has(month)) {
                monthGroups.set(month, [])
            }
            monthGroups.get(month).push(record)
        })

        // Calculate patterns for each month
        for (const [month, records] of monthGroups) {
            if (records.length < 5) continue // Minimum sample size

            const returns = records.map((r) => r.returns || 0)
            const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length
            const volatility = this.calculateStandardDeviation(returns)
            const positiveReturns = returns.filter((r) => r > 0).length
            const winRate = positiveReturns / returns.length
            const maxGain = Math.max(...returns)
            const maxLoss = Math.min(...returns)

            // Calculate statistical significance (simplified)
            const confidence = Math.min(1, records.length / 30) // More data = higher confidence
            const significance = Math.abs(avgReturn) / (volatility / Math.sqrt(records.length))

            patterns.push({
                tickerId,
                timeFrame: 'DAILY',
                patternType: 'MONTHLY_SEASONAL',
                period: month,
                avgReturn,
                volatility,
                winRate,
                maxGain,
                maxLoss,
                sampleSize: records.length,
                confidence,
                significance,
                analysisDate: new Date(),
                dataRangeStart: records[0].originalDate,
                dataRangeEnd: records[records.length - 1].originalDate,
            })
        }

        return patterns
    }

    /**
     * Calculate weekly seasonality patterns
     */
    async calculateWeeklyPatterns(tickerId) {
        const weeklyData = await prisma.processedData.findMany({
            where: {
                tickerId,
                timeFrame: 'DAILY',
                dayOfWeek: { not: null },
            },
            orderBy: { originalDate: 'asc' },
        })

        const patterns = []
        const dayGroups = new Map()

        // Group by day of week
        weeklyData.forEach((record) => {
            const dayOfWeek = record.dayOfWeek
            if (!dayGroups.has(dayOfWeek)) {
                dayGroups.set(dayOfWeek, [])
            }
            dayGroups.get(dayOfWeek).push(record)
        })

        // Calculate patterns for each day
        for (const [dayOfWeek, records] of dayGroups) {
            if (records.length < 10) continue // Minimum sample size

            const returns = records.map((r) => r.returns || 0)
            const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length
            const volatility = this.calculateStandardDeviation(returns)
            const positiveReturns = returns.filter((r) => r > 0).length
            const winRate = positiveReturns / returns.length
            const maxGain = Math.max(...returns)
            const maxLoss = Math.min(...returns)

            const confidence = Math.min(1, records.length / 50)
            const significance = Math.abs(avgReturn) / (volatility / Math.sqrt(records.length))

            patterns.push({
                tickerId,
                timeFrame: 'DAILY',
                patternType: 'WEEKLY_SEASONAL',
                period: dayOfWeek,
                avgReturn,
                volatility,
                winRate,
                maxGain,
                maxLoss,
                sampleSize: records.length,
                confidence,
                significance,
                analysisDate: new Date(),
                dataRangeStart: records[0].originalDate,
                dataRangeEnd: records[records.length - 1].originalDate,
            })
        }

        return patterns
    }

    /**
     * Calculate quarterly patterns
     */
    async calculateQuarterlyPatterns(tickerId) {
        const quarterlyData = await prisma.processedData.findMany({
            where: {
                tickerId,
                timeFrame: 'MONTHLY',
                quarter: { not: null },
            },
            orderBy: { processedDate: 'asc' },
        })

        const patterns = []
        const quarterGroups = new Map()

        // Group by quarter
        quarterlyData.forEach((record) => {
            const quarter = record.quarter
            if (!quarterGroups.has(quarter)) {
                quarterGroups.set(quarter, [])
            }
            quarterGroups.get(quarter).push(record)
        })

        // Calculate patterns for each quarter
        for (const [quarter, records] of quarterGroups) {
            if (records.length < 3) continue // Minimum sample size

            const returns = records.map((r) => r.returns || 0)
            const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length
            const volatility = this.calculateStandardDeviation(returns)
            const positiveReturns = returns.filter((r) => r > 0).length
            const winRate = positiveReturns / returns.length
            const maxGain = Math.max(...returns)
            const maxLoss = Math.min(...returns)

            const confidence = Math.min(1, records.length / 10)
            const significance = Math.abs(avgReturn) / (volatility / Math.sqrt(records.length))

            patterns.push({
                tickerId,
                timeFrame: 'MONTHLY',
                patternType: 'QUARTERLY_SEASONAL',
                period: quarter,
                avgReturn,
                volatility,
                winRate,
                maxGain,
                maxLoss,
                sampleSize: records.length,
                confidence,
                significance,
                analysisDate: new Date(),
                dataRangeStart: records[0].processedDate,
                dataRangeEnd: records[records.length - 1].processedDate,
            })
        }

        return patterns
    }

    /**
     * Calculate standard deviation
     */
    calculateStandardDeviation(values) {
        if (values.length === 0) return 0

        const mean = values.reduce((sum, val) => sum + val, 0) / values.length
        const squaredDiffs = values.map((val) => Math.pow(val - mean, 2))
        const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length

        return Math.sqrt(variance)
    }

    /**
     * Cross-reference data between timeframes (Ported from Python GenerateFiles.py)
     * This implements the complex logic that links daily data to weekly/monthly/yearly data
     */
    crossReferenceTimeframes(timeframeData) {
        const { daily, mondayWeekly, expiryWeekly, monthly, yearly } = timeframeData

        // Create lookup maps for efficient referencing
        const mondayWeeklyMap = new Map()
        const expiryWeeklyMap = new Map()
        const monthlyMap = new Map()
        const yearlyMap = new Map()

        // Build lookup maps
        mondayWeekly.forEach((week) => {
            const key = week.date.toISOString().split('T')[0]
            mondayWeeklyMap.set(key, week)
        })

        expiryWeekly.forEach((week) => {
            const key = week.date.toISOString().split('T')[0]
            expiryWeeklyMap.set(key, week)
        })

        monthly.forEach((month) => {
            const key = month.date.toISOString().split('T')[0]
            monthlyMap.set(key, month)
        })

        yearly.forEach((year) => {
            const key = year.date.toISOString().split('T')[0]
            yearlyMap.set(key, year)
        })

        // Cross-reference daily data with other timeframes
        daily.forEach((day) => {
            // Monday weekly cross-reference
            const mondayKey = day.mondayWeeklyDate.toISOString().split('T')[0]
            const mondayWeek = mondayWeeklyMap.get(mondayKey)
            if (mondayWeek) {
                day.mondayWeekNumberMonthly = mondayWeek.weekNumberMonthly
                day.mondayWeekNumberYearly = mondayWeek.weekNumberYearly
                day.evenMondayWeekNumberMonthly = mondayWeek.evenWeekNumberMonthly
                day.evenMondayWeekNumberYearly = mondayWeek.evenWeekNumberYearly
                day.mondayWeeklyReturnPoints = mondayWeek.returnPoints
                day.mondayWeeklyReturnPercentage = mondayWeek.returnPercentage
                day.positiveMondayWeek = mondayWeek.positiveWeek
            }

            // Expiry weekly cross-reference
            const expiryKey = day.expiryWeeklyDate.toISOString().split('T')[0]
            const expiryWeek = expiryWeeklyMap.get(expiryKey)
            if (expiryWeek) {
                day.expiryWeekNumberMonthly = expiryWeek.weekNumberMonthly
                day.expiryWeekNumberYearly = expiryWeek.weekNumberYearly
                day.evenExpiryWeekNumberMonthly = expiryWeek.evenWeekNumberMonthly
                day.evenExpiryWeekNumberYearly = expiryWeek.evenWeekNumberYearly
                day.expiryWeeklyReturnPoints = expiryWeek.returnPoints
                day.expiryWeeklyReturnPercentage = expiryWeek.returnPercentage
                day.positiveExpiryWeek = expiryWeek.positiveWeek
            }

            // Monthly cross-reference
            const monthKey = `${day.date.getFullYear()}-${String(day.date.getMonth() + 1).padStart(2, '0')}-01`
            const month = monthlyMap.get(monthKey)
            if (month) {
                day.evenMonth = month.evenMonth
                day.monthlyReturnPoints = month.returnPoints
                day.monthlyReturnPercentage = month.returnPercentage
                day.positiveMonth = month.positiveMonth
            }

            // Yearly cross-reference
            const yearKey = `${day.date.getFullYear()}-01-01`
            const year = yearlyMap.get(yearKey)
            if (year) {
                day.evenYear = year.evenYear
                day.yearlyReturnPoints = year.returnPoints
                day.yearlyReturnPercentage = year.returnPercentage
                day.positiveYear = year.positiveYear
            }
        })

        // Cross-reference weekly data with monthly/yearly
        mondayWeekly.forEach((week) => {
            // Monthly cross-reference for Monday weekly
            const monthKey = `${week.date.getFullYear()}-${String(week.date.getMonth() + 1).padStart(2, '0')}-01`
            const month = monthlyMap.get(monthKey)
            if (month) {
                week.evenMonth = month.evenMonth
                week.monthlyReturnPoints = month.returnPoints
                week.monthlyReturnPercentage = month.returnPercentage
                week.positiveMonth = month.positiveMonth
            }

            // Yearly cross-reference for Monday weekly
            const yearKey = `${week.date.getFullYear()}-01-01`
            const year = yearlyMap.get(yearKey)
            if (year) {
                week.evenYear = year.evenYear
                week.yearlyReturnPoints = year.returnPoints
                week.yearlyReturnPercentage = year.returnPercentage
                week.positiveYear = year.positiveYear
            }
        })

        expiryWeekly.forEach((week) => {
            // Monthly cross-reference for Expiry weekly
            const monthKey = `${week.date.getFullYear()}-${String(week.date.getMonth() + 1).padStart(2, '0')}-01`
            const month = monthlyMap.get(monthKey)
            if (month) {
                week.evenMonth = month.evenMonth
                week.monthlyReturnPoints = month.returnPoints
                week.monthlyReturnPercentage = month.returnPercentage
                week.positiveMonth = month.positiveMonth
            }

            // Yearly cross-reference for Expiry weekly
            const yearKey = `${week.date.getFullYear()}-01-01`
            const year = yearlyMap.get(yearKey)
            if (year) {
                week.evenYear = year.evenYear
                week.yearlyReturnPoints = year.returnPoints
                week.yearlyReturnPercentage = year.returnPercentage
                week.positiveYear = year.positiveYear
            }
        })

        // Cross-reference monthly data with yearly
        monthly.forEach((month) => {
            // Yearly cross-reference for Monthly
            const yearKey = `${month.date.getFullYear()}-01-01`
            const year = yearlyMap.get(yearKey)
            if (year) {
                month.evenYear = year.evenYear
                month.yearlyReturnPoints = year.returnPoints
                month.yearlyReturnPercentage = year.returnPercentage
                month.positiveYear = year.positiveYear
            }
        })

        return {
            daily,
            mondayWeekly,
            expiryWeekly,
            monthly,
            yearly,
        }
    }

    /**
     * Calculate overall system statistics
     */
    async calculateOverallStatistics() {
        try {
            const [tickerCount, totalRecords, avgRecordsPerTicker, timeFrameDistribution, patternCount] =
                await Promise.all([
                    prisma.ticker.count(),
                    prisma.seasonalityData.count(),
                    prisma.seasonalityData.count() / Math.max(1, await prisma.ticker.count()),
                    prisma.processedData.groupBy({
                        by: ['timeFrame'],
                        _count: { timeFrame: true },
                    }),
                    prisma.seasonalityPattern.count(),
                ])

            return {
                totalTickers: tickerCount,
                totalRecords,
                avgRecordsPerTicker: Math.round(avgRecordsPerTicker * 100) / 100,
                timeFrameDistribution: timeFrameDistribution.reduce((acc, item) => {
                    acc[item.timeFrame] = item._count.timeFrame
                    return acc
                }, {}),
                totalPatterns: patternCount,
                lastUpdated: new Date(),
            }
        } catch (error) {
            console.error('Error calculating overall statistics:', error)
            return {}
        }
    }
}

module.exports = new SeasonalityService()
