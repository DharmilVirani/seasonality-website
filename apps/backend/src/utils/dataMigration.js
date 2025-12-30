/**
 * Data Migration Utility
 *
 * Migrates data from old Python system to new Node.js system
 * Handles CSV files from old_software directory structure
 */

const fs = require('fs').promises
const path = require('path')
const { PrismaClient } = require('@prisma/client')
const seasonalityService = require('../services/seasonalityService')
const politicalCycleService = require('../services/politicalCycleService')

const prisma = new PrismaClient()

class DataMigration {
    constructor() {
        this.oldSoftwarePath = path.join(__dirname, '../../old_software')
        this.migrationStats = {
            tickersProcessed: 0,
            filesProcessed: 0,
            recordsImported: 0,
            errors: [],
        }
    }

    /**
     * Run complete data migration from old Python system
     */
    async runFullMigration(options = {}) {
        console.log('🚀 Starting full data migration from Python system...')

        try {
            // Step 1: Initialize political cycles and special days
            console.log('📊 Initializing political cycles and special days...')
            await politicalCycleService.initializeAll()

            // Step 2: Migrate raw CSV data
            console.log('📈 Migrating raw CSV data...')
            const rawDataResults = await this.migrateRawCSVData()

            // Step 3: Process seasonality analysis
            console.log('🔬 Processing seasonality analysis...')
            const analysisResults = await this.processSeasonalityAnalysis()

            // Step 4: Generate migration report
            console.log('📋 Generating migration report...')
            const report = this.generateMigrationReport(rawDataResults, analysisResults)

            console.log('✅ Migration completed successfully!')
            return report
        } catch (error) {
            console.error('❌ Migration failed:', error)
            throw error
        }
    }

    /**
     * Migrate raw CSV data from Symbols directory
     */
    async migrateRawCSVData() {
        const results = {
            totalTickers: 0,
            processedTickers: 0,
            totalFiles: 0,
            processedFiles: 0,
            errors: [],
        }

        try {
            const symbolsPath = path.join(this.oldSoftwarePath, 'Symbols')

            // Check if Symbols directory exists
            try {
                await fs.access(symbolsPath)
            } catch (error) {
                console.warn('⚠️ Symbols directory not found, skipping raw data migration')
                return results
            }

            // Get all ticker directories
            const tickerDirs = await fs.readdir(symbolsPath)
            results.totalTickers = tickerDirs.length
            results.totalFiles = 0

            console.log(`📁 Found ${tickerDirs.length} ticker directories`)

            for (const tickerDir of tickerDirs) {
                try {
                    const tickerPath = path.join(symbolsPath, tickerDir)
                    const stats = await fs.stat(tickerPath)

                    if (!stats.isDirectory()) continue

                    // Process all CSV files in this ticker directory
                    const csvFiles = await fs.readdir(tickerPath)
                    const dailyCsv = csvFiles.find((file) => file.startsWith('1_'))

                    if (!dailyCsv) {
                        console.warn(`⚠️ No daily CSV file found for ${tickerDir}`)
                        continue
                    }

                    results.totalFiles++
                    const filePath = path.join(tickerPath, dailyCsv)

                    // Read and parse CSV file
                    const csvContent = await fs.readFile(filePath, 'utf8')
                    const records = this.parseDailyCSV(csvContent, tickerDir)

                    if (records.length === 0) {
                        console.warn(`⚠️ No valid records found in ${tickerDir}/${dailyCsv}`)
                        continue
                    }

                    // Store in database
                    await this.storeRawData(records)

                    results.processedTickers++
                    results.processedFiles++
                    results.recordsImported += records.length

                    console.log(`✅ Processed ${tickerDir}: ${records.length} records`)
                } catch (tickerError) {
                    console.error(`❌ Error processing ticker ${tickerDir}:`, tickerError.message)
                    results.errors.push({
                        ticker: tickerDir,
                        error: tickerError.message,
                    })
                }
            }
        } catch (error) {
            console.error('❌ Error in migrateRawCSVData:', error)
            throw error
        }

        return results
    }

    /**
     * Parse daily CSV file from old system
     */
    parseDailyCSV(csvContent, tickerSymbol) {
        const lines = csvContent.trim().split('\n')
        if (lines.length < 2) return []

        const records = []
        const headerLine = lines[0].toLowerCase()

        // Detect CSV format
        const hasDate = headerLine.includes('date')
        const hasOpen = headerLine.includes('open')
        const hasHigh = headerLine.includes('high')
        const hasLow = headerLine.includes('low')
        const hasClose = headerLine.includes('close')
        const hasVolume = headerLine.includes('volume') || headerLine.includes('vol')

        if (!hasDate || !hasClose) {
            console.warn(`⚠️ Missing required columns in ${tickerSymbol} CSV`)
            return []
        }

        // Parse header to get column indices
        const headers = lines[0].split(',').map((h) => h.trim().toLowerCase())
        const dateIndex = headers.findIndex((h) => h.includes('date'))
        const openIndex = hasOpen ? headers.findIndex((h) => h.includes('open')) : -1
        const highIndex = hasHigh ? headers.findIndex((h) => h.includes('high')) : -1
        const lowIndex = hasLow ? headers.findIndex((h) => h.includes('low')) : -1
        const closeIndex = headers.findIndex((h) => h.includes('close'))
        const volumeIndex = hasVolume ? headers.findIndex((h) => h.includes('vol') || h.includes('volume')) : -1

        // Parse data rows
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim()
            if (!line) continue

            const values = line.split(',').map((v) => v.trim())

            try {
                const date = new Date(values[dateIndex])
                if (isNaN(date.getTime())) continue

                const record = {
                    date: date,
                    ticker: tickerSymbol,
                    open: openIndex >= 0 ? parseFloat(values[openIndex]) || 0 : 0,
                    high: highIndex >= 0 ? parseFloat(values[highIndex]) || 0 : 0,
                    low: lowIndex >= 0 ? parseFloat(values[lowIndex]) || 0 : 0,
                    close: parseFloat(values[closeIndex]) || 0,
                    volume: volumeIndex >= 0 ? parseFloat(values[volumeIndex]) || 0 : 0,
                    openInterest: 0, // Not available in old system
                }

                if (record.close > 0) {
                    // Only include records with valid close price
                    records.push(record)
                }
            } catch (rowError) {
                console.warn(`⚠️ Error parsing row ${i} in ${tickerSymbol}:`, rowError.message)
            }
        }

        return records
    }

    /**
     * Store raw data in database
     */
    async storeRawData(records) {
        if (records.length === 0) return

        // Get or create ticker
        const tickerSymbol = records[0].ticker
        const ticker = await prisma.ticker.upsert({
            where: { symbol: tickerSymbol },
            update: {},
            create: { symbol: tickerSymbol },
        })

        // Batch insert data
        const batchSize = 1000
        for (let i = 0; i < records.length; i += batchSize) {
            const batch = records.slice(i, i + batchSize)

            await prisma.$transaction(
                batch.map((record) =>
                    prisma.seasonalityData.upsert({
                        where: {
                            date_tickerId: {
                                date: record.date,
                                tickerId: ticker.id,
                            },
                        },
                        update: {
                            open: record.open,
                            high: record.high,
                            low: record.low,
                            close: record.close,
                            volume: record.volume,
                            openInterest: record.openInterest,
                        },
                        create: {
                            date: record.date,
                            tickerId: ticker.id,
                            open: record.open,
                            high: record.high,
                            low: record.low,
                            close: record.close,
                            volume: record.volume,
                            openInterest: record.openInterest,
                        },
                    })
                )
            )
        }
    }

    /**
     * Process seasonality analysis for all tickers
     */
    async processSeasonalityAnalysis() {
        const results = {
            tickersAnalyzed: 0,
            patternsGenerated: 0,
            errors: [],
        }

        try {
            // Get all tickers with data
            const tickers = await prisma.ticker.findMany({
                include: {
                    seasonalityData: {
                        orderBy: { date: 'asc' },
                    },
                },
            })

            console.log(`🔬 Processing seasonality analysis for ${tickers.length} tickers...`)

            for (const ticker of tickers) {
                try {
                    if (ticker.seasonalityData.length < 10) {
                        console.warn(
                            `⚠️ Skipping ${ticker.symbol}: insufficient data (${ticker.seasonalityData.length} records)`
                        )
                        continue
                    }

                    // Format data for seasonality service
                    const formattedData = ticker.seasonalityData.map((record) => ({
                        date: record.date,
                        ticker: ticker.symbol,
                        open: record.open,
                        high: record.high,
                        low: record.low,
                        close: record.close,
                        volume: record.volume,
                        openInterest: record.openInterest,
                    }))

                    // Process seasonality analysis
                    const processed = await seasonalityService.processSeasonalityData(formattedData)

                    results.tickersAnalyzed++
                    results.patternsGenerated += processed.patterns.length

                    console.log(`✅ Analyzed ${ticker.symbol}: ${processed.patterns.length} patterns`)
                } catch (tickerError) {
                    console.error(`❌ Error analyzing ${ticker.symbol}:`, tickerError.message)
                    results.errors.push({
                        ticker: ticker.symbol,
                        error: tickerError.message,
                    })
                }
            }
        } catch (error) {
            console.error('❌ Error in processSeasonalityAnalysis:', error)
            throw error
        }

        return results
    }

    /**
     * Generate migration report
     */
    generateMigrationReport(rawDataResults, analysisResults) {
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                totalTickers: rawDataResults.totalTickers,
                processedTickers: rawDataResults.processedTickers,
                totalFiles: rawDataResults.totalFiles,
                processedFiles: rawDataResults.processedFiles,
                totalRecordsImported: rawDataResults.recordsImported,
                tickersAnalyzed: analysisResults.tickersAnalyzed,
                patternsGenerated: analysisResults.patternsGenerated,
            },
            rawDataMigration: rawDataResults,
            seasonalityAnalysis: analysisResults,
            nextSteps: [
                'Review any errors in the migration process',
                'Verify data integrity by checking a few tickers manually',
                'Run statistical analysis on imported data',
                'Set up regular data updates if needed',
            ],
        }

        // Save report to file
        const reportPath = path.join(__dirname, '../../migration-report.json')
        fs.writeFile(reportPath, JSON.stringify(report, null, 2))
            .then(() => console.log(`📋 Migration report saved to ${reportPath}`))
            .catch((err) => console.error('❌ Error saving migration report:', err))

        return report
    }

    /**
     * Validate migrated data
     */
    async validateMigratedData() {
        console.log('🔍 Validating migrated data...')

        try {
            const [tickerCount, dataCount, patternCount, politicalCycleCount, specialDayCount] = await Promise.all([
                prisma.ticker.count(),
                prisma.seasonalityData.count(),
                prisma.seasonalityPattern.count(),
                prisma.politicalCycle.count(),
                prisma.specialDay.count(),
            ])

            const validation = {
                timestamp: new Date().toISOString(),
                databaseStats: {
                    tickers: tickerCount,
                    seasonalityDataRecords: dataCount,
                    seasonalityPatterns: patternCount,
                    politicalCycles: politicalCycleCount,
                    specialDays: specialDayCount,
                },
                validationChecks: [
                    {
                        check: 'Ticker count > 0',
                        passed: tickerCount > 0,
                        value: tickerCount,
                    },
                    {
                        check: 'Data records > 0',
                        passed: dataCount > 0,
                        value: dataCount,
                    },
                    {
                        check: 'Political cycles loaded',
                        passed: politicalCycleCount > 0,
                        value: politicalCycleCount,
                    },
                    {
                        check: 'Special days loaded',
                        passed: specialDayCount > 0,
                        value: specialDayCount,
                    },
                ],
            }

            const allPassed = validation.validationChecks.every((check) => check.passed)
            validation.overallStatus = allPassed ? 'PASSED' : 'FAILED'

            console.log(`🔍 Validation ${validation.overallStatus}:`, validation.databaseStats)

            return validation
        } catch (error) {
            console.error('❌ Error validating migrated data:', error)
            throw error
        }
    }

    /**
     * Reset database for clean migration
     */
    async resetDatabase() {
        console.log('⚠️ Resetting database for clean migration...')

        try {
            // Delete in reverse order of dependencies
            await prisma.seasonalityPattern.deleteMany({})
            await prisma.processedData.deleteMany({})
            await prisma.seasonalityData.deleteMany({})
            await prisma.ticker.deleteMany({})
            await prisma.specialDay.deleteMany({})
            await prisma.politicalCycle.deleteMany({})

            console.log('✅ Database reset completed')
        } catch (error) {
            console.error('❌ Error resetting database:', error)
            throw error
        }
    }

    /**
     * Get migration status
     */
    async getMigrationStatus() {
        try {
            const [tickerCount, dataCount, patternCount, processedDataCount] = await Promise.all([
                prisma.ticker.count(),
                prisma.seasonalityData.count(),
                prisma.seasonalityPattern.count(),
                prisma.processedData.count(),
            ])

            return {
                timestamp: new Date().toISOString(),
                status: 'completed',
                database: {
                    tickers: tickerCount,
                    rawDataRecords: dataCount,
                    processedDataRecords: processedDataCount,
                    seasonalityPatterns: patternCount,
                },
                migrationComplete: tickerCount > 0 && dataCount > 0,
            }
        } catch (error) {
            console.error('❌ Error getting migration status:', error)
            return {
                timestamp: new Date().toISOString(),
                status: 'error',
                error: error.message,
            }
        }
    }
}

module.exports = new DataMigration()
