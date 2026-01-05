/**
 * Timeframe Service - Multi-Timeframe Data Generation
 * 
 * Replicates Python pandas resample() operations for financial data processing
 * Converts daily OHLCV data to Weekly (Monday/Expiry), Monthly, and Yearly timeframes
 * 
 * @author Seasonality SaaS Team
 * @version 1.0.0
 */

const { PrismaClient } = require('@prisma/client');
const {
    startOfWeek,
    endOfWeek,
    startOfMonth,
    endOfMonth,
    startOfYear,
    endOfYear,
    addDays,
    subDays,
    format,
    parseISO,
    getDay,
    getWeek,
    getMonth,
    getYear,
    isValid,
    differenceInDays
} = require('date-fns');

const prisma = new PrismaClient();

/**
 * Column aggregation logic matching Python pandas resample operations
 * Replicates: columnLogic = {'Open': 'first', 'High': 'max', 'Low': 'min', 'Close': 'last', 'Volume': 'sum', 'OpenInterest': 'last'}
 */
const COLUMN_LOGIC = {
    open: 'first',
    high: 'max',
    low: 'min',
    close: 'last',
    volume: 'sum',
    openInterest: 'last'
};

/**
 * TimeframeService Class
 * Handles all multi-timeframe data generation operations
 */
class TimeframeService {
    constructor() {
        this.prisma = prisma;
    }

    /**
     * Generate Monday Weekly Data
     * Replicates: symbolDailyData.resample('W-SUN').apply(columnLogic) then backdate to Monday
     * 
     * @param {Array} dailyData - Array of daily OHLCV records
     * @param {number} tickerId - Ticker ID for database operations
     * @returns {Array} Monday weekly aggregated data
     */
    async generateMondayWeeklyData(dailyData, tickerId) {
        try {
            if (!dailyData || dailyData.length === 0) {
                throw new Error('Daily data is required for Monday weekly generation');
            }

            // Group data by Monday-based weeks (resample 'W-SUN' equivalent)
            const weeklyGroups = this._groupByMondayWeeks(dailyData);
            const weeklyData = [];

            for (const [weekEndDate, weekData] of weeklyGroups) {
                // Calculate Monday date (backdate from Sunday by 6 days)
                const mondayDate = subDays(new Date(weekEndDate), 6);

                // Apply aggregation logic
                const aggregated = this._aggregateOHLCV(weekData);

                weeklyData.push({
                    tickerId,
                    date: mondayDate,
                    ...aggregated,
                    weekday: format(mondayDate, 'EEEE')
                });
            }

            // Calculate week numbers and derived fields
            return this._calculateWeekNumbers(weeklyData, 'monday');
        } catch (error) {
            console.error('Error generating Monday weekly data:', error);
            throw error;
        }
    }

    /**
     * Generate Expiry Weekly Data  
     * Replicates: symbolDailyData.resample('W-THU').apply(columnLogic) for Friday expiry weeks
     * 
     * @param {Array} dailyData - Array of daily OHLCV records
     * @param {number} tickerId - Ticker ID for database operations
     * @returns {Array} Expiry weekly aggregated data
     */
    async generateExpiryWeeklyData(dailyData, tickerId) {
        try {
            if (!dailyData || dailyData.length === 0) {
                throw new Error('Daily data is required for expiry weekly generation');
            }

            // Group data by Thursday-ending weeks (resample 'W-THU' equivalent)
            const weeklyGroups = this._groupByExpiryWeeks(dailyData);
            const weeklyData = [];

            for (const [weekEndDate, weekData] of weeklyGroups) {
                // Thursday end date represents Friday expiry
                const fridayDate = addDays(new Date(weekEndDate), 1);
                const startDate = subDays(fridayDate, 6); // Monday start

                // Apply aggregation logic
                const aggregated = this._aggregateOHLCV(weekData);

                weeklyData.push({
                    tickerId,
                    date: fridayDate,
                    startDate,
                    ...aggregated,
                    weekday: format(fridayDate, 'EEEE')
                });
            }

            // Calculate week numbers and derived fields
            return this._calculateWeekNumbers(weeklyData, 'expiry');
        } catch (error) {
            console.error('Error generating expiry weekly data:', error);
            throw error;
        }
    }

    /**
     * Generate Monthly Data
     * Replicates: symbolDailyData.resample('M').apply(columnLogic)
     * 
     * @param {Array} dailyData - Array of daily OHLCV records  
     * @param {number} tickerId - Ticker ID for database operations
     * @returns {Array} Monthly aggregated data
     */
    async generateMonthlyData(dailyData, tickerId) {
        try {
            if (!dailyData || dailyData.length === 0) {
                throw new Error('Daily data is required for monthly generation');
            }

            // Group data by calendar months
            const monthlyGroups = this._groupByMonths(dailyData);
            const monthlyData = [];

            for (const [monthKey, monthData] of monthlyGroups) {
                // Use first day of month as date
                const [year, month] = monthKey.split('-');
                const monthDate = new Date(parseInt(year), parseInt(month) - 1, 1);

                // Apply aggregation logic
                const aggregated = this._aggregateOHLCV(monthData);

                monthlyData.push({
                    tickerId,
                    date: monthDate,
                    ...aggregated,
                    weekday: format(monthDate, 'EEEE')
                });
            }

            // Calculate derived fields
            return this._calculateMonthlyFields(monthlyData);
        } catch (error) {
            console.error('Error generating monthly data:', error);
            throw error;
        }
    }

    /**
     * Generate Yearly Data
     * Replicates: symbolDailyData.resample('Y').apply(columnLogic)
     * 
     * @param {Array} dailyData - Array of daily OHLCV records
     * @param {number} tickerId - Ticker ID for database operations  
     * @returns {Array} Yearly aggregated data
     */
    async generateYearlyData(dailyData, tickerId) {
        try {
            if (!dailyData || dailyData.length === 0) {
                throw new Error('Daily data is required for yearly generation');
            }

            // Group data by calendar years
            const yearlyGroups = this._groupByYears(dailyData);
            const yearlyData = [];

            for (const [year, yearData] of yearlyGroups) {
                // Use January 1st as date
                const yearDate = new Date(parseInt(year), 0, 1);

                // Apply aggregation logic
                const aggregated = this._aggregateOHLCV(yearData);

                yearlyData.push({
                    tickerId,
                    date: yearDate,
                    ...aggregated,
                    weekday: format(yearDate, 'EEEE')
                });
            }

            // Calculate derived fields
            return this._calculateYearlyFields(yearlyData);
        } catch (error) {
            console.error('Error generating yearly data:', error);
            throw error;
        }
    }

    /**
     * Calculate Return Percentages
     * Replicates: ReturnPoints = Close - Close.shift(1), ReturnPercentage = (ReturnPoints / Close.shift(1)) * 100
     * 
     * @param {Array} data - Timeframe data array
     * @param {string} timeframe - Timeframe type for field naming
     * @returns {Array} Data with return calculations
     */
    calculateReturnPercentages(data, timeframe) {
        try {
            if (!data || data.length === 0) return data;

            const fieldSuffix = timeframe === 'daily' ? '' :
                timeframe === 'monday' ? 'Week' :
                    timeframe === 'expiry' ? 'Week' :
                        timeframe === 'monthly' ? 'Month' :
                            timeframe === 'yearly' ? 'Year' : '';

            return data.map((record, index) => {
                if (index === 0) {
                    // First record has no previous data
                    return {
                        ...record,
                        returnPoints: null,
                        returnPercentage: null,
                        [`positive${fieldSuffix}`]: null
                    };
                }

                const previousClose = data[index - 1].close;
                const returnPoints = record.close - previousClose;
                const returnPercentage = previousClose !== 0 ?
                    Math.round((returnPoints / previousClose) * 100 * 100) / 100 : null;

                return {
                    ...record,
                    returnPoints,
                    returnPercentage,
                    [`positive${fieldSuffix}`]: returnPoints > 0
                };
            });
        } catch (error) {
            console.error('Error calculating return percentages:', error);
            throw error;
        }
    }

    /**
     * Link Cross-Timeframe Data
     * Replicates Python functions: getYearlyReturns(), getMonthlyReturns(), getMondayWeeklyData(), getExpiryWeeklyData()
     * 
     * @param {Array} daily - Daily data
     * @param {Array} weekly - Weekly data  
     * @param {Array} monthly - Monthly data
     * @param {Array} yearly - Yearly data
     * @returns {Object} Linked timeframe data
     */
    async linkCrossTimeframeData(daily, weekly, monthly, yearly) {
        try {
            // Create lookup maps for efficient cross-referencing
            const monthlyMap = this._createDateLookupMap(monthly, 'month');
            const yearlyMap = this._createDateLookupMap(yearly, 'year');
            const mondayWeeklyMap = this._createDateLookupMap(weekly.monday || [], 'week');
            const expiryWeeklyMap = this._createDateLookupMap(weekly.expiry || [], 'week');

            // Link daily data with higher timeframes
            const linkedDaily = daily.map(dailyRecord => {
                const recordDate = new Date(dailyRecord.date);

                return {
                    ...dailyRecord,
                    // Monday weekly references
                    mondayWeeklyDate: this._getMondayOfWeek(recordDate),
                    ...this._lookupTimeframeData(recordDate, mondayWeeklyMap, 'mondayWeekly'),

                    // Expiry weekly references  
                    expiryWeeklyDate: this._getFridayOfWeek(recordDate),
                    ...this._lookupTimeframeData(recordDate, expiryWeeklyMap, 'expiryWeekly'),

                    // Monthly references
                    ...this._lookupTimeframeData(recordDate, monthlyMap, 'monthly'),

                    // Yearly references
                    ...this._lookupTimeframeData(recordDate, yearlyMap, 'yearly')
                };
            });

            return {
                daily: linkedDaily,
                weekly: {
                    monday: weekly.monday || [],
                    expiry: weekly.expiry || []
                },
                monthly,
                yearly
            };
        } catch (error) {
            console.error('Error linking cross-timeframe data:', error);
            throw error;
        }
    }

    // Private helper methods

    /**
     * Group daily data by Monday-based weeks (W-SUN equivalent)
     */
    _groupByMondayWeeks(dailyData) {
        const groups = new Map();

        dailyData.forEach(record => {
            const date = new Date(record.date);
            // Get Sunday of the week (end of Monday-based week)
            const sunday = endOfWeek(date, { weekStartsOn: 1 }); // Monday = 1
            const key = format(sunday, 'yyyy-MM-dd');

            if (!groups.has(key)) {
                groups.set(key, []);
            }
            groups.get(key).push(record);
        });

        return groups;
    }

    /**
     * Group daily data by Thursday-ending weeks (W-THU equivalent)
     */
    _groupByExpiryWeeks(dailyData) {
        const groups = new Map();

        dailyData.forEach(record => {
            const date = new Date(record.date);
            // Calculate Thursday of current week (Friday expiry week ends Thursday)
            const dayOfWeek = getDay(date); // 0 = Sunday, 4 = Thursday, 5 = Friday
            let thursday;

            if (dayOfWeek <= 4) { // Sunday to Thursday
                thursday = addDays(date, 4 - dayOfWeek);
            } else { // Friday, Saturday  
                thursday = addDays(date, 4 + (7 - dayOfWeek));
            }

            const key = format(thursday, 'yyyy-MM-dd');

            if (!groups.has(key)) {
                groups.set(key, []);
            }
            groups.get(key).push(record);
        });

        return groups;
    }

    /**
     * Group daily data by calendar months
     */
    _groupByMonths(dailyData) {
        const groups = new Map();

        dailyData.forEach(record => {
            const date = new Date(record.date);
            const key = format(date, 'yyyy-MM');

            if (!groups.has(key)) {
                groups.set(key, []);
            }
            groups.get(key).push(record);
        });

        return groups;
    }

    /**
     * Group daily data by calendar years
     */
    _groupByYears(dailyData) {
        const groups = new Map();

        dailyData.forEach(record => {
            const date = new Date(record.date);
            const key = getYear(date).toString();

            if (!groups.has(key)) {
                groups.set(key, []);
            }
            groups.get(key).push(record);
        });

        return groups;
    }
    /**
     * Aggregate OHLCV data according to column logic
     * Replicates pandas columnLogic aggregation
     */
    _aggregateOHLCV(records) {
        if (!records || records.length === 0) {
            throw new Error('No records to aggregate');
        }

        // Sort by date to ensure proper first/last selection
        const sortedRecords = records.sort((a, b) => new Date(a.date) - new Date(b.date));

        return {
            open: sortedRecords[0].open, // first
            high: Math.max(...sortedRecords.map(r => r.high)), // max
            low: Math.min(...sortedRecords.map(r => r.low)), // min  
            close: sortedRecords[sortedRecords.length - 1].close, // last
            volume: sortedRecords.reduce((sum, r) => sum + (r.volume || 0), 0), // sum
            openInterest: sortedRecords[sortedRecords.length - 1].openInterest || 0 // last
        };
    }

    /**
     * Calculate week numbers for weekly data
     * Replicates Python week numbering logic
     */
    _calculateWeekNumbers(weeklyData, type) {
        if (!weeklyData || weeklyData.length === 0) return weeklyData;

        let monthlyWeekNumber = null;
        let yearlyWeekNumber = null;
        let lastMonth = null;
        let lastYear = null;

        return weeklyData.map((record, index) => {
            const recordDate = new Date(record.date);
            const currentMonth = getMonth(recordDate);
            const currentYear = getYear(recordDate);

            // Reset monthly week number when month changes
            if (lastMonth === null || currentMonth !== lastMonth) {
                monthlyWeekNumber = 1;
            } else {
                monthlyWeekNumber++;
            }

            // Reset yearly week number when year changes  
            if (lastYear === null || currentYear !== lastYear) {
                yearlyWeekNumber = 1;
            } else {
                yearlyWeekNumber++;
            }

            lastMonth = currentMonth;
            lastYear = currentYear;

            // Calculate return data
            const returnData = index === 0 ? {
                returnPoints: null,
                returnPercentage: null,
                positiveWeek: null
            } : {
                returnPoints: record.close - weeklyData[index - 1].close,
                returnPercentage: weeklyData[index - 1].close !== 0 ?
                    Math.round(((record.close - weeklyData[index - 1].close) / weeklyData[index - 1].close) * 100 * 100) / 100 : null,
                positiveWeek: (record.close - weeklyData[index - 1].close) > 0
            };

            return {
                ...record,
                weekNumberMonthly: monthlyWeekNumber,
                weekNumberYearly: yearlyWeekNumber,
                evenWeekNumberMonthly: (monthlyWeekNumber % 2) === 0,
                evenWeekNumberYearly: (yearlyWeekNumber % 2) === 0,
                ...returnData,
                evenMonth: (currentMonth % 2) === 0,
                evenYear: (currentYear % 2) === 0
            };
        });
    }

    /**
     * Calculate monthly-specific derived fields
     */
    _calculateMonthlyFields(monthlyData) {
        if (!monthlyData || monthlyData.length === 0) return monthlyData;

        return monthlyData.map((record, index) => {
            const recordDate = new Date(record.date);

            // Calculate return data
            const returnData = index === 0 ? {
                returnPoints: null,
                returnPercentage: null,
                positiveMonth: null
            } : {
                returnPoints: record.close - monthlyData[index - 1].close,
                returnPercentage: monthlyData[index - 1].close !== 0 ?
                    Math.round(((record.close - monthlyData[index - 1].close) / monthlyData[index - 1].close) * 100 * 100) / 100 : null,
                positiveMonth: (record.close - monthlyData[index - 1].close) > 0
            };

            return {
                ...record,
                evenMonth: (getMonth(recordDate) % 2) === 0,
                evenYear: (getYear(recordDate) % 2) === 0,
                ...returnData
            };
        });
    }

    /**
     * Calculate yearly-specific derived fields
     */
    _calculateYearlyFields(yearlyData) {
        if (!yearlyData || yearlyData.length === 0) return yearlyData;

        return yearlyData.map((record, index) => {
            const recordDate = new Date(record.date);

            // Calculate return data
            const returnData = index === 0 ? {
                returnPoints: null,
                returnPercentage: null,
                positiveYear: null
            } : {
                returnPoints: record.close - yearlyData[index - 1].close,
                returnPercentage: yearlyData[index - 1].close !== 0 ?
                    Math.round(((record.close - yearlyData[index - 1].close) / yearlyData[index - 1].close) * 100 * 100) / 100 : null,
                positiveYear: (record.close - yearlyData[index - 1].close) > 0
            };

            return {
                ...record,
                evenYear: (getYear(recordDate) % 2) === 0,
                ...returnData
            };
        });
    }

    /**
     * Create date lookup map for cross-timeframe linking
     */
    _createDateLookupMap(data, timeframeType) {
        const map = new Map();

        data.forEach(record => {
            const date = new Date(record.date);
            let key;

            switch (timeframeType) {
                case 'month':
                    key = format(date, 'yyyy-MM');
                    break;
                case 'year':
                    key = getYear(date).toString();
                    break;
                case 'week':
                    key = format(date, 'yyyy-MM-dd');
                    break;
                default:
                    key = format(date, 'yyyy-MM-dd');
            }

            map.set(key, record);
        });

        return map;
    }

    /**
     * Lookup timeframe data for cross-linking
     */
    _lookupTimeframeData(date, lookupMap, prefix) {
        let key;
        const result = {};

        if (prefix.includes('monthly')) {
            key = format(date, 'yyyy-MM');
        } else if (prefix.includes('yearly')) {
            key = getYear(date).toString();
        } else if (prefix.includes('Weekly')) {
            // For weekly, need to find the appropriate week
            key = format(date, 'yyyy-MM-dd');
        }

        const timeframeRecord = lookupMap.get(key);

        if (timeframeRecord) {
            result[`${prefix}ReturnPoints`] = timeframeRecord.returnPoints;
            result[`${prefix}ReturnPercentage`] = timeframeRecord.returnPercentage;

            if (prefix.includes('Weekly')) {
                result[`${prefix.replace('Weekly', '')}WeekNumberMonthly`] = timeframeRecord.weekNumberMonthly;
                result[`${prefix.replace('Weekly', '')}WeekNumberYearly`] = timeframeRecord.weekNumberYearly;
                result[`even${prefix.replace('Weekly', '')}WeekNumberMonthly`] = timeframeRecord.evenWeekNumberMonthly;
                result[`even${prefix.replace('Weekly', '')}WeekNumberYearly`] = timeframeRecord.evenWeekNumberYearly;
                result[`positive${prefix.replace('Weekly', 'Week')}`] = timeframeRecord.positiveWeek;
            } else {
                result[`positive${prefix.charAt(0).toUpperCase() + prefix.slice(1).replace('ly', '')}`] =
                    timeframeRecord[`positive${prefix.charAt(0).toUpperCase() + prefix.slice(1).replace('ly', '')}`];
            }
        }

        return result;
    }

    /**
     * Get Monday of the week for a given date
     */
    _getMondayOfWeek(date) {
        return startOfWeek(date, { weekStartsOn: 1 }); // Monday = 1
    }

    /**
     * Get Friday of the week for a given date (expiry week)
     */
    _getFridayOfWeek(date) {
        const monday = startOfWeek(date, { weekStartsOn: 1 });
        return addDays(monday, 4); // Friday is 4 days after Monday
    }

    /**
     * Process complete timeframe generation for a ticker
     * Main orchestration method
     */
    async processTickerTimeframes(tickerId, dailyData) {
        try {
            console.log(`Processing timeframes for ticker ${tickerId} with ${dailyData.length} daily records`);

            // Generate all timeframes
            const [mondayWeekly, expiryWeekly, monthly, yearly] = await Promise.all([
                this.generateMondayWeeklyData(dailyData, tickerId),
                this.generateExpiryWeeklyData(dailyData, tickerId),
                this.generateMonthlyData(dailyData, tickerId),
                this.generateYearlyData(dailyData, tickerId)
            ]);

            // Link cross-timeframe data
            const linkedData = await this.linkCrossTimeframeData(
                dailyData,
                { monday: mondayWeekly, expiry: expiryWeekly },
                monthly,
                yearly
            );

            console.log(`Generated ${mondayWeekly.length} Monday weekly, ${expiryWeekly.length} expiry weekly, ${monthly.length} monthly, ${yearly.length} yearly records`);

            return linkedData;
        } catch (error) {
            console.error(`Error processing timeframes for ticker ${tickerId}:`, error);
            throw error;
        }
    }

    /**
     * Batch process multiple tickers
     */
    async processBatchTimeframes(tickerDataMap) {
        try {
            const results = new Map();

            for (const [tickerId, dailyData] of tickerDataMap) {
                const timeframeData = await this.processTickerTimeframes(tickerId, dailyData);
                results.set(tickerId, timeframeData);
            }

            return results;
        } catch (error) {
            console.error('Error in batch timeframe processing:', error);
            throw error;
        }
    }

    /**
     * Save timeframe data to database
     */
    async saveTimeframeData(tickerId, timeframeData) {
        try {
            const { daily, weekly, monthly, yearly } = timeframeData;

            // Use transactions for data consistency
            await this.prisma.$transaction(async (tx) => {
                // Save Monday weekly data
                if (weekly.monday && weekly.monday.length > 0) {
                    await tx.mondayWeeklySeasonalityData.createMany({
                        data: weekly.monday.map(record => ({
                            tickerId,
                            date: record.date,
                            open: record.open,
                            high: record.high,
                            low: record.low,
                            close: record.close,
                            volume: record.volume,
                            openInterest: record.openInterest,
                            weekday: record.weekday,
                            weekNumberMonthly: record.weekNumberMonthly,
                            weekNumberYearly: record.weekNumberYearly,
                            evenWeekNumberMonthly: record.evenWeekNumberMonthly,
                            evenWeekNumberYearly: record.evenWeekNumberYearly,
                            returnPoints: record.returnPoints,
                            returnPercentage: record.returnPercentage,
                            positiveWeek: record.positiveWeek,
                            evenMonth: record.evenMonth,
                            evenYear: record.evenYear
                        })),
                        skipDuplicates: true
                    });
                }

                // Save Expiry weekly data
                if (weekly.expiry && weekly.expiry.length > 0) {
                    await tx.expiryWeeklySeasonalityData.createMany({
                        data: weekly.expiry.map(record => ({
                            tickerId,
                            date: record.date,
                            startDate: record.startDate,
                            open: record.open,
                            high: record.high,
                            low: record.low,
                            close: record.close,
                            volume: record.volume,
                            openInterest: record.openInterest,
                            weekday: record.weekday,
                            weekNumberMonthly: record.weekNumberMonthly,
                            weekNumberYearly: record.weekNumberYearly,
                            evenWeekNumberMonthly: record.evenWeekNumberMonthly,
                            evenWeekNumberYearly: record.evenWeekNumberYearly,
                            returnPoints: record.returnPoints,
                            returnPercentage: record.returnPercentage,
                            positiveWeek: record.positiveWeek,
                            evenMonth: record.evenMonth,
                            evenYear: record.evenYear
                        })),
                        skipDuplicates: true
                    });
                }
            });

            console.log(`Saved timeframe data for ticker ${tickerId}`);
        } catch (error) {
            console.error(`Error saving timeframe data for ticker ${tickerId}:`, error);
            throw error;
        }
    }

    /**
     * Validate aggregation results against expected values
     * Used for testing and quality assurance
     */
    validateAggregation(original, aggregated, timeframe) {
        try {
            const validation = {
                isValid: true,
                errors: [],
                metrics: {}
            };

            // Validate OHLCV logic
            if (aggregated.open !== original[0].open) {
                validation.errors.push(`Open mismatch: expected ${original[0].open}, got ${aggregated.open}`);
                validation.isValid = false;
            }

            const expectedHigh = Math.max(...original.map(r => r.high));
            if (Math.abs(aggregated.high - expectedHigh) > 0.001) {
                validation.errors.push(`High mismatch: expected ${expectedHigh}, got ${aggregated.high}`);
                validation.isValid = false;
            }

            const expectedLow = Math.min(...original.map(r => r.low));
            if (Math.abs(aggregated.low - expectedLow) > 0.001) {
                validation.errors.push(`Low mismatch: expected ${expectedLow}, got ${aggregated.low}`);
                validation.isValid = false;
            }

            if (aggregated.close !== original[original.length - 1].close) {
                validation.errors.push(`Close mismatch: expected ${original[original.length - 1].close}, got ${aggregated.close}`);
                validation.isValid = false;
            }

            const expectedVolume = original.reduce((sum, r) => sum + (r.volume || 0), 0);
            if (Math.abs(aggregated.volume - expectedVolume) > 0.001) {
                validation.errors.push(`Volume mismatch: expected ${expectedVolume}, got ${aggregated.volume}`);
                validation.isValid = false;
            }

            validation.metrics = {
                recordCount: original.length,
                dateRange: {
                    start: original[0].date,
                    end: original[original.length - 1].date
                },
                priceRange: {
                    high: expectedHigh,
                    low: expectedLow
                }
            };

            return validation;
        } catch (error) {
            return {
                isValid: false,
                errors: [`Validation error: ${error.message}`],
                metrics: {}
            };
        }
    }

    /**
     * Get performance metrics for timeframe processing
     */
    getPerformanceMetrics() {
        return {
            memoryUsage: process.memoryUsage(),
            uptime: process.uptime(),
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Cleanup resources
     */
    async cleanup() {
        try {
            await this.prisma.$disconnect();
            console.log('TimeframeService cleanup completed');
        } catch (error) {
            console.error('Error during cleanup:', error);
        }
    }
}

module.exports = TimeframeService;