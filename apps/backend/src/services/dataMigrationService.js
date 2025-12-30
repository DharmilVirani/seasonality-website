/**
 * Data Migration Service
 *
 * Handles migration from old data structure to new enhanced schema
 * Populates basket data, political cycles, special days, and statistical cache
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const seasonalityService = require('./seasonalityService')
const politicalCycleService = require('./politicalCycleService')
const basketService = require('./basketService')

class DataMigrationService {
    constructor() {
        this.migrationStats = {
            totalRecords: 0,
            processedRecords: 0,
            failedRecords: 0,
            basketsInitialized: 0,
            politicalCyclesLoaded: 0,
            specialDaysLoaded: 0,
            patternsAnalyzed: 0,
        }
    }

    /**
     * Run complete data migration
     */
    async runCompleteMigration() {
        try {
            console.log('Starting complete data migration...')

            // Step 1: Initialize basket system
            await this.migrateBasketData()

            // Step 2: Initialize political cycles and special days
            await this.migratePoliticalCycleData()

            // Step 3: Migrate seasonality data to new tables
            await this.migrateSeasonalityData()

            // Step 4: Analyze patterns and populate cache
            await this.populatePatternAnalysis()

            // Step 5: Generate comprehensive statistics
            await this.generateComprehensiveStatistics()

            console.log('Complete data migration finished successfully')
            return this.migrationStats
        } catch (error) {
            console.error('Error in complete migration:', error)
            throw error
        }
    }

    /**
     * Migrate basket data
     */
    async migrateBasketData() {
        try {
            console.log('Migrating basket data...')

            await basketService.initializeCompleteBasketSystem()

            // Get basket count
            const basketCount = await prisma.basket.count()
            this.migrationStats.basketsInitialized = basketCount

            console.log(`✅ Migrated ${basketCount} baskets`)
        } catch (error) {
            console.error('Error migrating basket data:', error)
            throw error
        }
    }

    /**
     * Migrate political cycle data
     */
    async migratePoliticalCycleData() {
        try {
            console.log('Migrating political cycle data...')

            await politicalCycleService.initializeAll()

            // Get counts
            const cycleCount = await prisma.politicalCycle.count()
            const specialDayCount = await prisma.specialDay.count()
            const electionYearCount = await prisma.electionYear.count()

            this.migrationStats.politicalCyclesLoaded = cycleCount + specialDayCount + electionYearCount

            console.log(
                `✅ Migrated ${cycleCount} political cycles, ${specialDayCount} special days, ${electionYearCount} election years`
            )
        } catch (error) {
            console.error('Error migrating political cycle data:', error)
            throw error
        }
    }

    /**
     * Migrate seasonality data to new enhanced tables
     */
    async migrateSeasonalityData() {
        try {
            console.log('Migrating seasonality data to enhanced tables...')

            // Get all processed data
            const processedData = await prisma.processedData.findMany({
                orderBy: { tickerId: 'asc', processedDate: 'asc' },
            })

            this.migrationStats.totalRecords = processedData.length
            console.log(`Found ${processedData.length} processed data records`)

            // Group by ticker and timeframe for migration
            const tickerTimeframeGroups = new Map()

            processedData.forEach((record) => {
                const key = `${record.tickerId}_${record.timeFrame}`
                if (!tickerTimeframeGroups.has(key)) {
                    tickerTimeframeGroups.set(key, [])
                }
                tickerTimeframeGroups.get(key).push(record)
            })

            console.log(`Grouped data into ${tickerTimeframeGroups.size} ticker-timeframe combinations`)

            // Migrate each group to appropriate table
            for (const [key, records] of tickerTimeframeGroups) {
                try {
                    const [tickerId, timeFrame] = key.split('_')
                    await this.migrateToTimeframeTable(parseInt(tickerId), timeFrame, records)
                    this.migrationStats.processedRecords += records.length
                } catch (error) {
                    console.error(`Error migrating group ${key}:`, error)
                    this.migrationStats.failedRecords += records.length
                }
            }

            console.log(`✅ Migrated ${this.migrationStats.processedRecords} records to enhanced tables`)
        } catch (error) {
            console.error('Error migrating seasonality data:', error)
            throw error
        }
    }

    /**
     * Migrate records to specific timeframe table
     */
    async migrateToTimeframeTable(tickerId, timeFrame, records) {
        try {
            switch (timeFrame) {
                case 'DAILY':
                    await this.migrateDailyData(tickerId, records)
                    break
                case 'MONDAY_WEEKLY':
                    await this.migrateMondayWeeklyData(tickerId, records)
                    break
                case 'EXPIRY_WEEKLY':
                    await this.migrateExpiryWeeklyData(tickerId, records)
                    break
                case 'MONTHLY':
                    await this.migrateMonthlyData(tickerId, records)
                    break
                case 'YEARLY':
                    await this.migrateYearlyData(tickerId, records)
                    break
                default:
                    console.warn(`Unknown timeframe: ${timeFrame}`)
            }
        } catch (error) {
            console.error(`Error migrating to ${timeFrame} table:`, error)
            throw error
        }
    }

    /**
     * Migrate daily data
     */
    async migrateDailyData(tickerId, records) {
        const dailyRecords = records.map((record) => ({
            tickerId,
            date: record.processedDate,
            open: record.open,
            high: record.high,
            low: record.low,
            close: record.close,
            volume: record.volume,
            openInterest: record.openInterest,
            weekday: new Date(record.processedDate).toLocaleDateString('en-US', { weekday: 'long' }),

            // Calendar calculations
            calendarMonthDay: new Date(record.processedDate).getDate(),
            calendarYearDay: this.getDayOfYear(new Date(record.processedDate)),

            // Even/Odd classifications
            evenCalendarMonthDay: new Date(record.processedDate).getDate() % 2 === 0,
            evenCalendarYearDay: this.getDayOfYear(new Date(record.processedDate)) % 2 === 0,

            // Return calculations
            returnPoints: record.returns ? record.returns * 100 : null, // Convert percentage to points
            returnPercentage: record.returns,
            positiveDay: record.returns > 0,

            // Placeholder for cross-references (will be populated later)
            evenMonth: null,
            evenYear: null,
            monthlyReturnPoints: null,
            monthlyReturnPercentage: null,
            positiveMonth: null,
            yearlyReturnPoints: null,
            yearlyReturnPercentage: null,
            positiveYear: null,
        }))

        // Batch insert with conflict resolution
        const batchSize = 1000
        for (let i = 0; i < dailyRecords.length; i += batchSize) {
            const batch = dailyRecords.slice(i, i + batchSize)

            await prisma.$transaction(
                batch.map((record) =>
                    prisma.dailySeasonalityData.upsert({
                        where: {
                            tickerId_date: {
                                tickerId: record.tickerId,
                                date: record.date,
                            },
                        },
                        update: record,
                        create: record,
                    })
                )
            )
        }
    }

    /**
     * Migrate Monday weekly data
     */
    async migrateMondayWeeklyData(tickerId, records) {
        const weeklyRecords = records.map((record) => ({
            tickerId,
            date: record.processedDate,
            open: record.open,
            high: record.high,
            low: record.low,
            close: record.close,
            volume: record.volume,
            openInterest: record.openInterest,
            weekday: new Date(record.processedDate).toLocaleDateString('en-US', { weekday: 'long' }),

            // Week numbering (simplified)
            weekNumberMonthly: this.calculateWeekNumberMonthly(new Date(record.processedDate)),
            weekNumberYearly: this.getWeekNumber(new Date(record.processedDate)),
            evenWeekNumberMonthly: false, // Will be calculated
            evenWeekNumberYearly: false, // Will be calculated

            // Return calculations
            returnPoints: record.returns ? record.returns * 100 : null,
            returnPercentage: record.returns,
            positiveWeek: record.returns > 0,

            // Placeholders for cross-references
            evenMonth: null,
            monthlyReturnPoints: null,
            monthlyReturnPercentage: null,
            positiveMonth: null,
            evenYear: null,
            yearlyReturnPoints: null,
            yearlyReturnPercentage: null,
            positiveYear: null,
        }))

        // Batch insert
        const batchSize = 1000
        for (let i = 0; i < weeklyRecords.length; i += batchSize) {
            const batch = weeklyRecords.slice(i, i + batchSize)

            await prisma.$transaction(
                batch.map((record) =>
                    prisma.mondayWeeklySeasonalityData.upsert({
                        where: {
                            tickerId_date: {
                                tickerId: record.tickerId,
                                date: record.date,
                            },
                        },
                        update: record,
                        create: record,
                    })
                )
            )
        }
    }

    /**
     * Migrate monthly data
     */
    async migrateMonthlyData(tickerId, records) {
        const monthlyRecords = records.map((record) => ({
            tickerId,
            date: record.processedDate,
            open: record.open,
            high: record.high,
            low: record.low,
            close: record.close,
            volume: record.volume,
            openInterest: record.openInterest,
            weekday: new Date(record.processedDate).toLocaleDateString('en-US', { weekday: 'long' }),

            // Even/Odd classifications
            evenMonth: new Date(record.processedDate).getMonth() % 2 === 0,

            // Return calculations
            returnPoints: record.returns ? record.returns * 100 : null,
            returnPercentage: record.returns,
            positiveMonth: record.returns > 0,

            // Placeholders for yearly references
            evenYear: null,
            yearlyReturnPoints: null,
            yearlyReturnPercentage: null,
            positiveYear: null,
        }))

        // Batch insert
        const batchSize = 1000
        for (let i = 0; i < monthlyRecords.length; i += batchSize) {
            const batch = monthlyRecords.slice(i, i + batchSize)

            await prisma.$transaction(
                batch.map((record) =>
                    prisma.monthlySeasonalityData.upsert({
                        where: {
                            tickerId_date: {
                                tickerId: record.tickerId,
                                date: record.date,
                            },
                        },
                        update: record,
                        create: record,
                    })
                )
            )
        }
    }

    /**
     * Migrate yearly data
     */
    async migrateYearlyData(tickerId, records) {
        const yearlyRecords = records.map((record) => ({
            tickerId,
            date: record.processedDate,
            open: record.open,
            high: record.high,
            low: record.low,
            close: record.close,
            volume: record.volume,
            openInterest: record.openInterest,
            weekday: new Date(record.processedDate).toLocaleDateString('en-US', { weekday: 'long' }),

            // Even/Odd classifications
            evenYear: new Date(record.processedDate).getFullYear() % 2 === 0,

            // Return calculations
            returnPoints: record.returns ? record.returns * 100 : null,
            returnPercentage: record.returns,
            positiveYear: record.returns > 0,
        }))

        // Batch insert
        const batchSize = 1000
        for (let i = 0; i < yearlyRecords.length; i += batchSize) {
            const batch = yearlyRecords.slice(i, i + batchSize)

            await prisma.$transaction(
                batch.map((record) =>
                    prisma.yearlySeasonalityData.upsert({
                        where: {
                            tickerId_date: {
                                tickerId: record.tickerId,
                                date: record.date,
                            },
                        },
                        update: record,
                        create: record,
                    })
                )
            )
        }
    }

    /**
     * Migrate expiry weekly data
     */
    async migrateExpiryWeeklyData(tickerId, records) {
        const expiryRecords = records.map((record) => ({
            tickerId,
            date: record.processedDate,
            startDate: new Date(record.processedDate.getTime() - 6 * 24 * 60 * 60 * 1000), // Week before
            open: record.open,
            high: record.high,
            low: record.low,
            close: record.close,
            volume: record.volume,
            openInterest: record.openInterest,
            weekday: new Date(record.processedDate).toLocaleDateString('en-US', { weekday: 'long' }),

            // Week numbering
            weekNumberMonthly: this.calculateWeekNumberMonthly(new Date(record.processedDate)),
            weekNumberYearly: this.getWeekNumber(new Date(record.processedDate)),
            evenWeekNumberMonthly: false,
            evenWeekNumberYearly: false,

            // Return calculations
            returnPoints: record.returns ? record.returns * 100 : null,
            returnPercentage: record.returns,
            positiveWeek: record.returns > 0,

            // Cross-references
            evenMonth: null,
            monthlyReturnPoints: null,
            monthlyReturnPercentage: null,
            positiveMonth: null,
            evenYear: null,
            yearlyReturnPoints: null,
            yearlyReturnPercentage: null,
            positiveYear: null,
        }))

        // Batch insert
        const batchSize = 1000
        for (let i = 0; i < expiryRecords.length; i += batchSize) {
            const batch = expiryRecords.slice(i, i + batchSize)

            await prisma.$transaction(
                batch.map((record) =>
                    prisma.expiryWeeklySeasonalityData.upsert({
                        where: {
                            tickerId_date: {
                                tickerId: record.tickerId,
                                date: record.date,
                            },
                        },
                        update: record,
                        create: record,
                    })
                )
            )
        }
    }

    /**
     * Populate pattern analysis for all tickers
     */
    async populatePatternAnalysis() {
        try {
            console.log('Populating pattern analysis...')

            const tickers = await prisma.ticker.findMany()

            for (const ticker of tickers) {
                try {
                    const patterns = await seasonalityService.analyzeSeasonalityPatterns(ticker.id)
                    this.migrationStats.patternsAnalyzed += patterns.length

                    if (this.migrationStats.patternsAnalyzed % 100 === 0) {
                        console.log(
                            `Analyzed patterns for ${this.migrationStats.patternsAnalyzed} ticker-pattern combinations`
                        )
                    }
                } catch (error) {
                    console.error(`Error analyzing patterns for ticker ${ticker.symbol}:`, error)
                }
            }

            console.log(`✅ Analyzed ${this.migrationStats.patternsAnalyzed} patterns`)
        } catch (error) {
            console.error('Error populating pattern analysis:', error)
            throw error
        }
    }

    /**
     * Generate comprehensive statistics and cache
     */
    async generateComprehensiveStatistics() {
        try {
            console.log('Generating comprehensive statistics and cache...')

            const tickers = await prisma.ticker.findMany()

            for (const ticker of tickers) {
                try {
                    // Generate comprehensive statistics
                    const stats = await require('./statisticalService').calculateComprehensiveStatistics(ticker.id)

                    // Cache the statistics
                    await prisma.statisticalCache.upsert({
                        where: {
                            tickerId_timeFrame_analysisType: {
                                tickerId: ticker.id,
                                timeFrame: 'DAILY',
                                analysisType: 'COMPREHENSIVE_STATS',
                            },
                        },
                        update: {
                            resultData: JSON.stringify(stats),
                            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
                        },
                        create: {
                            tickerId: ticker.id,
                            timeFrame: 'DAILY',
                            analysisType: 'COMPREHENSIVE_STATS',
                            resultData: JSON.stringify(stats),
                            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
                        },
                    })
                } catch (error) {
                    console.error(`Error generating statistics for ticker ${ticker.symbol}:`, error)
                }
            }

            console.log('✅ Generated comprehensive statistics and cache')
        } catch (error) {
            console.error('Error generating comprehensive statistics:', error)
            throw error
        }
    }

    /**
     * Get migration status
     */
    async getMigrationStatus() {
        try {
            const [
                tickerCount,
                dailyCount,
                weeklyCount,
                monthlyCount,
                yearlyCount,
                patternCount,
                basketCount,
                cycleCount,
                specialDayCount,
            ] = await Promise.all([
                prisma.ticker.count(),
                prisma.dailySeasonalityData.count(),
                prisma.mondayWeeklySeasonalityData.count(),
                prisma.monthlySeasonalityData.count(),
                prisma.yearlySeasonalityData.count(),
                prisma.seasonalityPattern.count(),
                prisma.basket.count(),
                prisma.politicalCycle.count(),
                prisma.specialDay.count(),
            ])

            return {
                ...this.migrationStats,
                databaseStats: {
                    totalTickers: tickerCount,
                    dailyRecords: dailyCount,
                    weeklyRecords: weeklyCount,
                    monthlyRecords: monthlyCount,
                    yearlyRecords: yearlyCount,
                    totalPatterns: patternCount,
                    totalBaskets: basketCount,
                    politicalCycles: cycleCount,
                    specialDays: specialDayCount,
                },
                lastUpdated: new Date(),
            }
        } catch (error) {
            console.error('Error getting migration status:', error)
            return { ...this.migrationStats, error: error.message }
        }
    }

    // Helper methods

    getDayOfYear(date) {
        const start = new Date(date.getFullYear(), 0, 0)
        const diff = date - start
        return Math.floor(diff / 86400000)
    }

    getWeekNumber(date) {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
        const dayNum = d.getUTCDay() || 7
        d.setUTCDate(d.getUTCDate() + 4 - dayNum)
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
        return Math.ceil(((d - yearStart) / 86400000 + 1) / 7)
    }

    calculateWeekNumberMonthly(date) {
        const firstDay = new Date(date.getFullYear(), date.getMonth(), 1)
        const diff = date.getDate() - firstDay.getDate()
        return Math.floor(diff / 7) + 1
    }
}

module.exports = new DataMigrationService()
