/**
 * Advanced Filtering System for Financial Data
 * 
 * Converts Python pandas filtering logic to JavaScript with Prisma database queries
 * Replicates filterDataFrameFromHelper() function with 20+ parameters
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
    differenceInDays,
    isLeapYear
} = require('date-fns');

const prisma = new PrismaClient();

/**
 * FilterService Class
 * Handles all advanced filtering operations for financial data
 */
class FilterService {
    constructor() {
        this.prisma = prisma;
        this.cache = new Map(); // Query result caching
        this.performanceMetrics = {
            queriesExecuted: 0,
            cacheHits: 0,
            totalExecutionTime: 0
        };
    }

    /**
     * Main filtering function - replicates filterDataFrameFromHelper()
     * 
     * @param {Object} filterParams - All filtering parameters
     * @returns {Object} Filtered data with metadata
     */
    async buildFilterQuery(filterParams) {
        const startTime = Date.now();

        try {
            // Validate and sanitize input parameters
            const validatedParams = this.validateFilterParams(filterParams);

            // Build base query
            let query = this._buildBaseQuery(validatedParams);

            // Apply all filter categories
            query = await this.applyDateFilters(query, validatedParams);
            query = await this.applyYearFilters(query, validatedParams);
            query = await this.applyMonthFilters(query, validatedParams);
            query = await this.applyWeekFilters(query, validatedParams);
            query = await this.applyDayFilters(query, validatedParams);
            query = await this.applyPerformanceFilters(query, validatedParams);

            // Optimize and execute query
            const optimizedQuery = this.optimizeQuery(query);
            const result = await this._executeQuery(optimizedQuery, validatedParams);

            // Update performance metrics
            this.performanceMetrics.queriesExecuted++;
            this.performanceMetrics.totalExecutionTime += Date.now() - startTime;

            return {
                data: result.data,
                metadata: {
                    totalRecords: result.count,
                    filteredRecords: result.data.length,
                    executionTime: Date.now() - startTime,
                    appliedFilters: this._getAppliedFilters(validatedParams),
                    cacheUsed: result.fromCache || false
                }
            };

        } catch (error) {
            console.error('Error in buildFilterQuery:', error);
            throw new Error(`Filter query failed: ${error.message}`);
        }
    }

    /**
     * Apply Date/Time Filters
     * Replicates Python date range and last N days logic
     */
    async applyDateFilters(query, dateParams) {
        const {
            startDate,
            endDate,
            dateLastNDaysValue,
            symbolNameToPlotValue
        } = dateParams;

        // Handle last N days filter (takes precedence)
        if (dateLastNDaysValue && dateLastNDaysValue > 0) {
            // Get the latest N records for the symbol
            query.orderBy = { date: 'desc' };
            query.take = dateLastNDaysValue;

            return query;
        }

        // Handle date range filter
        if (startDate || endDate) {
            if (!query.where.date) {
                query.where.date = {};
            }

            if (startDate) {
                query.where.date.gte = new Date(startDate);
            }

            if (endDate) {
                query.where.date.lte = new Date(endDate);
            }
        }

        return query;
    }

    /**
     * Apply Year Filters
     * Replicates Python year filtering logic
     */
    async applyYearFilters(query, yearParams) {
        const {
            positiveNegativeYearFilter,
            evenOddYearFilter,
            decadeYearsValue
        } = yearParams;

        // Positive/Negative Year Filter
        if (positiveNegativeYearFilter && positiveNegativeYearFilter !== 'All') {
            // This requires calculating year-over-year returns
            // We'll need to join with previous year data
            query.include = {
                ...query.include,
                yearlyReturns: true
            };

            if (positiveNegativeYearFilter === 'Positive') {
                query.where.yearlyReturnPercentage = { gt: 0 };
            } else if (positiveNegativeYearFilter === 'Negative') {
                query.where.yearlyReturnPercentage = { lt: 0 };
            }
        }

        // Even/Odd Year Filter
        if (evenOddYearFilter && evenOddYearFilter !== 'All') {
            if (evenOddYearFilter === 'Even' || evenOddYearFilter === 0) {
                query.where.date = {
                    ...query.where.date,
                    // Filter for even years using SQL modulo
                };
                query.whereRaw = `EXTRACT(YEAR FROM date) % 2 = 0`;
            } else if (evenOddYearFilter === 'Odd' || evenOddYearFilter === 1) {
                query.whereRaw = `EXTRACT(YEAR FROM date) % 2 = 1`;
            } else if (evenOddYearFilter === 2) {
                // Leap years filter
                query.whereRaw = `(EXTRACT(YEAR FROM date) % 4 = 0 AND (EXTRACT(YEAR FROM date) % 100 != 0 OR EXTRACT(YEAR FROM date) % 400 = 0))`;
            }
        }

        // Decade Years Filter
        if (decadeYearsValue && Array.isArray(decadeYearsValue) && decadeYearsValue.length > 0) {
            // Convert decade positions to actual decade digits
            const allowedDecadeDigits = decadeYearsValue.map(val => val === 10 ? 0 : val);

            if (allowedDecadeDigits.length < 10) {
                const decadeConditions = allowedDecadeDigits.map(digit =>
                    `EXTRACT(YEAR FROM date) % 10 = ${digit}`
                ).join(' OR ');

                query.whereRaw = query.whereRaw ?
                    `(${query.whereRaw}) AND (${decadeConditions})` :
                    `(${decadeConditions})`;
            }
        }

        return query;
    }

    /**
     * Apply Month Filters
     * Replicates Python month filtering logic
     */
    async applyMonthFilters(query, monthParams) {
        const {
            positiveNegativeMonthFilter,
            evenOddMonthFilter,
            specificMonthSelectionValue
        } = monthParams;

        // Positive/Negative Month Filter
        if (positiveNegativeMonthFilter && positiveNegativeMonthFilter !== 'All') {
            query.include = {
                ...query.include,
                monthlyReturns: true
            };

            if (positiveNegativeMonthFilter === 'Positive') {
                query.where.monthlyReturnPercentage = { gt: 0 };
            } else if (positiveNegativeMonthFilter === 'Negative') {
                query.where.monthlyReturnPercentage = { lt: 0 };
            }
        }

        // Even/Odd Month Filter
        if (evenOddMonthFilter && evenOddMonthFilter !== 'All') {
            if (evenOddMonthFilter === 'Even' || evenOddMonthFilter === 0) {
                query.whereRaw = query.whereRaw ?
                    `(${query.whereRaw}) AND EXTRACT(MONTH FROM date) % 2 = 0` :
                    `EXTRACT(MONTH FROM date) % 2 = 0`;
            } else if (evenOddMonthFilter === 'Odd' || evenOddMonthFilter === 1) {
                query.whereRaw = query.whereRaw ?
                    `(${query.whereRaw}) AND EXTRACT(MONTH FROM date) % 2 = 1` :
                    `EXTRACT(MONTH FROM date) % 2 = 1`;
            }
        }

        // Specific Month Selection
        if (specificMonthSelectionValue && specificMonthSelectionValue !== 0) {
            query.whereRaw = query.whereRaw ?
                `(${query.whereRaw}) AND EXTRACT(MONTH FROM date) = ${specificMonthSelectionValue}` :
                `EXTRACT(MONTH FROM date) = ${specificMonthSelectionValue}`;
        }

        return query;
    }

    /**
     * Apply Week Filters
     * Replicates Python expiry and Monday week filtering logic
     */
    async applyWeekFilters(query, weekParams) {
        const {
            positiveNegativeExpiryWeekFilter,
            evenOddExpiryWeekMonthlyFilter,
            specificExpiryWeekMonthlySelectionValue,
            evenOddExpiryWeekYearlyFilter,
            positiveNegativeMondayWeekFilter,
            evenOddMondayWeekMonthlyFilter,
            specificMondayWeekMonthlySelectionValue,
            evenOddMondayWeekYearlyFilter,
            specificMonthSelectionValue
        } = weekParams;

        // Expiry Week Filters
        if (positiveNegativeExpiryWeekFilter && positiveNegativeExpiryWeekFilter !== 'All') {
            query.include = {
                ...query.include,
                expiryWeeklyReturns: true
            };

            if (positiveNegativeExpiryWeekFilter === 'Positive') {
                query.where.expiryWeeklyReturnPercentage = { gt: 0 };
            } else if (positiveNegativeExpiryWeekFilter === 'Negative') {
                query.where.expiryWeeklyReturnPercentage = { lt: 0 };
            }
        }

        // Even/Odd Expiry Week Monthly Filter
        if (evenOddExpiryWeekMonthlyFilter && evenOddExpiryWeekMonthlyFilter !== 'All') {
            if (evenOddExpiryWeekMonthlyFilter === 'Even' || evenOddExpiryWeekMonthlyFilter === 0) {
                query.where.evenExpiryWeekNumberMonthly = true;
            } else if (evenOddExpiryWeekMonthlyFilter === 'Odd' || evenOddExpiryWeekMonthlyFilter === 1) {
                query.where.evenExpiryWeekNumberMonthly = false;
            }
        }

        // Specific Expiry Week Monthly Selection
        if (specificExpiryWeekMonthlySelectionValue && specificExpiryWeekMonthlySelectionValue !== 0) {
            if (specificMonthSelectionValue && specificMonthSelectionValue !== 0) {
                // Both week number and month specified
                query.where.expiryWeekNumberMonthly = specificExpiryWeekMonthlySelectionValue;
                query.whereRaw = query.whereRaw ?
                    `(${query.whereRaw}) AND EXTRACT(MONTH FROM "expiryWeeklyDate") = ${specificMonthSelectionValue}` :
                    `EXTRACT(MONTH FROM "expiryWeeklyDate") = ${specificMonthSelectionValue}`;
            } else {
                // Only week number specified
                query.where.expiryWeekNumberMonthly = specificExpiryWeekMonthlySelectionValue;
            }
        }

        // Even/Odd Expiry Week Yearly Filter
        if (evenOddExpiryWeekYearlyFilter && evenOddExpiryWeekYearlyFilter !== 'All') {
            if (evenOddExpiryWeekYearlyFilter === 'Even' || evenOddExpiryWeekYearlyFilter === 0) {
                query.where.evenExpiryWeekNumberYearly = true;
            } else if (evenOddExpiryWeekYearlyFilter === 'Odd' || evenOddExpiryWeekYearlyFilter === 1) {
                query.where.evenExpiryWeekNumberYearly = false;
            }
        }

        // Monday Week Filters (similar logic)
        if (positiveNegativeMondayWeekFilter && positiveNegativeMondayWeekFilter !== 'All') {
            query.include = {
                ...query.include,
                mondayWeeklyReturns: true
            };

            if (positiveNegativeMondayWeekFilter === 'Positive') {
                query.where.mondayWeeklyReturnPercentage = { gt: 0 };
            } else if (positiveNegativeMondayWeekFilter === 'Negative') {
                query.where.mondayWeeklyReturnPercentage = { lt: 0 };
            }
        }

        // Even/Odd Monday Week Monthly Filter
        if (evenOddMondayWeekMonthlyFilter && evenOddMondayWeekMonthlyFilter !== 'All') {
            if (evenOddMondayWeekMonthlyFilter === 'Even' || evenOddMondayWeekMonthlyFilter === 0) {
                query.where.evenMondayWeekNumberMonthly = true;
            } else if (evenOddMondayWeekMonthlyFilter === 'Odd' || evenOddMondayWeekMonthlyFilter === 1) {
                query.where.evenMondayWeekNumberMonthly = false;
            }
        }

        // Specific Monday Week Monthly Selection
        if (specificMondayWeekMonthlySelectionValue && specificMondayWeekMonthlySelectionValue !== 0) {
            if (specificMonthSelectionValue && specificMonthSelectionValue !== 0) {
                // Both week number and month specified
                query.where.mondayWeekNumberMonthly = specificMondayWeekMonthlySelectionValue;
                query.whereRaw = query.whereRaw ?
                    `(${query.whereRaw}) AND EXTRACT(MONTH FROM "mondayWeeklyDate") = ${specificMonthSelectionValue}` :
                    `EXTRACT(MONTH FROM "mondayWeeklyDate") = ${specificMonthSelectionValue}`;
            } else {
                // Only week number specified
                query.where.mondayWeekNumberMonthly = specificMondayWeekMonthlySelectionValue;
            }
        }

        // Even/Odd Monday Week Yearly Filter
        if (evenOddMondayWeekYearlyFilter && evenOddMondayWeekYearlyFilter !== 'All') {
            if (evenOddMondayWeekYearlyFilter === 'Even' || evenOddMondayWeekYearlyFilter === 0) {
                query.where.evenMondayWeekNumberYearly = true;
            } else if (evenOddMondayWeekYearlyFilter === 'Odd' || evenOddMondayWeekYearlyFilter === 1) {
                query.where.evenMondayWeekNumberYearly = false;
            }
        }

        return query;
    }

    /**
     * Apply Day Filters
     * Replicates Python day filtering logic
     */
    async applyDayFilters(query, dayParams) {
        const {
            positiveNegativeDayFilter,
            weekdayNameFilter,
            evenOddCalenderMonthDayFilter,
            evenOddCalenderYearDayFilter,
            evenOddTradingMonthDayFilter,
            evenOddTradingYearDayFilter
        } = dayParams;

        // Positive/Negative Day Filter
        if (positiveNegativeDayFilter && positiveNegativeDayFilter !== 'All') {
            if (positiveNegativeDayFilter === 'Positive') {
                query.where.returnPercentage = { gt: 0 };
            } else if (positiveNegativeDayFilter === 'Negative') {
                query.where.returnPercentage = { lt: 0 };
            }
        }

        // Weekday Name Filter
        if (weekdayNameFilter && Array.isArray(weekdayNameFilter) && weekdayNameFilter.length > 0) {
            // Convert weekday names to numbers for SQL EXTRACT(DOW FROM date)
            const weekdayMap = {
                'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
                'Thursday': 4, 'Friday': 5, 'Saturday': 6
            };

            const weekdayNumbers = weekdayNameFilter
                .map(day => weekdayMap[day])
                .filter(num => num !== undefined);

            if (weekdayNumbers.length > 0) {
                const weekdayCondition = weekdayNumbers
                    .map(num => `EXTRACT(DOW FROM date) = ${num}`)
                    .join(' OR ');

                query.whereRaw = query.whereRaw ?
                    `(${query.whereRaw}) AND (${weekdayCondition})` :
                    `(${weekdayCondition})`;
            }
        }

        // Even/Odd Calendar Month Day Filter
        if (evenOddCalenderMonthDayFilter && evenOddCalenderMonthDayFilter !== 'All') {
            if (evenOddCalenderMonthDayFilter === 'Even' || evenOddCalenderMonthDayFilter === 0) {
                query.where.evenCalenderMonthDay = true;
            } else if (evenOddCalenderMonthDayFilter === 'Odd' || evenOddCalenderMonthDayFilter === 1) {
                query.where.evenCalenderMonthDay = false;
            }
        }

        // Even/Odd Calendar Year Day Filter
        if (evenOddCalenderYearDayFilter && evenOddCalenderYearDayFilter !== 'All') {
            if (evenOddCalenderYearDayFilter === 'Even' || evenOddCalenderYearDayFilter === 0) {
                query.where.evenCalenderYearDay = true;
            } else if (evenOddCalenderYearDayFilter === 'Odd' || evenOddCalenderYearDayFilter === 1) {
                query.where.evenCalenderYearDay = false;
            }
        }

        // Even/Odd Trading Month Day Filter
        if (evenOddTradingMonthDayFilter && evenOddTradingMonthDayFilter !== 'All') {
            if (evenOddTradingMonthDayFilter === 'Even' || evenOddTradingMonthDayFilter === 0) {
                query.where.evenTradingMonthDay = true;
            } else if (evenOddTradingMonthDayFilter === 'Odd' || evenOddTradingMonthDayFilter === 1) {
                query.where.evenTradingMonthDay = false;
            }
        }

        // Even/Odd Trading Year Day Filter
        if (evenOddTradingYearDayFilter && evenOddTradingYearDayFilter !== 'All') {
            if (evenOddTradingYearDayFilter === 'Even' || evenOddTradingYearDayFilter === 0) {
                query.where.evenTradingYearDay = true;
            } else if (evenOddTradingYearDayFilter === 'Odd' || evenOddTradingYearDayFilter === 1) {
                query.where.evenTradingYearDay = false;
            }
        }

        return query;
    }

    /**
     * Apply Performance Filters
     * Replicates Python percentage change range filters
     */
    async applyPerformanceFilters(query, performanceParams) {
        const {
            dailyPercentageChangeFilter,
            dailyPercentageChangeFilterSwitch,
            mondayWeeklyPercentageChangeFilter,
            mondayWeeklyPercentageChangeFilterSwitch,
            expiryWeeklyPercentageChangeFilter,
            expiryWeeklyPercentageChangeFilterSwitch,
            monthlyPercentageChangeFilter,
            monthlyPercentageChangeFilterSwitch,
            yearlyPercentageChangeFilter,
            yearlyPercentageChangeFilterSwitch
        } = performanceParams;

        // Daily Percentage Change Filter
        if (dailyPercentageChangeFilterSwitch && dailyPercentageChangeFilter && Array.isArray(dailyPercentageChangeFilter)) {
            const [minPercent, maxPercent] = dailyPercentageChangeFilter;
            query.where.returnPercentage = {
                gte: minPercent,
                lte: maxPercent
            };
        }

        // Monday Weekly Percentage Change Filter
        if (mondayWeeklyPercentageChangeFilterSwitch && mondayWeeklyPercentageChangeFilter && Array.isArray(mondayWeeklyPercentageChangeFilter)) {
            const [minPercent, maxPercent] = mondayWeeklyPercentageChangeFilter;
            query.where.mondayWeeklyReturnPercentage = {
                gte: minPercent,
                lte: maxPercent
            };
        }

        // Expiry Weekly Percentage Change Filter
        if (expiryWeeklyPercentageChangeFilterSwitch && expiryWeeklyPercentageChangeFilter && Array.isArray(expiryWeeklyPercentageChangeFilter)) {
            const [minPercent, maxPercent] = expiryWeeklyPercentageChangeFilter;
            query.where.expiryWeeklyReturnPercentage = {
                gte: minPercent,
                lte: maxPercent
            };
        }

        // Monthly Percentage Change Filter
        if (monthlyPercentageChangeFilterSwitch && monthlyPercentageChangeFilter && Array.isArray(monthlyPercentageChangeFilter)) {
            const [minPercent, maxPercent] = monthlyPercentageChangeFilter;
            query.where.monthlyReturnPercentage = {
                gte: minPercent,
                lte: maxPercent
            };
        }

        // Yearly Percentage Change Filter
        if (yearlyPercentageChangeFilterSwitch && yearlyPercentageChangeFilter && Array.isArray(yearlyPercentageChangeFilter)) {
            const [minPercent, maxPercent] = yearlyPercentageChangeFilter;
            query.where.yearlyReturnPercentage = {
                gte: minPercent,
                lte: maxPercent
            };
        }

        return query;
    }

    /**
     * Validate and sanitize filter parameters
     * Ensures all parameters are in correct format and within valid ranges
     */
    validateFilterParams(params) {
        const validated = {
            // Symbol and basic parameters
            symbolNameToPlotValue: this._validateString(params.symbolNameToPlotValue),
            chartScaleValue: this._validateString(params.chartScaleValue, 'linear'),

            // Date filters
            startDate: this._validateDate(params.startDate),
            endDate: this._validateDate(params.endDate),
            dateLastNDaysValue: this._validateInteger(params.dateLastNDaysValue, 0, 0, 10000),

            // Year filters
            positiveNegativeYearFilter: this._validateEnum(params.positiveNegativeYearFilter, ['All', 'Positive', 'Negative'], 'All'),
            evenOddYearFilter: this._validateEnum(params.evenOddYearFilter, ['All', 'Even', 'Odd', 0, 1, 2], 'All'),
            decadeYearsValue: this._validateArray(params.decadeYearsValue, 1, 10),

            // Month filters
            positiveNegativeMonthFilter: this._validateEnum(params.positiveNegativeMonthFilter, ['All', 'Positive', 'Negative'], 'All'),
            evenOddMonthFilter: this._validateEnum(params.evenOddMonthFilter, ['All', 'Even', 'Odd', 0, 1], 'All'),
            specificMonthSelectionValue: this._validateInteger(params.specificMonthSelectionValue, 0, 0, 12),

            // Expiry week filters
            positiveNegativeExpiryWeekFilter: this._validateEnum(params.positiveNegativeExpiryWeekFilter, ['All', 'Positive', 'Negative'], 'All'),
            evenOddExpiryWeekMonthlyFilter: this._validateEnum(params.evenOddExpiryWeekMonthlyFilter, ['All', 'Even', 'Odd', 0, 1], 'All'),
            specificExpiryWeekMonthlySelectionValue: this._validateInteger(params.specificExpiryWeekMonthlySelectionValue, 0, 0, 6),
            evenOddExpiryWeekYearlyFilter: this._validateEnum(params.evenOddExpiryWeekYearlyFilter, ['All', 'Even', 'Odd', 0, 1], 'All'),

            // Monday week filters
            positiveNegativeMondayWeekFilter: this._validateEnum(params.positiveNegativeMondayWeekFilter, ['All', 'Positive', 'Negative'], 'All'),
            evenOddMondayWeekMonthlyFilter: this._validateEnum(params.evenOddMondayWeekMonthlyFilter, ['All', 'Even', 'Odd', 0, 1], 'All'),
            specificMondayWeekMonthlySelectionValue: this._validateInteger(params.specificMondayWeekMonthlySelectionValue, 0, 0, 6),
            evenOddMondayWeekYearlyFilter: this._validateEnum(params.evenOddMondayWeekYearlyFilter, ['All', 'Even', 'Odd', 0, 1], 'All'),

            // Day filters
            positiveNegativeDayFilter: this._validateEnum(params.positiveNegativeDayFilter, ['All', 'Positive', 'Negative'], 'All'),
            weekdayNameFilter: this._validateWeekdayArray(params.weekdayNameFilter),
            evenOddCalenderMonthDayFilter: this._validateEnum(params.evenOddCalenderMonthDayFilter, ['All', 'Even', 'Odd', 0, 1], 'All'),
            evenOddCalenderYearDayFilter: this._validateEnum(params.evenOddCalenderYearDayFilter, ['All', 'Even', 'Odd', 0, 1], 'All'),
            evenOddTradingMonthDayFilter: this._validateEnum(params.evenOddTradingMonthDayFilter, ['All', 'Even', 'Odd', 0, 1], 'All'),
            evenOddTradingYearDayFilter: this._validateEnum(params.evenOddTradingYearDayFilter, ['All', 'Even', 'Odd', 0, 1], 'All'),

            // Performance filters
            dailyPercentageChangeFilter: this._validatePercentageRange(params.dailyPercentageChangeFilter),
            dailyPercentageChangeFilterSwitch: this._validateBoolean(params.dailyPercentageChangeFilterSwitch, false),
            mondayWeeklyPercentageChangeFilter: this._validatePercentageRange(params.mondayWeeklyPercentageChangeFilter),
            mondayWeeklyPercentageChangeFilterSwitch: this._validateBoolean(params.mondayWeeklyPercentageChangeFilterSwitch, false),
            expiryWeeklyPercentageChangeFilter: this._validatePercentageRange(params.expiryWeeklyPercentageChangeFilter),
            expiryWeeklyPercentageChangeFilterSwitch: this._validateBoolean(params.expiryWeeklyPercentageChangeFilterSwitch, false),
            monthlyPercentageChangeFilter: this._validatePercentageRange(params.monthlyPercentageChangeFilter),
            monthlyPercentageChangeFilterSwitch: this._validateBoolean(params.monthlyPercentageChangeFilterSwitch, false),
            yearlyPercentageChangeFilter: this._validatePercentageRange(params.yearlyPercentageChangeFilter),
            yearlyPercentageChangeFilterSwitch: this._validateBoolean(params.yearlyPercentageChangeFilterSwitch, false)
        };

        // Cross-validation
        this._validateDateRange(validated.startDate, validated.endDate);
        this._validateSymbolExists(validated.symbolNameToPlotValue);

        return validated;
    }

    /**
     * Optimize query for better performance
     * Adds proper indexing hints and query structure
     */
    optimizeQuery(query) {
        // Add performance optimizations
        const optimized = { ...query };

        // Ensure proper ordering for pagination
        if (!optimized.orderBy) {
            optimized.orderBy = { date: 'asc' };
        }

        // Add index hints for complex queries
        if (optimized.whereRaw) {
            optimized._indexHints = ['date', 'tickerId'];
        }

        // Limit result set for performance
        if (!optimized.take && !optimized.skip) {
            optimized.take = 10000; // Default limit
        }

        return optimized;
    }

    // Private helper methods for validation

    _validateString(value, defaultValue = null) {
        if (value === null || value === undefined || value === '') {
            return defaultValue;
        }
        return String(value).trim();
    }

    _validateInteger(value, defaultValue = 0, min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER) {
        if (value === null || value === undefined || value === '') {
            return defaultValue;
        }

        const parsed = parseInt(value, 10);
        if (isNaN(parsed)) {
            return defaultValue;
        }

        return Math.max(min, Math.min(max, parsed));
    }

    _validateEnum(value, allowedValues, defaultValue) {
        if (allowedValues.includes(value)) {
            return value;
        }
        return defaultValue;
    }

    _validateArray(value, minLength = 0, maxLength = 100) {
        if (!Array.isArray(value)) {
            return [];
        }

        return value.slice(0, maxLength).filter((item, index) => index >= minLength - 1);
    }

    _validateWeekdayArray(value) {
        const validWeekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

        if (!Array.isArray(value)) {
            return [];
        }

        return value.filter(day => validWeekdays.includes(day));
    }

    _validatePercentageRange(value) {
        if (!Array.isArray(value) || value.length !== 2) {
            return null;
        }

        const [min, max] = value.map(v => parseFloat(v)).filter(v => !isNaN(v));

        if (min === undefined || max === undefined) {
            return null;
        }

        return [Math.min(min, max), Math.max(min, max)];
    }

    _validateBoolean(value, defaultValue = false) {
        if (typeof value === 'boolean') {
            return value;
        }

        if (typeof value === 'string') {
            return value.toLowerCase() === 'true';
        }

        return defaultValue;
    }

    _validateDate(value) {
        if (!value) {
            return null;
        }

        const date = new Date(value);
        if (isNaN(date.getTime())) {
            return null;
        }

        return date;
    }

    _validateDateRange(startDate, endDate) {
        if (startDate && endDate && startDate > endDate) {
            throw new Error('Start date cannot be after end date');
        }
    }

    async _validateSymbolExists(symbol) {
        if (!symbol) {
            throw new Error('Symbol is required');
        }

        const ticker = await this.prisma.ticker.findFirst({
            where: { symbol: symbol.toUpperCase() }
        });

        if (!ticker) {
            throw new Error(`Symbol '${symbol}' not found in database`);
        }

        return ticker;
    }

    _buildBaseQuery(params) {
        return {
            where: {
                ticker: {
                    symbol: params.symbolNameToPlotValue?.toUpperCase()
                }
            },
            include: {
                ticker: true
            },
            orderBy: {
                date: 'asc'
            }
        };
    }

    async _executeQuery(query, params) {
        try {
            // Check cache first
            const cacheKey = this._generateCacheKey(query, params);
            if (this.cache.has(cacheKey)) {
                this.performanceMetrics.cacheHits++;
                return {
                    ...this.cache.get(cacheKey),
                    fromCache: true
                };
            }

            // Execute query
            let data;
            if (query.whereRaw) {
                // Use raw SQL for complex conditions
                data = await this.prisma.$queryRaw`
                    SELECT * FROM "SeasonalityData" sd
                    JOIN "Ticker" t ON sd."tickerId" = t.id
                    WHERE t.symbol = ${params.symbolNameToPlotValue?.toUpperCase()}
                    AND (${query.whereRaw})
                    ORDER BY sd.date ASC
                    ${query.take ? `LIMIT ${query.take}` : ''}
                `;
            } else {
                // Use Prisma query
                data = await this.prisma.seasonalityData.findMany(query);
            }

            const result = {
                data,
                count: data.length
            };

            // Cache result
            this.cache.set(cacheKey, result);

            // Limit cache size
            if (this.cache.size > 100) {
                const firstKey = this.cache.keys().next().value;
                this.cache.delete(firstKey);
            }

            return result;

        } catch (error) {
            console.error('Query execution error:', error);
            throw new Error(`Database query failed: ${error.message}`);
        }
    }

    _generateCacheKey(query, params) {
        return JSON.stringify({ query, params });
    }

    _getAppliedFilters(params) {
        const applied = [];

        Object.entries(params).forEach(([key, value]) => {
            if (value !== null && value !== undefined && value !== '' && value !== 'All' && value !== 0 && value !== false) {
                if (Array.isArray(value) && value.length > 0) {
                    applied.push(key);
                } else if (!Array.isArray(value)) {
                    applied.push(key);
                }
            }
        });

        return applied;
    }

    /**
     * Get performance metrics
     */
    getPerformanceMetrics() {
        return {
            ...this.performanceMetrics,
            cacheSize: this.cache.size,
            averageExecutionTime: this.performanceMetrics.queriesExecuted > 0 ?
                this.performanceMetrics.totalExecutionTime / this.performanceMetrics.queriesExecuted : 0
        };
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
        console.log('Filter cache cleared');
    }

    /**
     * Cleanup resources
     */
    async cleanup() {
        try {
            this.clearCache();
            await this.prisma.$disconnect();
            console.log('FilterService cleanup completed');
        } catch (error) {
            console.error('Error during FilterService cleanup:', error);
        }
    }
}

module.exports = FilterService;