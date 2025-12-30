/**
 * Basket Analysis Service
 *
 * Handles predefined symbol groups and basket-based analysis
 * Migrated from Python system with enhanced database integration
 */

const fs = require('fs').promises
const path = require('path')
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

class BasketService {
    constructor() {
        this.basketCategories = {
            All_Indices: 'INDICES',
            'F&O_Indices': 'INDICES',
            Nifty_Indices: 'INDICES',
            BFO_Indices: 'INDICES',
            AllStocks: 'STOCKS',
            StocksList_1: 'STOCKS',
            StocksList_2: 'STOCKS',
            StocksList_3: 'STOCKS',
        }

        this.basketDescriptions = {
            All_Indices: 'All major market indices including NIFTY, BANKNIFTY, SENSEX',
            'F&O_Indices': 'Futures & Options indices for derivatives trading',
            Nifty_Indices: 'Comprehensive NIFTY sub-indices categorization',
            BFO_Indices: 'Bank and Financial sector indices',
            AllStocks: 'Complete list of individual stocks',
            StocksList_1: 'Primary stock list - Group 1',
            StocksList_2: 'Secondary stock list - Group 2',
            StocksList_3: 'Tertiary stock list - Group 3',
        }
    }

    /**
     * Initialize baskets from CSV data
     */
    async initializeBaskets() {
        try {
            console.log('Initializing baskets from CSV data...')

            const basketPath = path.join(__dirname, '../../old_software/basket/basket.csv')
            const baskets = await this.parseBasketCSV(basketPath)

            // Store baskets in database
            for (const basket of baskets) {
                await prisma.basket.upsert({
                    where: { name: basket.name },
                    update: {
                        description: basket.description,
                        category: basket.category,
                    },
                    create: {
                        name: basket.name,
                        description: basket.description,
                        category: basket.category,
                    },
                })
            }

            console.log(`Initialized ${baskets.length} baskets in database`)
            return baskets
        } catch (error) {
            console.error('Error initializing baskets:', error)
            throw error
        }
    }

    /**
     * Parse basket CSV file
     */
    async parseBasketCSV(filePath) {
        try {
            const fileContent = await fs.readFile(filePath, 'utf8')
            const lines = fileContent.trim().split('\n')

            if (lines.length < 2) {
                throw new Error('Invalid basket CSV format')
            }

            const header = lines[0].split(',')
            const baskets = []

            // Parse each basket column
            for (let colIndex = 0; colIndex < header.length; colIndex++) {
                const basketName = header[colIndex].trim()
                if (!basketName) continue

                const category = this.basketCategories[basketName] || 'STOCKS'
                const description = this.basketDescriptions[basketName] || `${basketName} symbol group`

                const basketData = {
                    name: basketName,
                    category,
                    description,
                    symbols: [],
                }

                // Parse symbols in this column
                for (let rowIndex = 1; rowIndex < lines.length; rowIndex++) {
                    const line = lines[rowIndex].trim()
                    if (!line) continue

                    const columns = line.split(',')
                    const symbol = columns[colIndex] ? columns[colIndex].trim() : ''

                    if (symbol && symbol !== '') {
                        basketData.symbols.push(symbol)
                    }
                }

                if (basketData.symbols.length > 0) {
                    baskets.push(basketData)
                }
            }

            return baskets
        } catch (error) {
            console.error(`Error parsing basket CSV ${filePath}:`, error)
            return []
        }
    }

    /**
     * Populate basket items (symbol-to-basket relationships)
     */
    async populateBasketItems() {
        try {
            const baskets = await prisma.basket.findMany()

            for (const basket of baskets) {
                console.log(`Populating items for basket: ${basket.name}`)

                // Parse basket CSV again to get symbols
                const basketPath = path.join(__dirname, '../../old_software/basket/basket.csv')
                const allBaskets = await this.parseBasketCSV(basketPath)
                const targetBasket = allBaskets.find((b) => b.name === basket.name)

                if (!targetBasket) continue

                for (const symbol of targetBasket.symbols) {
                    // Get or create ticker
                    const ticker = await prisma.ticker.upsert({
                        where: { symbol: symbol },
                        update: {},
                        create: { symbol: symbol },
                    })

                    // Create basket item
                    await prisma.basketItem.upsert({
                        where: {
                            basketId_tickerId: {
                                basketId: basket.id,
                                tickerId: ticker.id,
                            },
                        },
                        update: {},
                        create: {
                            basketId: basket.id,
                            tickerId: ticker.id,
                        },
                    })
                }
            }

            console.log('Basket items populated successfully')
        } catch (error) {
            console.error('Error populating basket items:', error)
            throw error
        }
    }

    /**
     * Get all baskets with their item counts
     */
    async getAllBaskets() {
        try {
            return await prisma.basket.findMany({
                include: {
                    _count: {
                        select: { basketItems: true },
                    },
                },
                orderBy: { name: 'asc' },
            })
        } catch (error) {
            console.error('Error fetching baskets:', error)
            return []
        }
    }

    /**
     * Get basket by name with all items
     */
    async getBasketByName(basketName) {
        try {
            return await prisma.basket.findUnique({
                where: { name: basketName },
                include: {
                    basketItems: {
                        include: {
                            ticker: true,
                        },
                        orderBy: { displayOrder: 'asc' },
                    },
                },
            })
        } catch (error) {
            console.error(`Error fetching basket ${basketName}:`, error)
            return null
        }
    }

    /**
     * Get baskets by category
     */
    async getBasketsByCategory(category) {
        try {
            return await prisma.basket.findMany({
                where: { category },
                include: {
                    _count: {
                        select: { basketItems: true },
                    },
                },
                orderBy: { name: 'asc' },
            })
        } catch (error) {
            console.error(`Error fetching baskets for category ${category}:`, error)
            return []
        }
    }

    /**
     * Perform basket-based seasonality analysis
     */
    async analyzeBasketSeasonality(basketName, analysisType = 'monthly') {
        try {
            const basket = await this.getBasketByName(basketName)
            if (!basket || basket.basketItems.length === 0) {
                throw new Error(`Basket ${basketName} not found or empty`)
            }

            const tickerIds = basket.basketItems.map((item) => item.tickerId)
            const results = {
                basketName,
                analysisType,
                totalSymbols: tickerIds.length,
                patterns: [],
                summary: {},
            }

            // Get seasonality patterns for all tickers in basket
            const patterns = await prisma.seasonalityPattern.findMany({
                where: {
                    tickerId: { in: tickerIds },
                    patternType: this.getPatternType(analysisType),
                },
                include: {
                    ticker: true,
                },
                orderBy: { avgReturn: 'desc' },
            })

            if (patterns.length === 0) {
                return { ...results, message: 'No seasonality patterns found for basket' }
            }

            // Group patterns by period
            const periodGroups = new Map()
            patterns.forEach((pattern) => {
                const period = pattern.period
                if (!periodGroups.has(period)) {
                    periodGroups.set(period, [])
                }
                periodGroups.get(period).push(pattern)
            })

            // Calculate basket-level patterns
            for (const [period, periodPatterns] of periodGroups) {
                const avgReturn = this.calculateMean(periodPatterns.map((p) => p.avgReturn))
                const avgVolatility = this.calculateMean(periodPatterns.map((p) => p.volatility))
                const avgWinRate = this.calculateMean(periodPatterns.map((p) => p.winRate))
                const totalSampleSize = periodPatterns.reduce((sum, p) => sum + p.sampleSize, 0)
                const avgConfidence = this.calculateMean(periodPatterns.map((p) => p.confidence))

                results.patterns.push({
                    period,
                    periodName: this.getPeriodName(period, analysisType),
                    avgReturn,
                    avgVolatility,
                    avgWinRate,
                    totalSampleSize,
                    avgConfidence,
                    symbolCount: periodPatterns.length,
                    bestSymbol: periodPatterns[0], // Already sorted by avgReturn desc
                    worstSymbol: periodPatterns[periodPatterns.length - 1],
                })
            }

            // Calculate summary statistics
            results.summary = {
                bestPeriod: results.patterns.reduce((best, current) =>
                    current.avgReturn > best.avgReturn ? current : best
                ),
                worstPeriod: results.patterns.reduce((worst, current) =>
                    current.avgReturn < worst.avgReturn ? current : worst
                ),
                avgBasketReturn: this.calculateMean(results.patterns.map((p) => p.avgReturn)),
                avgBasketWinRate: this.calculateMean(results.patterns.map((p) => p.avgWinRate)),
            }

            return results
        } catch (error) {
            console.error(`Error analyzing basket seasonality for ${basketName}:`, error)
            throw error
        }
    }

    /**
     * Compare baskets performance
     */
    async compareBaskets(basketNames, analysisType = 'monthly') {
        try {
            const comparison = {
                analysisType,
                baskets: [],
                summary: {
                    bestBasket: null,
                    worstBasket: null,
                    avgReturns: [],
                },
            }

            for (const basketName of basketNames) {
                const analysis = await this.analyzeBasketSeasonality(basketName, analysisType)
                if (analysis.patterns && analysis.patterns.length > 0) {
                    comparison.baskets.push({
                        name: basketName,
                        totalSymbols: analysis.totalSymbols,
                        avgReturn: analysis.summary.avgBasketReturn,
                        avgWinRate: analysis.summary.avgBasketWinRate,
                        patternCount: analysis.patterns.length,
                        bestPeriod: analysis.summary.bestPeriod,
                    })
                }
            }

            // Find best and worst performing baskets
            if (comparison.baskets.length > 0) {
                comparison.summary.bestBasket = comparison.baskets.reduce((best, current) =>
                    current.avgReturn > best.avgReturn ? current : best
                )
                comparison.summary.worstBasket = comparison.baskets.reduce((worst, current) =>
                    current.avgReturn < worst.avgReturn ? current : worst
                )
                comparison.summary.avgReturns = comparison.baskets.map((b) => b.avgReturn)
            }

            return comparison
        } catch (error) {
            console.error('Error comparing baskets:', error)
            throw error
        }
    }

    /**
     * Get basket performance over time
     */
    async getBasketPerformanceOverTime(basketName, startDate, endDate) {
        try {
            const basket = await this.getBasketByName(basketName)
            if (!basket) {
                throw new Error(`Basket ${basketName} not found`)
            }

            const tickerIds = basket.basketItems.map((item) => item.tickerId)

            // Get daily data for all tickers in basket
            const dailyData = await prisma.dailySeasonalityData.findMany({
                where: {
                    tickerId: { in: tickerIds },
                    date: {
                        gte: startDate,
                        lte: endDate,
                    },
                },
                include: {
                    ticker: true,
                },
                orderBy: { date: 'asc' },
            })

            if (dailyData.length === 0) {
                return { message: 'No data found for basket performance analysis' }
            }

            // Group by date and calculate basket-level metrics
            const dateGroups = new Map()
            dailyData.forEach((record) => {
                const dateKey = record.date.toISOString().split('T')[0]
                if (!dateGroups.has(dateKey)) {
                    dateGroups.set(dateKey, [])
                }
                dateGroups.get(dateKey).push(record)
            })

            const performance = []
            for (const [dateKey, records] of dateGroups) {
                const returns = records.map((r) => r.returnPercentage || 0).filter((r) => r !== 0)
                if (returns.length > 0) {
                    performance.push({
                        date: new Date(dateKey),
                        avgReturn: this.calculateMean(returns),
                        winRate: returns.filter((r) => r > 0).length / returns.length,
                        symbolCount: records.length,
                        maxReturn: Math.max(...returns),
                        minReturn: Math.min(...returns),
                    })
                }
            }

            return {
                basketName,
                dateRange: { start: startDate, end: endDate },
                performance: performance.sort((a, b) => a.date - b.date),
                summary: {
                    avgDailyReturn: this.calculateMean(performance.map((p) => p.avgReturn)),
                    avgWinRate: this.calculateMean(performance.map((p) => p.winRate)),
                    bestDay: performance.reduce((best, current) =>
                        current.avgReturn > best.avgReturn ? current : best
                    ),
                    worstDay: performance.reduce((worst, current) =>
                        current.avgReturn < worst.avgReturn ? current : worst
                    ),
                },
            }
        } catch (error) {
            console.error(`Error getting basket performance for ${basketName}:`, error)
            throw error
        }
    }

    /**
     * Initialize complete basket system
     */
    async initializeCompleteBasketSystem() {
        try {
            await this.initializeBaskets()
            await this.populateBasketItems()
            console.log('Complete basket system initialized successfully')
        } catch (error) {
            console.error('Error initializing complete basket system:', error)
            throw error
        }
    }

    // Helper methods

    getPatternType(analysisType) {
        const typeMap = {
            monthly: 'MONTHLY_SEASONAL',
            weekly: 'WEEKLY_SEASONAL',
            quarterly: 'QUARTERLY_SEASONAL',
        }
        return typeMap[analysisType] || 'MONTHLY_SEASONAL'
    }

    getPeriodName(period, analysisType) {
        if (analysisType === 'monthly') {
            const monthNames = [
                'January',
                'February',
                'March',
                'April',
                'May',
                'June',
                'July',
                'August',
                'September',
                'October',
                'November',
                'December',
            ]
            return monthNames[period - 1] || `Month ${period}`
        } else if (analysisType === 'weekly') {
            const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
            return dayNames[period] || `Day ${period}`
        } else if (analysisType === 'quarterly') {
            return `Q${period}`
        }
        return `Period ${period}`
    }

    calculateMean(values) {
        if (values.length === 0) return 0
        return values.reduce((sum, val) => sum + val, 0) / values.length
    }
}

module.exports = new BasketService()
