/**
 * Statistical Analysis Service for Financial Data
 * 
 * Migrates Python numpy/pandas statistical functions to Node.js with mathematical precision
 * Replicates helper.py functions: getDataTableStatistics, getTrendingDays, 
 * maximumConsecutiveValues, getNConsecutiveSequanceIndexFromList
 * 
 * @author Seasonality SaaS Team
 * @version 1.0.0
 */

const Decimal = require('decimal.js');
const {
    addDays,
    addWeeks,
    addMonths,
    addYears,
    subDays,
    format,
    parseISO,
    isValid,
    differenceInDays,
    startOfMonth,
    endOfMonth,
    isLeapYear
} = require('date-fns');

// Configure Decimal.js for financial precision
Decimal.config({
    precision: 28,        // 28 significant digits
    rounding: Decimal.ROUND_HALF_UP,
    toExpNeg: -7,        // Use exponential notation for numbers < 1e-7
    toExpPos: 21,        // Use exponential notation for numbers >= 1e21
    minE: -9e15,         // Minimum exponent
    maxE: 9e15,          // Maximum exponent
    crypto: false,       // Don't use crypto-secure random number generation
    modulo: Decimal.ROUND_DOWN
});

/**
 * StatisticsService Class
 * Handles all statistical analysis operations with mathematical precision
 */
class StatisticsService {
    constructor() {
        this.performanceMetrics = {
            calculationsPerformed: 0,
            totalExecutionTime: 0,
            memoryUsage: {
                heapUsed: 0,
                heapTotal: 0,
                external: 0
            }
        };
    }

    /**
     * Calculate comprehensive statistics for return arrays
     * Replicates Python getDataTableStatistics() function exactly
     * 
     * @param {Array<number>} allDayReturnPoints - Array of return percentages
     * @returns {Object} Statistics object with counts, averages, and sums
     */
    getDataTableStatistics(allDayReturnPoints) {
        const startTime = Date.now();

        try {
            // Input validation
            if (!Array.isArray(allDayReturnPoints)) {
                throw new Error('Input must be an array of numbers');
            }

            // Convert to Decimal for precision
            const allReturns = allDayReturnPoints
                .filter(val => val !== null && val !== undefined && !isNaN(val))
                .map(val => new Decimal(val));

            // Separate positive and negative returns
            const positiveReturns = allReturns.filter(val => val.gt(0));
            const negativeReturns = allReturns.filter(val => val.lt(0));

            // Calculate statistics with exact precision
            const stats = {
                'All Count': allReturns.length,
                'Avg Return All': allReturns.length > 0 ?
                    this._calculateMean(allReturns).toNumber() : 0,
                'Sum Return All': allReturns.length > 0 ?
                    this._calculateSum(allReturns).toNumber() : 0,

                'Pos Count': positiveReturns.length,
                'Avg Return Pos': positiveReturns.length > 0 ?
                    this._calculateMean(positiveReturns).toNumber() : 0,
                'Sum Return Pos': positiveReturns.length > 0 ?
                    this._calculateSum(positiveReturns).toNumber() : 0,

                'Neg Count': negativeReturns.length,
                'Avg Return Neg': negativeReturns.length > 0 ?
                    this._calculateMean(negativeReturns).toNumber() : 0,
                'Sum Return Neg': negativeReturns.length > 0 ?
                    this._calculateSum(negativeReturns).toNumber() : 0
            };

            // Update performance metrics
            this.performanceMetrics.calculationsPerformed++;
            this.performanceMetrics.totalExecutionTime += Date.now() - startTime;

            return stats;

        } catch (error) {
            console.error('Error in getDataTableStatistics:', error);
            throw new Error(`Statistics calculation failed: ${error.message}`);
        }
    }

    /**
     * Calculate accuracy percentages for display
     * Replicates Python getAccuracy() function
     * 
     * @param {Object} row - Statistics row object
     * @param {string} countType - Type of count ('Pos Count' or 'Neg Count')
     * @returns {string} Formatted accuracy string
     */
    getAccuracy(row, countType) {
        try {
            if (!row || row['All Count'] === 0) {
                return '0(0.00%)';
            }

            const count = row[countType] || 0;
            const total = row['All Count'];

            // Use Decimal for precise percentage calculation
            const percentage = new Decimal(count)
                .div(total)
                .mul(100)
                .toDecimalPlaces(2);

            return `${count}(${percentage.toString()}%)`;

        } catch (error) {
            console.error('Error in getAccuracy:', error);
            return '0(0.00%)';
        }
    }

    /**
     * Find maximum consecutive positive/negative streaks
     * Replicates Python maximumConsecutiveValues() function exactly
     * 
     * @param {Array<number>} arr - Array of return values
     * @returns {Object} Object with maximumPositiveCount and maximumNegativeCount
     */
    maximumConsecutiveValues(arr) {
        const startTime = Date.now();

        try {
            // Input validation
            if (!Array.isArray(arr)) {
                throw new Error('Input must be an array of numbers');
            }

            let maximumPositiveCount = 0;
            let currentPositiveCount = 0;
            let maximumNegativeCount = 0;
            let currentNegativeCount = 0;

            // Process each value with exact logic from Python
            for (const num of arr) {
                if (num === null || num === undefined || isNaN(num)) {
                    // Reset counters for invalid values
                    currentPositiveCount = 0;
                    currentNegativeCount = 0;
                    continue;
                }

                const value = new Decimal(num);

                if (value.gt(0)) {
                    currentPositiveCount += 1;
                    maximumPositiveCount = Math.max(maximumPositiveCount, currentPositiveCount);
                    currentNegativeCount = 0;
                } else if (value.lt(0)) {
                    currentNegativeCount += 1;
                    maximumNegativeCount = Math.max(maximumNegativeCount, currentNegativeCount);
                    currentPositiveCount = 0;
                } else {
                    // Zero value resets both counters
                    currentPositiveCount = 0;
                    currentNegativeCount = 0;
                }
            }

            // Update performance metrics
            this.performanceMetrics.calculationsPerformed++;
            this.performanceMetrics.totalExecutionTime += Date.now() - startTime;

            return {
                maximumPositiveCount,
                maximumNegativeCount
            };

        } catch (error) {
            console.error('Error in maximumConsecutiveValues:', error);
            throw new Error(`Consecutive values calculation failed: ${error.message}`);
        }
    }

    /**
     * Identify consecutive trending periods with complex filtering
     * Replicates Python getTrendingDays() function with date arithmetic
     * 
     * @param {Array<Object>} df - Array of data objects with Date, Close, ReturnPercentage
     * @param {number} nTrades - Minimum consecutive days required
     * @param {string} opt - 'less' or 'more' comparison operator
     * @param {number} percentChange - Threshold percentage change
     * @param {number} nweek - Number of weeks to add for week tracking
     * @param {number} nmonth - Number of months to add for month tracking
     * @param {number} nyear - Number of years to add for year tracking
     * @returns {Array<Object>} Array of trending periods with performance tracking
     */
    getTrendingDays(df, nTrades, opt, percentChange, nweek, nmonth, nyear) {
        const startTime = Date.now();

        try {
            // Input validation
            if (!Array.isArray(df) || !nTrades || nTrades === 0 || percentChange === null || percentChange === undefined) {
                return null;
            }

            if (!['less', 'more'].includes(opt)) {
                throw new Error('opt parameter must be "less" or "more"');
            }

            let consecutiveCount = 0;
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
                YearPercent: []
            };

            const weekList = [];
            const monthList = [];
            const yearList = [];
            const sClose = [];

            let weekIndex = 0;
            let monthIndex = 0;
            let yearIndex = 0;
            let dateFound = false;
            let startDate = null;
            let startClose = null;
            let currDate = null;
            let currClose = null;

            // Process each row in the dataframe
            for (let index = 0; index < df.length; index++) {
                const row = df[index];
                const returnPercentage = new Decimal(row.ReturnPercentage || 0);
                const thresholdPercent = new Decimal(percentChange);

                // Check if current row meets trending criteria
                const meetsCondition = opt === 'less' ?
                    returnPercentage.lt(thresholdPercent) :
                    returnPercentage.gt(thresholdPercent);

                if (meetsCondition) {
                    consecutiveCount++;
                    if (consecutiveCount === 1) {
                        startDate = new Date(row.Date);
                        startClose = new Decimal(row.Close);
                    }
                } else {
                    // Check if we have enough consecutive days
                    if (consecutiveCount >= nTrades) {
                        const rowDate = new Date(row.Date);
                        const rowClose = new Decimal(row.Close);

                        // Calculate future dates using date-fns
                        weekList.push(addWeeks(rowDate, nweek));
                        monthList.push(subDays(addMonths(rowDate, nmonth), 1));
                        yearList.push(subDays(addYears(rowDate, nyear), 1));

                        sClose.push(rowClose);

                        if (!dateFound) {
                            dateFound = true;
                        }

                        // Calculate percentage change with precision
                        const percentageChange = rowClose.minus(startClose)
                            .div(startClose)
                            .mul(100)
                            .toDecimalPlaces(2);

                        // Add to results
                        result.StartDate.push(startDate.toISOString().split('T')[0]);
                        result.StartClose.push(startClose.toNumber());
                        result.EndDate.push(rowDate.toISOString().split('T')[0]);
                        result.EndClose.push(rowClose.toNumber());
                        result.TotalDays.push(consecutiveCount);
                        result.PercentChange.push(percentageChange.toNumber());
                    }

                    consecutiveCount = 0;
                }

                // Track future performance if we have established trends
                if (dateFound) {
                    currDate = new Date(row.Date);
                    currClose = new Decimal(row.Close);

                    // Check week performance
                    if (weekIndex < weekList.length && currDate > weekList[weekIndex]) {
                        this._addPerformanceData(result, 'Week', currDate, currClose, weekIndex, sClose);
                        weekIndex++;
                    }

                    // Check month performance
                    if (monthIndex < monthList.length && currDate > monthList[monthIndex]) {
                        this._addPerformanceData(result, 'Month', currDate, currClose, monthIndex, sClose);
                        monthIndex++;
                    }

                    // Check year performance
                    if (yearIndex < yearList.length && currDate > yearList[yearIndex]) {
                        this._addPerformanceData(result, 'Year', currDate, currClose, yearIndex, sClose);
                        yearIndex++;
                    }

                    // Add None values for remaining periods at end
                    if (index === df.length - 1) {
                        this._addNoneValues(result, weekList, weekIndex, 'Week');
                        this._addNoneValues(result, monthList, monthIndex, 'Month');
                        this._addNoneValues(result, yearList, yearIndex, 'Year');
                    }
                }
            }

            // Update performance metrics
            this.performanceMetrics.calculationsPerformed++;
            this.performanceMetrics.totalExecutionTime += Date.now() - startTime;

            return result;

        } catch (error) {
            console.error('Error in getTrendingDays:', error);
            throw new Error(`Trending days calculation failed: ${error.message}`);
        }
    }
    /**
     * Complex consecutive sequence analysis with multiple boolean operations
     * Replicates Python getNConsecutiveSequanceIndexFromList() function exactly
     * 
     * @param {Object} dayDataTable - Data table with statistics columns
     * @param {string} trendTypeValue - 'Bullish' or 'Bearish'
     * @param {number} consecutiveTrendingDaysValue - Number of consecutive days required
     * @param {number} minimumAccuracyOfEachDayValue - Minimum accuracy threshold
     * @param {number} minimumTotalPnlOfAllTrendingDaysValue - Minimum total PnL threshold
     * @param {number} minimumSampleSizeValue - Minimum sample size threshold
     * @param {number} minimumAveragePnlOfEachTrendingDaysValue - Minimum average PnL threshold
     * @param {string} input12operationValue - 'OR' or 'AND' operation between conditions 1&2
     * @param {string} input23operationValue - 'OR' or 'AND' operation between conditions 2&3
     * @param {string} input34operationValue - 'OR' or 'AND' operation between conditions 3&4
     * @returns {Array<Array<number>>} Array of [startIndex, endIndex] pairs
     */
    getNConsecutiveSequanceIndexFromList(
        dayDataTable,
        trendTypeValue,
        consecutiveTrendingDaysValue,
        minimumAccuracyOfEachDayValue,
        minimumTotalPnlOfAllTrendingDaysValue,
        minimumSampleSizeValue,
        minimumAveragePnlOfEachTrendingDaysValue,
        input12operationValue,
        input23operationValue,
        input34operationValue
    ) {
        const startTime = Date.now();

        try {
            // Input validation
            if (!dayDataTable || typeof dayDataTable !== 'object') {
                throw new Error('dayDataTable must be a valid object');
            }

            // Extract arrays from data table
            const sumReturnOfAll = this._extractArrayFromColumn(dayDataTable, 'Sum Return All');
            const accuracyOfAll = trendTypeValue === 'Bullish' ?
                this._extractArrayFromColumn(dayDataTable, 'Pos Accuracy') :
                this._extractArrayFromColumn(dayDataTable, 'Neg Accuracy');
            const sampleCountOfAll = this._extractArrayFromColumn(dayDataTable, 'All Count');
            const averagePnLOfAll = this._extractArrayFromColumn(dayDataTable, 'Avg Return All');

            // Validate array lengths
            const arrayLength = sumReturnOfAll.length;
            if (accuracyOfAll.length !== arrayLength ||
                sampleCountOfAll.length !== arrayLength ||
                averagePnLOfAll.length !== arrayLength) {
                throw new Error('All data arrays must have the same length');
            }

            // Set trend multiplier for direction
            const trendTypeMultiplier = trendTypeValue === 'Bullish' ? 1 : -1;

            const sumReturnValueChunks = [];
            const sumReturnIndexChunks = [];

            let idx = 0;
            const traverseTill = arrayLength - consecutiveTrendingDaysValue;

            // Main processing loop - exact replica of Python logic
            while (idx <= traverseTill) {
                let advancedQueryCheck = false;
                let checkChunkValues = false;

                // Check if current value meets trend direction
                const currentReturn = new Decimal(sumReturnOfAll[idx]);
                if (currentReturn.mul(trendTypeMultiplier).gt(0)) {

                    // Check if all consecutive values meet trend direction
                    const chunk = sumReturnOfAll.slice(idx, idx + consecutiveTrendingDaysValue);
                    checkChunkValues = chunk.every(num => {
                        const value = new Decimal(num);
                        return value.mul(trendTypeMultiplier).gt(0);
                    });

                    if (checkChunkValues) {
                        // Extract chunks for validation
                        const accuracyChunk = accuracyOfAll.slice(idx, idx + consecutiveTrendingDaysValue);
                        const sampleCountChunk = sampleCountOfAll.slice(idx, idx + consecutiveTrendingDaysValue);
                        const averagePnLChunk = averagePnLOfAll.slice(idx, idx + consecutiveTrendingDaysValue);

                        // Condition 1: Minimum accuracy check
                        const minimumAccuracyCheck = accuracyChunk.every(accuracy =>
                            new Decimal(accuracy).gt(minimumAccuracyOfEachDayValue)
                        );

                        // Condition 2: Total PnL check
                        const totalAveragePnL = averagePnLChunk.reduce((sum, pnl) =>
                            sum.plus(new Decimal(pnl)), new Decimal(0)
                        );
                        const totalOfAveragePnLCheck = new Decimal(minimumTotalPnlOfAllTrendingDaysValue)
                            .lt(totalAveragePnL.mul(trendTypeMultiplier));

                        // Condition 3: Minimum sample size check
                        const minimumSampleSizeCheck = sampleCountChunk.every(count =>
                            new Decimal(count).gt(minimumSampleSizeValue)
                        );

                        // Condition 4: Individual PnL check
                        const individualPnLCheck = averagePnLChunk.every(pnl =>
                            new Decimal(pnl).gt(minimumAveragePnlOfEachTrendingDaysValue)
                        );

                        // Complex boolean logic - exact replica of Python
                        let condition12 = input12operationValue === 'OR' ?
                            (minimumAccuracyCheck || totalOfAveragePnLCheck) :
                            (minimumAccuracyCheck && totalOfAveragePnLCheck);

                        let condition123 = input23operationValue === 'OR' ?
                            (condition12 || minimumSampleSizeCheck) :
                            (condition12 && minimumSampleSizeCheck);

                        advancedQueryCheck = input34operationValue === 'OR' ?
                            (condition123 || individualPnLCheck) :
                            (condition123 && individualPnLCheck);
                    }
                }

                // Add to results if both checks pass
                if (checkChunkValues && advancedQueryCheck) {
                    sumReturnValueChunks.push(
                        sumReturnOfAll.slice(idx, idx + consecutiveTrendingDaysValue)
                    );
                    sumReturnIndexChunks.push([idx, idx + consecutiveTrendingDaysValue - 1]);
                    idx = idx + consecutiveTrendingDaysValue; // Skip ahead
                } else {
                    idx = idx + 1; // Move to next position
                }
            }

            // Update performance metrics
            this.performanceMetrics.calculationsPerformed++;
            this.performanceMetrics.totalExecutionTime += Date.now() - startTime;

            return sumReturnIndexChunks;

        } catch (error) {
            console.error('Error in getNConsecutiveSequanceIndexFromList:', error);
            throw new Error(`Consecutive sequence analysis failed: ${error.message}`);
        }
    }

    /**
     * Generate performance table for month-on-month analysis
     * Replicates Python generatePerformanceTable() function
     * 
     * @param {Array<Object>} df - Data array with Date, Open, Close, Weekday columns
     * @param {string} entryType - 'Open' or 'Close' for entry price
     * @param {string} exitType - 'Open' or 'Close' for exit price
     * @param {string} tradeType - 'Long' or 'Short' for trade direction
     * @param {string} entryDay - Entry weekday name
     * @param {string} exitDay - Exit weekday name
     * @param {string} returnType - 'Percent' or 'Points' for return calculation
     * @returns {Array<Object>|null} Pivot table with monthly returns or null if invalid
     */
    generatePerformanceTable(df, entryType, exitType, tradeType, entryDay, exitDay, returnType) {
        const startTime = Date.now();

        try {
            // Input validation
            if (!Array.isArray(df) || df.length === 0) {
                return null;
            }

            if (entryDay === exitDay) {
                return null;
            }

            // Filter data for entry and exit days
            const filteredData = df.filter(row =>
                row.Weekday === entryDay || row.Weekday === exitDay
            );

            if (filteredData.length === 0) {
                return null;
            }

            // Calculate day order difference
            const dayOrder = {
                'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
                'Thursday': 4, 'Friday': 5, 'Saturday': 6, 'Sunday': 7
            };

            const startDay = dayOrder[entryDay];
            const endDay = dayOrder[exitDay];
            const dayDiff = endDay > startDay ?
                (endDay - startDay) :
                (7 - startDay + endDay);

            // Calculate day-to-day returns
            const processedData = [];

            for (let i = 0; i < filteredData.length - 1; i++) {
                const currentRow = filteredData[i];
                const nextRow = filteredData[i + 1];

                if (currentRow.Weekday === entryDay) {
                    const entryPrice = new Decimal(currentRow[entryType]);
                    const exitPrice = new Decimal(nextRow[exitType]);
                    const currentDate = new Date(currentRow.Date);
                    const nextDate = new Date(nextRow.Date);

                    // Check if date difference matches expected day difference
                    const dateDiff = Math.abs(differenceInDays(nextDate, currentDate));

                    if (dateDiff === dayDiff) {
                        let dayReturn = exitPrice.minus(entryPrice);

                        // Calculate percentage return if requested
                        if (returnType === 'Percent') {
                            dayReturn = dayReturn.div(entryPrice).mul(100);
                        }

                        // Apply short trade multiplier
                        if (tradeType === 'Short') {
                            dayReturn = dayReturn.mul(-1);
                        }

                        processedData.push({
                            Date: currentDate,
                            Return: dayReturn.toNumber(),
                            Year: currentDate.getFullYear(),
                            Month: format(currentDate, 'MMM')
                        });
                    }
                }
            }

            if (processedData.length === 0) {
                return null;
            }

            // Group by year and month, sum returns
            const monthlyReturns = new Map();

            processedData.forEach(row => {
                const key = `${row.Year}-${row.Month}`;
                if (!monthlyReturns.has(key)) {
                    monthlyReturns.set(key, {
                        Year: row.Year,
                        Month: row.Month,
                        Return: new Decimal(0)
                    });
                }

                const existing = monthlyReturns.get(key);
                existing.Return = existing.Return.plus(row.Return);
            });

            // Convert to pivot table format
            const pivotData = new Map();

            monthlyReturns.forEach(({ Year, Month, Return }) => {
                if (!pivotData.has(Year)) {
                    pivotData.set(Year, { Year });
                }

                const yearData = pivotData.get(Year);
                yearData[Month] = Return.toDecimalPlaces(2).toNumber();
            });

            // Calculate totals and convert to array
            const result = Array.from(pivotData.values()).map(yearData => {
                const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

                let total = new Decimal(0);
                months.forEach(month => {
                    if (yearData[month] !== undefined) {
                        total = total.plus(yearData[month]);
                    }
                });

                return {
                    ...yearData,
                    Total: total.toDecimalPlaces(2).toNumber()
                };
            });

            // Update performance metrics
            this.performanceMetrics.calculationsPerformed++;
            this.performanceMetrics.totalExecutionTime += Date.now() - startTime;

            return result;

        } catch (error) {
            console.error('Error in generatePerformanceTable:', error);
            throw new Error(`Performance table generation failed: ${error.message}`);
        }
    }

    /**
     * Calculate recent day return percentage
     * Replicates Python getRecentDayReturnPercentage() function
     * 
     * @param {Array<Object>} df - Data array with Close prices
     * @param {number} recentDayValue - Number of recent days to analyze
     * @returns {number} Return percentage over the period
     */
    getRecentDayReturnPercentage(df, recentDayValue) {
        try {
            if (!Array.isArray(df) || df.length === 0 || !recentDayValue || recentDayValue <= 0) {
                return 0;
            }

            // Get last N+1 records (need N+1 to calculate N-day return)
            const recentData = df.slice(-(recentDayValue + 1));

            if (recentData.length < 2) {
                return 0;
            }

            const startValue = new Decimal(recentData[0].Close);
            const endValue = new Decimal(recentData[recentData.length - 1].Close);

            // Calculate percentage return with precision
            const returnPercentage = endValue.minus(startValue)
                .div(startValue)
                .mul(100)
                .toDecimalPlaces(2);

            return returnPercentage.toNumber();

        } catch (error) {
            console.error('Error in getRecentDayReturnPercentage:', error);
            return 0;
        }
    }

    /**
     * Calculate recent week return percentage
     * Replicates Python getRecentWeekReturnPercentage() function
     * 
     * @param {Array<Object>} df - Data array with MondayWeeklyDate and Close
     * @param {number} recentWeekValue - Number of recent weeks to analyze
     * @returns {number} Return percentage over the period
     */
    getRecentWeekReturnPercentage(df, recentWeekValue) {
        try {
            if (!Array.isArray(df) || df.length === 0 || !recentWeekValue || recentWeekValue <= 0) {
                return 0;
            }

            // Get unique Monday weekly dates
            const uniqueWeeks = [...new Set(df.map(row => row.MondayWeeklyDate))].sort();

            if (uniqueWeeks.length < recentWeekValue) {
                return 0;
            }

            // Get the start week
            const weekStart = uniqueWeeks[uniqueWeeks.length - recentWeekValue];

            // Filter data: one record before start week + all records from start week onwards
            const beforeStartWeek = df.filter(row => row.MondayWeeklyDate < weekStart);
            const fromStartWeek = df.filter(row => row.MondayWeeklyDate >= weekStart);

            if (beforeStartWeek.length === 0 || fromStartWeek.length === 0) {
                return 0;
            }

            // Get start and end values
            const startValue = new Decimal(beforeStartWeek[beforeStartWeek.length - 1].Close);
            const endValue = new Decimal(fromStartWeek[fromStartWeek.length - 1].Close);

            // Calculate percentage return
            const returnPercentage = endValue.minus(startValue)
                .div(startValue)
                .mul(100)
                .toDecimalPlaces(2);

            return returnPercentage.toNumber();

        } catch (error) {
            console.error('Error in getRecentWeekReturnPercentage:', error);
            return 0;
        }
    }

    /**
     * Calculate recent month return percentage
     * Replicates Python getRecentMonthReturnPercentage() function
     * 
     * @param {Array<Object>} df - Data array with Date and Close
     * @param {number} recentMonthValue - Number of recent months to analyze
     * @returns {number} Return percentage over the period
     */
    getRecentMonthReturnPercentage(df, recentMonthValue) {
        try {
            if (!Array.isArray(df) || df.length === 0 || !recentMonthValue || recentMonthValue <= 0) {
                return 0;
            }

            // Get the latest date
            const latestDate = new Date(Math.max(...df.map(row => new Date(row.Date))));

            // Calculate start date (N months back)
            let startYear = latestDate.getFullYear();
            let startMonth = latestDate.getMonth() + 1; // getMonth() returns 0-11

            if (startMonth >= recentMonthValue) {
                startMonth = startMonth - (recentMonthValue - 1);
            } else {
                startYear = startYear - 1;
                startMonth = 12 - (recentMonthValue - startMonth - 1);
            }

            const startDate = new Date(startYear, startMonth - 1, 1); // Month is 0-indexed in Date constructor

            // Filter data: one record before start date + all records from start date onwards
            const beforeStartDate = df.filter(row => new Date(row.Date) < startDate);
            const fromStartDate = df.filter(row => new Date(row.Date) >= startDate);

            if (beforeStartDate.length === 0 || fromStartDate.length === 0) {
                return 0;
            }

            // Get start and end values
            const startValue = new Decimal(beforeStartDate[beforeStartDate.length - 1].Close);
            const endValue = new Decimal(fromStartDate[fromStartDate.length - 1].Close);

            // Calculate percentage return
            const returnPercentage = endValue.minus(startValue)
                .div(startValue)
                .mul(100)
                .toDecimalPlaces(2);

            return returnPercentage.toNumber();

        } catch (error) {
            console.error('Error in getRecentMonthReturnPercentage:', error);
            return 0;
        }
    }

    // Private helper methods

    /**
     * Calculate mean of Decimal array
     */
    _calculateMean(decimalArray) {
        if (decimalArray.length === 0) {
            return new Decimal(0);
        }

        const sum = decimalArray.reduce((acc, val) => acc.plus(val), new Decimal(0));
        return sum.div(decimalArray.length);
    }

    /**
     * Calculate sum of Decimal array
     */
    _calculateSum(decimalArray) {
        return decimalArray.reduce((acc, val) => acc.plus(val), new Decimal(0));
    }

    /**
     * Extract array from data table column
     */
    _extractArrayFromColumn(dataTable, columnName) {
        if (Array.isArray(dataTable[columnName])) {
            return dataTable[columnName];
        }

        // If it's an object with numeric keys (like pandas Series)
        if (typeof dataTable[columnName] === 'object') {
            return Object.values(dataTable[columnName]);
        }

        throw new Error(`Column '${columnName}' not found or invalid format`);
    }

    /**
     * Add performance data for trending analysis
     */
    _addPerformanceData(result, timeframe, currDate, currClose, index, sClose) {
        result[`${timeframe}Date`].push(currDate.toISOString().split('T')[0]);
        result[`${timeframe}Close`].push(currClose.toNumber());

        const startClose = new Decimal(sClose[index]);
        const percentChange = currClose.minus(startClose)
            .div(startClose)
            .mul(100)
            .toDecimalPlaces(2);

        result[`${timeframe}Percent`].push(percentChange.toNumber());
    }

    /**
     * Add null values for remaining periods
     */
    _addNoneValues(result, dateList, currentIndex, timeframe) {
        const remaining = dateList.length - currentIndex;
        for (let i = 0; i < remaining; i++) {
            result[`${timeframe}Date`].push(null);
            result[`${timeframe}Close`].push(null);
            result[`${timeframe}Percent`].push(null);
        }
    }

    /**
     * Get performance metrics
     */
    getPerformanceMetrics() {
        const memUsage = process.memoryUsage();

        return {
            ...this.performanceMetrics,
            memoryUsage: {
                heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024 * 100) / 100, // MB
                heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024 * 100) / 100, // MB
                external: Math.round(memUsage.external / 1024 / 1024 * 100) / 100 // MB
            },
            averageExecutionTime: this.performanceMetrics.calculationsPerformed > 0 ?
                this.performanceMetrics.totalExecutionTime / this.performanceMetrics.calculationsPerformed : 0
        };
    }

    /**
     * Reset performance metrics
     */
    resetPerformanceMetrics() {
        this.performanceMetrics = {
            calculationsPerformed: 0,
            totalExecutionTime: 0,
            memoryUsage: {
                heapUsed: 0,
                heapTotal: 0,
                external: 0
            }
        };
    }

    /**
     * Validate numerical input arrays
     */
    validateNumericalArray(arr, paramName) {
        if (!Array.isArray(arr)) {
            throw new Error(`${paramName} must be an array`);
        }

        const validNumbers = arr.filter(val =>
            val !== null && val !== undefined && !isNaN(val) && isFinite(val)
        );

        if (validNumbers.length === 0) {
            throw new Error(`${paramName} must contain at least one valid number`);
        }

        return validNumbers;
    }
}

module.exports = StatisticsService;