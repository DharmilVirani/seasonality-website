/**
 * Political Cycle & Special Days Service
 *
 * Handles election cycles, special events, and their impact on financial markets
 * Migrated from Python system with enhanced database integration
 */

const fs = require('fs').promises
const path = require('path')
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

class PoliticalCycleService {
    constructor() {
        this.electionsData = new Map()
        this.specialDaysData = []

        // Election year classifications from Python helper.py
        this.electionYearList = {
            1952: true,
            1957: true,
            1962: true,
            1967: true,
            1971: true,
            1977: true,
            1980: true,
            1984: true,
            1989: true,
            1991: true,
            1996: true,
            1998: true,
            1999: true,
            2004: true,
            2009: true,
            2014: true,
            2019: true,
        }

        // Modi years (special case for India - Python equivalent: 'Modi Years')
        this.modiYears = new Set([2014, 2019])

        // Election color mapping from Python (Python equivalent: MaincolorDict)
        this.electionColorDict = {
            'All Years': '#000000',
            'Election Years': '#000000',
            'Post Election Years': '#008000',
            'Pre Election Years': '#FF0000',
            'Mid Election Years': '#0000FF',
            'Modi Years': '#FF00FF',
            'Current Year': '#AD0AFD',
        }
    }

    /**
     * Initialize political cycles and special days from data files
     */
    async initializeData() {
        try {
            await this.loadElectionData()
            await this.loadSpecialDaysData()
            console.log('Political cycle and special days data initialized')
        } catch (error) {
            console.error('Error initializing political cycle data:', error)
        }
    }

    /**
     * Load election data from CSV files
     */
    async loadElectionData() {
        try {
            // Load India elections
            const indiaElectionsPath = path.join(__dirname, '../../old_software/elections/INDIA.csv')
            const indiaElections = await this.parseElectionCSV(indiaElectionsPath, 'INDIA', 'PARLIAMENTARY')
            indiaElections.forEach((election) => this.electionsData.set(election.id, election))

            // Load USA elections
            const usaElectionsPath = path.join(__dirname, '../../old_software/elections/USA.csv')
            const usaElections = await this.parseElectionCSV(usaElectionsPath, 'USA', 'PRESIDENTIAL')
            usaElections.forEach((election) => this.electionsData.set(election.id, election))

            console.log(`Loaded ${this.electionsData.size} election records`)
        } catch (error) {
            console.error('Error loading election data:', error)
        }
    }

    /**
     * Parse election CSV file
     */
    async parseElectionCSV(filePath, country, cycleType) {
        try {
            const fileContent = await fs.readFile(filePath, 'utf8')
            const lines = fileContent.trim().split('\n')
            const elections = []

            // Skip header if exists
            const startIndex = lines[0].toLowerCase().includes('date') ? 1 : 0

            for (let i = startIndex; i < lines.length; i++) {
                const line = lines[i].trim()
                if (!line) continue

                const [dateStr, name, impactStr] = line.split(',').map((s) => s.trim())

                if (!dateStr || !name) continue

                const date = new Date(dateStr)
                if (isNaN(date.getTime())) continue

                const impact = impactStr ? parseFloat(impactStr) || 0 : 0

                elections.push({
                    name: name,
                    country: country,
                    cycleType: cycleType,
                    startDate: date,
                    endDate: date, // Single day elections
                    impactScore: Math.max(-1, Math.min(1, impact)), // Clamp between -1 and 1
                })
            }

            return elections
        } catch (error) {
            console.error(`Error parsing election CSV ${filePath}:`, error)
            return []
        }
    }

    /**
     * Load special days from CSV
     */
    async loadSpecialDaysData() {
        try {
            const specialDaysPath = path.join(__dirname, '../../old_software/specialDays/specialDays.csv')
            const fileContent = await fs.readFile(specialDaysPath, 'utf8')
            const lines = fileContent.trim().split('\n')

            const startIndex = lines[0].toLowerCase().includes('date') ? 1 : 0

            for (let i = startIndex; i < lines.length; i++) {
                const line = lines[i].trim()
                if (!line) continue

                const [dateStr, name, type, country, importanceStr] = line.split(',').map((s) => s.trim())

                if (!dateStr || !name) continue

                const date = new Date(dateStr)
                if (isNaN(date.getTime())) continue

                this.specialDaysData.push({
                    date: date,
                    name: name,
                    type: type || 'EVENT',
                    country: country || 'GLOBAL',
                    importance: parseInt(importanceStr) || 1,
                })
            }

            console.log(`Loaded ${this.specialDaysData.length} special days`)
        } catch (error) {
            console.error('Error loading special days data:', error)
        }
    }

    /**
     * Store political cycles in database
     */
    async storePoliticalCycles() {
        try {
            for (const election of this.electionsData.values()) {
                await prisma.politicalCycle.upsert({
                    where: {
                        name_country_cycleType: {
                            name: election.name,
                            country: election.country,
                            cycleType: election.cycleType,
                        },
                    },
                    update: {
                        startDate: election.startDate,
                        endDate: election.endDate,
                        impactScore: election.impactScore,
                    },
                    create: {
                        name: election.name,
                        country: election.country,
                        cycleType: election.cycleType,
                        startDate: election.startDate,
                        endDate: election.endDate,
                        impactScore: election.impactScore,
                    },
                })
            }
            console.log('Political cycles stored in database')
        } catch (error) {
            console.error('Error storing political cycles:', error)
        }
    }

    /**
     * Store special days in database
     */
    async storeSpecialDays() {
        try {
            for (const day of this.specialDaysData) {
                await prisma.specialDay.upsert({
                    where: {
                        date_name_country: {
                            date: day.date,
                            name: day.name,
                            country: day.country,
                        },
                    },
                    update: {
                        type: day.type,
                        importance: day.importance,
                    },
                    create: {
                        date: day.date,
                        name: day.name,
                        type: day.type,
                        country: day.country,
                        importance: day.importance,
                    },
                })
            }
            console.log('Special days stored in database')
        } catch (error) {
            console.error('Error storing special days:', error)
        }
    }

    /**
     * Get political cycles for a specific date range
     */
    async getPoliticalCycles(startDate, endDate) {
        try {
            return await prisma.politicalCycle.findMany({
                where: {
                    OR: [
                        {
                            AND: [{ startDate: { lte: endDate } }, { endDate: { gte: startDate } }],
                        },
                        {
                            startDate: { gte: startDate, lte: endDate },
                        },
                    ],
                },
                orderBy: { startDate: 'asc' },
            })
        } catch (error) {
            console.error('Error fetching political cycles:', error)
            return []
        }
    }

    /**
     * Get special days for a specific date range
     */
    async getSpecialDays(startDate, endDate, country = null) {
        try {
            const whereClause = {
                date: {
                    gte: startDate,
                    lte: endDate,
                },
            }

            if (country) {
                whereClause.country = country
            }

            return await prisma.specialDay.findMany({
                where: whereClause,
                orderBy: { date: 'asc' },
            })
        } catch (error) {
            console.error('Error fetching special days:', error)
            return []
        }
    }

    /**
     * Calculate political impact for a specific date
     */
    async calculatePoliticalImpact(date, tickerCountry = 'GLOBAL') {
        try {
            const cycles = await this.getPoliticalCycles(date, date)
            let totalImpact = 0
            let impactCount = 0

            for (const cycle of cycles) {
                // Only consider cycles relevant to the ticker's country or global
                if (cycle.country === tickerCountry || cycle.country === 'GLOBAL') {
                    totalImpact += cycle.impactScore || 0
                    impactCount++
                }
            }

            return impactCount > 0 ? totalImpact / impactCount : 0
        } catch (error) {
            console.error('Error calculating political impact:', error)
            return 0
        }
    }

    /**
     * Find nearest special day and calculate days difference
     */
    async findNearestSpecialDay(date, country = null, maxDaysAhead = 365) {
        try {
            const startDate = new Date(date)
            const endDate = new Date(date)
            endDate.setDate(endDate.getDate() + maxDaysAhead)

            const specialDays = await this.getSpecialDays(startDate, endDate, country)

            if (specialDays.length === 0) {
                return { daysToSpecialDay: null, specialDay: null }
            }

            // Find the nearest special day
            let nearestDay = null
            let minDaysDiff = Infinity

            for (const day of specialDays) {
                const daysDiff = Math.ceil((day.date - date) / (1000 * 60 * 60 * 24))
                if (daysDiff >= 0 && daysDiff < minDaysDiff) {
                    minDaysDiff = daysDiff
                    nearestDay = day
                }
            }

            return {
                daysToSpecialDay: nearestDay ? minDaysDiff : null,
                specialDay: nearestDay,
            }
        } catch (error) {
            console.error('Error finding nearest special day:', error)
            return { daysToSpecialDay: null, specialDay: null }
        }
    }

    /**
     * Enhance processed data with political cycle and special day information
     */
    async enhanceProcessedData(processedData) {
        try {
            const enhancedData = []

            for (const data of processedData) {
                const date = new Date(data.processedDate || data.originalDate)

                // Calculate political impact
                const politicalCycleId = await this.findRelevantPoliticalCycle(date, data.tickerId)
                const politicalImpact = await this.calculatePoliticalImpact(date)

                // Find nearest special day
                const { daysToSpecialDay, specialDay } = await this.findNearestSpecialDay(date)

                enhancedData.push({
                    ...data,
                    politicalCycleId: politicalCycleId,
                    politicalImpact: politicalImpact,
                    daysToSpecialDay: daysToSpecialDay,
                    specialDayId: specialDay ? specialDay.id : null,
                })
            }

            return enhancedData
        } catch (error) {
            console.error('Error enhancing processed data:', error)
            return processedData
        }
    }

    /**
     * Find relevant political cycle for a date and ticker
     */
    async findRelevantPoliticalCycle(date, tickerId) {
        try {
            // For now, we'll use a simple country mapping based on ticker symbol
            // In a real implementation, you'd have a ticker country mapping
            const ticker = await prisma.ticker.findUnique({
                where: { id: tickerId },
            })

            if (!ticker) return null

            // Simple heuristic: Indian tickers (mostly symbols) vs US tickers (like Dow Jones)
            let country = 'GLOBAL'
            if (ticker.symbol.includes('Dow Jones') || ticker.symbol === 'FINNIFTY' || ticker.symbol === 'BANKNIFTY') {
                country = 'USA'
            } else {
                country = 'INDIA'
            }

            const cycles = await prisma.politicalCycle.findMany({
                where: {
                    country: country,
                    startDate: { lte: date },
                    endDate: { gte: date },
                },
                orderBy: { impactScore: 'desc' }, // Prefer cycles with higher impact
            })

            return cycles.length > 0 ? cycles[0].id : null
        } catch (error) {
            console.error('Error finding relevant political cycle:', error)
            return null
        }
    }

    /**
     * Generate election impact analysis
     */
    async generateElectionImpactAnalysis(tickerId, electionCycle = null) {
        try {
            let whereClause = {}

            if (electionCycle) {
                whereClause = {
                    politicalCycle: {
                        name: { contains: electionCycle, mode: 'insensitive' },
                    },
                }
            }

            const data = await prisma.processedData.findMany({
                where: {
                    tickerId,
                    politicalCycleId: { not: null },
                    ...whereClause,
                },
                include: {
                    politicalCycle: true,
                },
                orderBy: { processedDate: 'asc' },
            })

            if (data.length === 0) {
                return { message: 'No data found for election impact analysis' }
            }

            // Group by political cycle
            const cycleGroups = new Map()
            data.forEach((record) => {
                const cycleId = record.politicalCycleId
                if (!cycleGroups.has(cycleId)) {
                    cycleGroups.set(cycleId, [])
                }
                cycleGroups.get(cycleId).push(record)
            })

            const analysis = {
                tickerId,
                totalElectionDays: data.length,
                cycles: [],
            }

            for (const [cycleId, records] of cycleGroups) {
                const cycle = records[0].politicalCycle
                const returns = records.map((r) => r.returns || 0)
                const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length
                const volatility = this.calculateStandardDeviation(returns)
                const positiveReturns = returns.filter((r) => r > 0).length
                const winRate = positiveReturns / returns.length

                analysis.cycles.push({
                    cycleId: cycle.id,
                    cycleName: cycle.name,
                    cycleCountry: cycle.country,
                    impactScore: cycle.impactScore,
                    dataPoints: records.length,
                    avgReturn,
                    volatility,
                    winRate,
                    maxReturn: Math.max(...returns),
                    minReturn: Math.min(...returns),
                })
            }

            return analysis
        } catch (error) {
            console.error('Error generating election impact analysis:', error)
            throw error
        }
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
     * Get upcoming special events
     */
    async getUpcomingSpecialEvents(daysAhead = 30, country = null) {
        try {
            const today = new Date()
            const futureDate = new Date(today)
            futureDate.setDate(futureDate.getDate() + daysAhead)

            return await this.getSpecialDays(today, futureDate, country)
        } catch (error) {
            console.error('Error getting upcoming special events:', error)
            return []
        }
    }

    /**
     * Initialize all political cycle and special day data
     */
    async initializeAll() {
        try {
            await this.initializeData()
            await this.storePoliticalCycles()
            await this.storeSpecialDays()
            await this.populateElectionYears()
            console.log('Political cycle and special days initialization completed')
        } catch (error) {
            console.error('Error in initializeAll:', error)
            throw error
        }
    }

    /**
     * Populate ElectionYear table with classification data (Ported from Python helper.py)
     */
    async populateElectionYears() {
        try {
            for (const [year, isElectionYear] of Object.entries(this.electionYearList)) {
                const yearNum = parseInt(year)
                const electionYear = await prisma.electionYear.upsert({
                    where: {
                        year_country: {
                            year: yearNum,
                            country: 'INDIA', // Default to India, can be extended
                        },
                    },
                    update: {},
                    create: {
                        year: yearNum,
                        country: 'INDIA',
                        electionType: 'PARLIAMENTARY',
                        isElectionYear: isElectionYear,

                        // Calculate election phases (Python equivalent logic)
                        isPreElectionYear: this.isPreElectionYear(yearNum),
                        isMidElectionYear: this.isMidElectionYear(yearNum),
                        isPostElectionYear: this.isPostElectionYear(yearNum),
                        isModiYear: this.modiYears.has(yearNum),

                        // Set election date (approximate)
                        electionDate: new Date(yearNum, 4, 7), // May 7th (typical Indian election month)

                        // Political context (simplified)
                        rulingParty: this.getRulingParty(yearNum),
                        oppositionParty: this.getOppositionParty(yearNum),
                    },
                })
            }
            console.log('Election years populated in database')
        } catch (error) {
            console.error('Error populating election years:', error)
        }
    }

    /**
     * Check if year is pre-election year (Python equivalent: logic for "Pre Election Years")
     */
    isPreElectionYear(year) {
        // Pre-election year is typically the year before an election
        const electionYears = Object.keys(this.electionYearList).map((y) => parseInt(y))
        return electionYears.some((electionYear) => year === electionYear - 1)
    }

    /**
     * Check if year is mid-election year (Python equivalent: logic for "Mid Election Years")
     */
    isMidElectionYear(year) {
        // Mid-election year is the election year itself
        return this.electionYearList[year] === true
    }

    /**
     * Check if year is post-election year (Python equivalent: logic for "Post Election Years")
     */
    isPostElectionYear(year) {
        // Post-election year is typically the year after an election
        const electionYears = Object.keys(this.electionYearList).map((y) => parseInt(y))
        return electionYears.some((electionYear) => year === electionYear + 1)
    }

    /**
     * Get ruling party for a year (simplified political context)
     */
    getRulingParty(year) {
        if (year <= 1977) return 'INC' // Indian National Congress
        if (year <= 1980) return 'JANATA' // Janata Party
        if (year <= 1984) return 'INC'
        if (year <= 1989) return 'BJP' // Bharatiya Janata Party
        if (year <= 1991) return 'JANATA_DAL'
        if (year <= 1996) return 'INC'
        if (year <= 1998) return 'UNITED_FRONT'
        if (year <= 1999) return 'BJP'
        if (year <= 2004) return 'NDA'
        if (year <= 2009) return 'UPA'
        if (year <= 2014) return 'UPA'
        if (year <= 2019) return 'NDA'
        return 'NDA'
    }

    /**
     * Get opposition party for a year (simplified political context)
     */
    getOppositionParty(year) {
        if (year <= 1977) return 'SWATANTRA'
        if (year <= 1980) return 'INC'
        if (year <= 1984) return 'JANATA'
        if (year <= 1989) return 'INC'
        if (year <= 1991) return 'BJP'
        if (year <= 1996) return 'BJP'
        if (year <= 1998) return 'BJP'
        if (year <= 1999) return 'INC'
        if (year <= 2004) return 'INC'
        if (year <= 2009) return 'NDA'
        if (year <= 2014) return 'NDA'
        if (year <= 2019) return 'INC'
        return 'INC'
    }

    /**
     * Get election filter based on type (Python equivalent: getElectionfilterDataFrame)
     */
    getElectionFilter(typeName, df) {
        const currentYear = new Date().getFullYear()

        switch (typeName) {
            case 'All Years':
                return df // Return all data

            case 'Current Year':
                return df.filter((record) => {
                    const recordYear = new Date(record.date).getFullYear()
                    return recordYear === currentYear
                })

            case 'Election Years':
                return df.filter((record) => {
                    const recordYear = new Date(record.date).getFullYear()
                    return this.electionYearList[recordYear] === true
                })

            case 'Pre Election Years':
                return df.filter((record) => {
                    const recordYear = new Date(record.date).getFullYear()
                    return this.isPreElectionYear(recordYear)
                })

            case 'Mid Election Years':
                return df.filter((record) => {
                    const recordYear = new Date(record.date).getFullYear()
                    return this.isMidElectionYear(recordYear)
                })

            case 'Post Election Years':
                return df.filter((record) => {
                    const recordYear = new Date(record.date).getFullYear()
                    return this.isPostElectionYear(recordYear)
                })

            case 'Modi Years':
                return df.filter((record) => {
                    const recordYear = new Date(record.date).getFullYear()
                    return this.modiYears.has(recordYear)
                })

            default:
                return df
        }
    }

    /**
     * Get election year analysis for a ticker
     */
    async getElectionYearAnalysis(tickerId) {
        try {
            const electionYears = await prisma.electionYear.findMany({
                where: { country: 'INDIA' },
                orderBy: { year: 'asc' },
            })

            const analysis = {
                tickerId,
                electionYears: [],
                summary: {
                    totalElectionYears: electionYears.length,
                    avgReturnElectionYears: 0,
                    avgReturnNonElectionYears: 0,
                    bestElectionYear: null,
                    worstElectionYear: null,
                },
            }

            // Get daily data for analysis
            const dailyData = await prisma.dailySeasonalityData.findMany({
                where: { tickerId },
                orderBy: { date: 'asc' },
            })

            if (dailyData.length === 0) {
                return analysis
            }

            // Analyze each election year
            for (const electionYear of electionYears) {
                const yearData = dailyData.filter((record) => {
                    const recordYear = new Date(record.date).getFullYear()
                    return recordYear === electionYear.year
                })

                if (yearData.length === 0) continue

                const returns = yearData.map((r) => r.returnPercentage || 0).filter((r) => r !== 0)
                const avgReturn = returns.length > 0 ? returns.reduce((sum, r) => sum + r, 0) / returns.length : 0
                const positiveDays = returns.filter((r) => r > 0).length
                const winRate = returns.length > 0 ? positiveDays / returns.length : 0

                analysis.electionYears.push({
                    year: electionYear.year,
                    isElectionYear: electionYear.isElectionYear,
                    isPreElectionYear: electionYear.isPreElectionYear,
                    isMidElectionYear: electionYear.isMidElectionYear,
                    isPostElectionYear: electionYear.isPostElectionYear,
                    isModiYear: electionYear.isModiYear,
                    dataPoints: yearData.length,
                    avgReturn,
                    winRate,
                    maxReturn: returns.length > 0 ? Math.max(...returns) : 0,
                    minReturn: returns.length > 0 ? Math.min(...returns) : 0,
                })
            }

            return analysis
        } catch (error) {
            console.error('Error getting election year analysis:', error)
            throw error
        }
    }
}

module.exports = new PoliticalCycleService()
