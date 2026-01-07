/**
 * Validation Middleware
 * 
 * Provides request validation for API endpoints
 * Implements comprehensive validation for analysis and upload requests
 * 
 * @author Seasonality SaaS Team
 * @version 1.0.0
 */

const { body, query, param, validationResult } = require('express-validator');

/**
 * Handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            error: 'Validation failed',
            details: errors.array().map(error => ({
                field: error.path,
                message: error.msg,
                value: error.value
            }))
        });
    }

    next();
};

/**
 * Validate analysis request parameters
 */
const validateAnalysisRequest = [
    // Required parameters
    body('symbolNameToPlotValue')
        .notEmpty()
        .withMessage('Symbol is required')
        .isString()
        .withMessage('Symbol must be a string')
        .isLength({ min: 1, max: 20 })
        .withMessage('Symbol must be between 1 and 20 characters'),

    // Optional date parameters
    body('startDate')
        .optional()
        .isISO8601()
        .withMessage('Start date must be a valid ISO 8601 date'),

    body('endDate')
        .optional()
        .isISO8601()
        .withMessage('End date must be a valid ISO 8601 date'),

    body('dateLastNDaysValue')
        .optional()
        .isInt({ min: 1, max: 10000 })
        .withMessage('Last N days must be between 1 and 10000'),

    // Year filters
    body('positiveNegativeYearFilter')
        .optional()
        .isIn(['All', 'Positive', 'Negative'])
        .withMessage('Year filter must be All, Positive, or Negative'),

    body('evenOddYearFilter')
        .optional()
        .isIn(['All', 'Even', 'Odd', 0, 1, 2])
        .withMessage('Even/Odd year filter must be All, Even, Odd, 0, 1, or 2'),

    body('decadeYearsValue')
        .optional()
        .isArray({ min: 0, max: 10 })
        .withMessage('Decade years must be an array with max 10 elements'),

    // Month filters
    body('positiveNegativeMonthFilter')
        .optional()
        .isIn(['All', 'Positive', 'Negative'])
        .withMessage('Month filter must be All, Positive, or Negative'),

    body('evenOddMonthFilter')
        .optional()
        .isIn(['All', 'Even', 'Odd', 0, 1])
        .withMessage('Even/Odd month filter must be All, Even, Odd, 0, or 1'),

    body('specificMonthSelectionValue')
        .optional()
        .isInt({ min: 0, max: 12 })
        .withMessage('Specific month must be between 0 and 12'),

    // Week filters
    body('positiveNegativeExpiryWeekFilter')
        .optional()
        .isIn(['All', 'Positive', 'Negative'])
        .withMessage('Expiry week filter must be All, Positive, or Negative'),

    body('evenOddExpiryWeekMonthlyFilter')
        .optional()
        .isIn(['All', 'Even', 'Odd', 0, 1])
        .withMessage('Even/Odd expiry week monthly filter must be All, Even, Odd, 0, or 1'),

    body('specificExpiryWeekMonthlySelectionValue')
        .optional()
        .isInt({ min: 0, max: 6 })
        .withMessage('Specific expiry week monthly must be between 0 and 6'),

    body('evenOddExpiryWeekYearlyFilter')
        .optional()
        .isIn(['All', 'Even', 'Odd', 0, 1])
        .withMessage('Even/Odd expiry week yearly filter must be All, Even, Odd, 0, or 1'),

    body('positiveNegativeMondayWeekFilter')
        .optional()
        .isIn(['All', 'Positive', 'Negative'])
        .withMessage('Monday week filter must be All, Positive, or Negative'),

    body('evenOddMondayWeekMonthlyFilter')
        .optional()
        .isIn(['All', 'Even', 'Odd', 0, 1])
        .withMessage('Even/Odd Monday week monthly filter must be All, Even, Odd, 0, or 1'),

    body('specificMondayWeekMonthlySelectionValue')
        .optional()
        .isInt({ min: 0, max: 6 })
        .withMessage('Specific Monday week monthly must be between 0 and 6'),

    body('evenOddMondayWeekYearlyFilter')
        .optional()
        .isIn(['All', 'Even', 'Odd', 0, 1])
        .withMessage('Even/Odd Monday week yearly filter must be All, Even, Odd, 0, or 1'),

    // Day filters
    body('positiveNegativeDayFilter')
        .optional()
        .isIn(['All', 'Positive', 'Negative'])
        .withMessage('Day filter must be All, Positive, or Negative'),

    body('weekdayNameFilter')
        .optional()
        .isArray()
        .withMessage('Weekday filter must be an array'),

    body('weekdayNameFilter.*')
        .optional()
        .isIn(['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'])
        .withMessage('Weekday must be a valid day name'),

    body('evenOddCalenderMonthDayFilter')
        .optional()
        .isIn(['All', 'Even', 'Odd', 0, 1])
        .withMessage('Even/Odd calendar month day filter must be All, Even, Odd, 0, or 1'),

    body('evenOddCalenderYearDayFilter')
        .optional()
        .isIn(['All', 'Even', 'Odd', 0, 1])
        .withMessage('Even/Odd calendar year day filter must be All, Even, Odd, 0, or 1'),

    body('evenOddTradingMonthDayFilter')
        .optional()
        .isIn(['All', 'Even', 'Odd', 0, 1])
        .withMessage('Even/Odd trading month day filter must be All, Even, Odd, 0, or 1'),

    body('evenOddTradingYearDayFilter')
        .optional()
        .isIn(['All', 'Even', 'Odd', 0, 1])
        .withMessage('Even/Odd trading year day filter must be All, Even, Odd, 0, or 1'),

    // Performance filters
    body('dailyPercentageChangeFilter')
        .optional()
        .isArray({ min: 2, max: 2 })
        .withMessage('Daily percentage change filter must be an array with 2 elements'),

    body('dailyPercentageChangeFilter.*')
        .optional()
        .isFloat({ min: -1000, max: 1000 })
        .withMessage('Daily percentage change values must be between -1000 and 1000'),

    body('dailyPercentageChangeFilterSwitch')
        .optional()
        .isBoolean()
        .withMessage('Daily percentage change filter switch must be boolean'),

    body('mondayWeeklyPercentageChangeFilter')
        .optional()
        .isArray({ min: 2, max: 2 })
        .withMessage('Monday weekly percentage change filter must be an array with 2 elements'),

    body('mondayWeeklyPercentageChangeFilter.*')
        .optional()
        .isFloat({ min: -1000, max: 1000 })
        .withMessage('Monday weekly percentage change values must be between -1000 and 1000'),

    body('mondayWeeklyPercentageChangeFilterSwitch')
        .optional()
        .isBoolean()
        .withMessage('Monday weekly percentage change filter switch must be boolean'),

    body('expiryWeeklyPercentageChangeFilter')
        .optional()
        .isArray({ min: 2, max: 2 })
        .withMessage('Expiry weekly percentage change filter must be an array with 2 elements'),

    body('expiryWeeklyPercentageChangeFilter.*')
        .optional()
        .isFloat({ min: -1000, max: 1000 })
        .withMessage('Expiry weekly percentage change values must be between -1000 and 1000'),

    body('expiryWeeklyPercentageChangeFilterSwitch')
        .optional()
        .isBoolean()
        .withMessage('Expiry weekly percentage change filter switch must be boolean'),

    body('monthlyPercentageChangeFilter')
        .optional()
        .isArray({ min: 2, max: 2 })
        .withMessage('Monthly percentage change filter must be an array with 2 elements'),

    body('monthlyPercentageChangeFilter.*')
        .optional()
        .isFloat({ min: -1000, max: 1000 })
        .withMessage('Monthly percentage change values must be between -1000 and 1000'),

    body('monthlyPercentageChangeFilterSwitch')
        .optional()
        .isBoolean()
        .withMessage('Monthly percentage change filter switch must be boolean'),

    body('yearlyPercentageChangeFilter')
        .optional()
        .isArray({ min: 2, max: 2 })
        .withMessage('Yearly percentage change filter must be an array with 2 elements'),

    body('yearlyPercentageChangeFilter.*')
        .optional()
        .isFloat({ min: -1000, max: 1000 })
        .withMessage('Yearly percentage change values must be between -1000 and 1000'),

    body('yearlyPercentageChangeFilterSwitch')
        .optional()
        .isBoolean()
        .withMessage('Yearly percentage change filter switch must be boolean'),

    // Analysis-specific parameters
    body('consecutiveDays')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Consecutive days must be between 1 and 100'),

    body('trendDirection')
        .optional()
        .isIn(['more', 'less'])
        .withMessage('Trend direction must be "more" or "less"'),

    body('percentageThreshold')
        .optional()
        .isFloat({ min: -100, max: 100 })
        .withMessage('Percentage threshold must be between -100 and 100'),

    body('weekOffset')
        .optional()
        .isInt({ min: 0, max: 52 })
        .withMessage('Week offset must be between 0 and 52'),

    body('monthOffset')
        .optional()
        .isInt({ min: 0, max: 12 })
        .withMessage('Month offset must be between 0 and 12'),

    body('yearOffset')
        .optional()
        .isInt({ min: 0, max: 10 })
        .withMessage('Year offset must be between 0 and 10'),

    // Consecutive analysis parameters
    body('trendType')
        .optional()
        .isIn(['Bullish', 'Bearish'])
        .withMessage('Trend type must be Bullish or Bearish'),

    body('minimumAccuracy')
        .optional()
        .isFloat({ min: 0, max: 100 })
        .withMessage('Minimum accuracy must be between 0 and 100'),

    body('minimumTotalPnL')
        .optional()
        .isFloat()
        .withMessage('Minimum total PnL must be a number'),

    body('minimumSampleSize')
        .optional()
        .isInt({ min: 1, max: 10000 })
        .withMessage('Minimum sample size must be between 1 and 10000'),

    body('minimumAveragePnL')
        .optional()
        .isFloat()
        .withMessage('Minimum average PnL must be a number'),

    body('operation12')
        .optional()
        .isIn(['AND', 'OR'])
        .withMessage('Operation 1-2 must be AND or OR'),

    body('operation23')
        .optional()
        .isIn(['AND', 'OR'])
        .withMessage('Operation 2-3 must be AND or OR'),

    body('operation34')
        .optional()
        .isIn(['AND', 'OR'])
        .withMessage('Operation 3-4 must be AND or OR'),

    // Election analysis parameters
    body('electionType')
        .optional()
        .isIn(['GENERAL', 'STATE_ASSEMBLY', 'LOCAL_BODY', 'BY_ELECTION'])
        .withMessage('Election type must be GENERAL, STATE_ASSEMBLY, LOCAL_BODY, or BY_ELECTION'),

    // Performance table parameters
    body('entryType')
        .optional()
        .isIn(['Open', 'Close'])
        .withMessage('Entry type must be Open or Close'),

    body('exitType')
        .optional()
        .isIn(['Open', 'Close'])
        .withMessage('Exit type must be Open or Close'),

    body('tradeType')
        .optional()
        .isIn(['Long', 'Short'])
        .withMessage('Trade type must be Long or Short'),

    body('entryDay')
        .optional()
        .isIn(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'])
        .withMessage('Entry day must be a valid weekday'),

    body('exitDay')
        .optional()
        .isIn(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'])
        .withMessage('Exit day must be a valid weekday'),

    body('returnType')
        .optional()
        .isIn(['Percent', 'Points'])
        .withMessage('Return type must be Percent or Points'),

    // General options
    body('saveResults')
        .optional()
        .isBoolean()
        .withMessage('Save results must be boolean'),

    body('chartScaleValue')
        .optional()
        .isIn(['linear', 'log'])
        .withMessage('Chart scale must be linear or log'),

    // Custom validation for date range
    body().custom((body) => {
        if (body.startDate && body.endDate) {
            const start = new Date(body.startDate);
            const end = new Date(body.endDate);

            if (start >= end) {
                throw new Error('Start date must be before end date');
            }
        }

        return true;
    }),

    // Custom validation for percentage change filters
    body().custom((body) => {
        const percentageFilters = [
            'dailyPercentageChangeFilter',
            'mondayWeeklyPercentageChangeFilter',
            'expiryWeeklyPercentageChangeFilter',
            'monthlyPercentageChangeFilter',
            'yearlyPercentageChangeFilter'
        ];

        for (const filter of percentageFilters) {
            if (body[filter] && Array.isArray(body[filter]) && body[filter].length === 2) {
                const [min, max] = body[filter];
                if (min >= max) {
                    throw new Error(`${filter}: minimum value must be less than maximum value`);
                }
            }
        }

        return true;
    }),

    handleValidationErrors
];

/**
 * Validate query parameters for history endpoints
 */
const validateHistoryQuery = [
    query('analysisType')
        .optional()
        .isIn(['BASIC_STATISTICS', 'TRENDING_ANALYSIS', 'CONSECUTIVE_ANALYSIS', 'PERFORMANCE_TABLE', 'SEASONAL_PATTERNS', 'CUSTOM_ANALYSIS'])
        .withMessage('Invalid analysis type'),

    query('status')
        .optional()
        .isIn(['PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED'])
        .withMessage('Invalid status'),

    query('startDate')
        .optional()
        .isISO8601()
        .withMessage('Start date must be a valid ISO 8601 date'),

    query('endDate')
        .optional()
        .isISO8601()
        .withMessage('End date must be a valid ISO 8601 date'),

    query('limit')
        .optional()
        .isInt({ min: 1, max: 1000 })
        .withMessage('Limit must be between 1 and 1000'),

    handleValidationErrors
];

/**
 * Validate batch ID parameter
 */
const validateBatchId = [
    param('batchId')
        .notEmpty()
        .withMessage('Batch ID is required')
        .matches(/^batch_\d+_[a-z0-9]+$/)
        .withMessage('Invalid batch ID format'),

    handleValidationErrors
];

/**
 * Validate upload parameters
 */
const validateUploadParams = [
    body('timeframe')
        .optional()
        .isIn(['DAILY', 'MONDAY_WEEKLY', 'EXPIRY_WEEKLY', 'MONTHLY', 'YEARLY'])
        .withMessage('Invalid timeframe'),

    body('generateAllTimeframes')
        .optional()
        .isBoolean()
        .withMessage('Generate all timeframes must be boolean'),

    body('calculateReturns')
        .optional()
        .isBoolean()
        .withMessage('Calculate returns must be boolean'),

    body('concurrency')
        .optional()
        .isInt({ min: 1, max: 10 })
        .withMessage('Concurrency must be between 1 and 10'),

    handleValidationErrors
];

module.exports = {
    validateAnalysisRequest,
    validateHistoryQuery,
    validateBatchId,
    validateUploadParams,
    handleValidationErrors
};