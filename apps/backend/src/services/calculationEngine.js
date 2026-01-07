/**
 * Calculation Engine - Advanced Financial Calculations
 * 
 * Handles return percentage calculations, statistical analysis, and trend detection
 * Implements high-performance calculation algorithms with mathematical precision
 * 
 * @author Seasonality SaaS Team
 * @version 1.0.0
 */

const Decimal = require('decimal.js');
const { addDays, differenceInDays, format } = require('date-fns');

// Configure Decimal.js for financial precision
Decimal.config({
    precision: 28,
    rounding: Decimal.ROUND_HALF_UP,
    toExpNeg: -7,
    toExpPos: 21
});

/**
 * CalculationEngine Class
 * High-performance financial calculations with mathematical precision
 */
class CalculationEngine {
    constructor() {
        this.calculationMetrics = {
            calculationsPerformed: 0,
            totalExecutionTime: 0,
            errorCount: 0,
            cacheHits: 0
        };

        // Calculation cache for expensive operations
        this.calculationCache = new Map();
        this.maxCacheSize = 1000;
    }

    /**
     * Calculate return percentages for time series data
     * 
     * @param {Array} data - Time series data with close prices
     * @param {Object} options - Calculation options
     * @returns {Array} Data with calculated returns
     */
    calculateReturnPercentages(data, options = {}) {
        const startTime = Date.now();

        try {
            if (!Array.isArray(data) || data.length === 0) {
                throw new Error('Data array is required and cannot be empty');
            }

            const method = options.method || 'simple'; // 'simple' or 'logarithmic'
            const precision = options.precision || 4;

            const results = data.map((record, index) => {
                if (index === 0) {
                    return {
                        ...record,
                        returnPercentage: null,
                        returnPoints: null,
                        logReturn: null
                    };
                }

                const currentPrice = new Decimal(record.close);
                const previousPrice = new Decimal(data[index - 1].close);

                if (previousPrice.isZero()) {
                    return {
                        ...record,
                        returnPercentage: null,
                        returnPoints: null,
                        logReturn: null
                    };
                }

                const returnPoints = currentPrice.minus(previousPrice);
                const returnPercentage = returnPoints.div(previousPrice).mul(100);
                const logReturn = method === 'logarithmic' ?
                    Decimal.ln(currentPrice.div(previousPrice)).mul(100) : null;

                return {
                    ...record,
                    returnPercentage: returnPercentage.toDecimalPlaces(precision).toNumber(),
                    returnPoints: returnPoints.toDecimalPlaces(precision).toNumber(),
                    logReturn: logReturn ? logReturn.toDecimalPlaces(precision).toNumber() : null
                };
            });

            this._updateCalculationMetrics(Date.now() - startTime, true);

            return results;

        } catch (error) {
            this._updateCalculationMetrics(Date.now() - startTime, false);
            console.error('Error calculating return percentages:', error);
            throw new Error(`Return calculation failed: ${error.message}`);
        }
    }

    /**
     * Calculate moving averages
     * 
     * @param {Array} data - Time series data
     * @param {number} period - Moving average period
     * @param {string} field - Field to calculate MA for (default: 'close')
     * @returns {Array} Data with moving averages
     */
    calculateMovingAverage(data, period, field = 'close') {
        const startTime = Date.now();

        try {
            if (!Array.isArray(data) || data.length === 0) {
                throw new Error('Data array is required');
            }

            if (period <= 0 || period > data.length) {
                throw new Error('Invalid period for moving average');
            }

            const results = data.map((record, index) => {
                if (index < period - 1) {
                    return {
                        ...record,
                        [`ma${period}`]: null
                    };
                }

                const slice = data.slice(index - period + 1, index + 1);
                const sum = slice.reduce((acc, item) =>
                    acc.plus(new Decimal(item[field] || 0)), new Decimal(0));
                const average = sum.div(period);

                return {
                    ...record,
                    [`ma${period}`]: average.toDecimalPlaces(4).toNumber()
                };
            });

            this._updateCalculationMetrics(Date.now() - startTime, true);

            return results;

        } catch (error) {
            this._updateCalculationMetrics(Date.now() - startTime, false);
            console.error('Error calculating moving average:', error);
            throw new Error(`Moving average calculation failed: ${error.message}`);
        }
    }

    /**
     * Calculate volatility (standard deviation of returns)
     * 
     * @param {Array} data - Data with return percentages
     * @param {number} period - Volatility calculation period
     * @returns {Array} Data with volatility measures
     */
    calculateVolatility(data, period = 20) {
        const startTime = Date.now();

        try {
            if (!Array.isArray(data) || data.length === 0) {
                throw new Error('Data array is required');
            }

            const results = data.map((record, index) => {
                if (index < period - 1 || !record.returnPercentage) {
                    return {
                        ...record,
                        volatility: null,
                        annualizedVolatility: null
                    };
                }

                const slice = data.slice(index - period + 1, index + 1);
                const returns = slice
                    .map(item => item.returnPercentage)
                    .filter(ret => ret !== null && ret !== undefined)
                    .map(ret => new Decimal(ret));

                if (returns.length < period) {
                    return {
                        ...record,
                        volatility: null,
                        annualizedVolatility: null
                    };
                }

                // Calculate mean
                const mean = returns.reduce((sum, ret) => sum.plus(ret), new Decimal(0))
                    .div(returns.length);

                // Calculate variance
                const variance = returns
                    .reduce((sum, ret) => sum.plus(ret.minus(mean).pow(2)), new Decimal(0))
                    .div(returns.length - 1);

                // Calculate standard deviation (volatility)
                const volatility = variance.sqrt();
                const annualizedVolatility = volatility.mul(Math.sqrt(252)); // Assuming 252 trading days

                return {
                    ...record,
                    volatility: volatility.toDecimalPlaces(4).toNumber(),
                    annualizedVolatility: annualizedVolatility.toDecimalPlaces(4).toNumber()
                };
            });

            this._updateCalculationMetrics(Date.now() - startTime, true);

            return results;

        } catch (error) {
            this._updateCalculationMetrics(Date.now() - startTime, false);
            console.error('Error calculating volatility:', error);
            throw new Error(`Volatility calculation failed: ${error.message}`);
        }
    }

    /**
     * Detect trend patterns in data
     * 
     * @param {Array} data - Time series data
     * @param {Object} options - Trend detection options
     * @returns {Object} Detected trends
     */
    detectTrends(data, options = {}) {
        const startTime = Date.now();

        try {
            if (!Array.isArray(data) || data.length === 0) {
                throw new Error('Data array is required');
            }

            const minTrendLength = options.minTrendLength || 3;
            const trendThreshold = options.trendThreshold || 0; // Minimum return for trend

            const trends = {
                uptrends: [],
                downtrends: [],
                sideways: []
            };

            let currentTrend = null;
            let trendStart = 0;

            for (let i = 1; i < data.length; i++) {
                const currentReturn = data[i].returnPercentage;

                if (currentReturn === null || currentReturn === undefined) {
                    continue;
                }

                const trendDirection = currentReturn > trendThreshold ? 'up' :
                    currentReturn < -trendThreshold ? 'down' : 'sideways';

                if (currentTrend === null) {
                    currentTrend = trendDirection;
                    trendStart = i;
                } else if (currentTrend !== trendDirection) {
                    // Trend change detected
                    const trendLength = i - trendStart;

                    if (trendLength >= minTrendLength) {
                        const trendData = {
                            type: currentTrend,
                            startIndex: trendStart,
                            endIndex: i - 1,
                            length: trendLength,
                            startDate: data[trendStart].date,
                            endDate: data[i - 1].date,
                            totalReturn: this._calculateTotalReturn(data.slice(trendStart, i))
                        };

                        trends[`${currentTrend}trends`].push(trendData);
                    }

                    currentTrend = trendDirection;
                    trendStart = i;
                }
            }

            // Handle the last trend
            if (currentTrend !== null && data.length - trendStart >= minTrendLength) {
                const trendData = {
                    type: currentTrend,
                    startIndex: trendStart,
                    endIndex: data.length - 1,
                    length: data.length - trendStart,
                    startDate: data[trendStart].date,
                    endDate: data[data.length - 1].date,
                    totalReturn: this._calculateTotalReturn(data.slice(trendStart))
                };

                trends[`${currentTrend}trends`].push(trendData);
            }

            this._updateCalculationMetrics(Date.now() - startTime, true);

            return {
                trends,
                summary: {
                    totalUptrends: trends.uptrends.length,
                    totalDowntrends: trends.downtrends.length,
                    totalSidewaysTrends: trends.sideways.length,
                    avgUptrendLength: this._calculateAverageLength(trends.uptrends),
                    avgDowntrendLength: this._calculateAverageLength(trends.downtrends)
                }
            };

        } catch (error) {
            this._updateCalculationMetrics(Date.now() - startTime, false);
            console.error('Error detecting trends:', error);
            throw new Error(`Trend detection failed: ${error.message}`);
        }
    }

    /**
     * Calculate correlation between two data series
     * 
     * @param {Array} series1 - First data series
     * @param {Array} series2 - Second data series
     * @param {string} field - Field to correlate (default: 'returnPercentage')
     * @returns {number} Correlation coefficient
     */
    calculateCorrelation(series1, series2, field = 'returnPercentage') {
        const startTime = Date.now();

        try {
            if (!Array.isArray(series1) || !Array.isArray(series2)) {
                throw new Error('Both series must be arrays');
            }

            if (series1.length !== series2.length) {
                throw new Error('Series must have the same length');
            }

            // Extract values and filter out nulls
            const pairs = [];
            for (let i = 0; i < series1.length; i++) {
                const val1 = series1[i][field];
                const val2 = series2[i][field];

                if (val1 !== null && val1 !== undefined &&
                    val2 !== null && val2 !== undefined) {
                    pairs.push([new Decimal(val1), new Decimal(val2)]);
                }
            }

            if (pairs.length < 2) {
                throw new Error('Insufficient data points for correlation calculation');
            }

            // Calculate means
            const mean1 = pairs.reduce((sum, pair) => sum.plus(pair[0]), new Decimal(0))
                .div(pairs.length);
            const mean2 = pairs.reduce((sum, pair) => sum.plus(pair[1]), new Decimal(0))
                .div(pairs.length);

            // Calculate correlation coefficient
            let numerator = new Decimal(0);
            let sumSq1 = new Decimal(0);
            let sumSq2 = new Decimal(0);

            pairs.forEach(([val1, val2]) => {
                const diff1 = val1.minus(mean1);
                const diff2 = val2.minus(mean2);

                numerator = numerator.plus(diff1.mul(diff2));
                sumSq1 = sumSq1.plus(diff1.pow(2));
                sumSq2 = sumSq2.plus(diff2.pow(2));
            });

            const denominator = sumSq1.sqrt().mul(sumSq2.sqrt());

            if (denominator.isZero()) {
                return 0;
            }

            const correlation = numerator.div(denominator);

            this._updateCalculationMetrics(Date.now() - startTime, true);

            return correlation.toDecimalPlaces(6).toNumber();

        } catch (error) {
            this._updateCalculationMetrics(Date.now() - startTime, false);
            console.error('Error calculating correlation:', error);
            throw new Error(`Correlation calculation failed: ${error.message}`);
        }
    }

    /**
     * Calculate Sharpe ratio
     * 
     * @param {Array} data - Data with return percentages
     * @param {number} riskFreeRate - Risk-free rate (annualized %)
     * @returns {number} Sharpe ratio
     */
    calculateSharpeRatio(data, riskFreeRate = 0) {
        const startTime = Date.now();

        try {
            const returns = data
                .map(record => record.returnPercentage)
                .filter(ret => ret !== null && ret !== undefined)
                .map(ret => new Decimal(ret));

            if (returns.length === 0) {
                throw new Error('No valid returns found');
            }

            // Calculate average return
            const avgReturn = returns.reduce((sum, ret) => sum.plus(ret), new Decimal(0))
                .div(returns.length);

            // Annualize the return (assuming daily data)
            const annualizedReturn = avgReturn.mul(252);

            // Calculate standard deviation
            const variance = returns
                .reduce((sum, ret) => sum.plus(ret.minus(avgReturn).pow(2)), new Decimal(0))
                .div(returns.length - 1);

            const volatility = variance.sqrt().mul(Math.sqrt(252)); // Annualized

            if (volatility.isZero()) {
                return 0;
            }

            const excessReturn = annualizedReturn.minus(riskFreeRate);
            const sharpeRatio = excessReturn.div(volatility);

            this._updateCalculationMetrics(Date.now() - startTime, true);

            return sharpeRatio.toDecimalPlaces(4).toNumber();

        } catch (error) {
            this._updateCalculationMetrics(Date.now() - startTime, false);
            console.error('Error calculating Sharpe ratio:', error);
            throw new Error(`Sharpe ratio calculation failed: ${error.message}`);
        }
    }

    /**
     * Calculate maximum drawdown
     * 
     * @param {Array} data - Data with close prices
     * @returns {Object} Drawdown analysis
     */
    calculateMaxDrawdown(data) {
        const startTime = Date.now();

        try {
            if (!Array.isArray(data) || data.length === 0) {
                throw new Error('Data array is required');
            }

            let maxDrawdown = new Decimal(0);
            let peak = new Decimal(data[0].close);
            let peakIndex = 0;
            let troughIndex = 0;
            let maxDrawdownStart = 0;
            let maxDrawdownEnd = 0;

            for (let i = 1; i < data.length; i++) {
                const currentPrice = new Decimal(data[i].close);

                if (currentPrice.gt(peak)) {
                    peak = currentPrice;
                    peakIndex = i;
                }

                const drawdown = peak.minus(currentPrice).div(peak);

                if (drawdown.gt(maxDrawdown)) {
                    maxDrawdown = drawdown;
                    troughIndex = i;
                    maxDrawdownStart = peakIndex;
                    maxDrawdownEnd = i;
                }
            }

            this._updateCalculationMetrics(Date.now() - startTime, true);

            return {
                maxDrawdown: maxDrawdown.mul(100).toDecimalPlaces(2).toNumber(), // As percentage
                maxDrawdownStart: maxDrawdownStart,
                maxDrawdownEnd: maxDrawdownEnd,
                peakPrice: peak.toDecimalPlaces(2).toNumber(),
                troughPrice: new Decimal(data[troughIndex].close).toDecimalPlaces(2).toNumber(),
                peakDate: data[maxDrawdownStart].date,
                troughDate: data[maxDrawdownEnd].date,
                drawdownDuration: differenceInDays(
                    new Date(data[maxDrawdownEnd].date),
                    new Date(data[maxDrawdownStart].date)
                )
            };

        } catch (error) {
            this._updateCalculationMetrics(Date.now() - startTime, false);
            console.error('Error calculating max drawdown:', error);
            throw new Error(`Max drawdown calculation failed: ${error.message}`);
        }
    }

    /**
     * Get calculation performance metrics
     */
    getPerformanceMetrics() {
        return {
            ...this.calculationMetrics,
            averageExecutionTime: this.calculationMetrics.calculationsPerformed > 0 ?
                this.calculationMetrics.totalExecutionTime / this.calculationMetrics.calculationsPerformed : 0,
            errorRate: this.calculationMetrics.calculationsPerformed > 0 ?
                (this.calculationMetrics.errorCount / this.calculationMetrics.calculationsPerformed * 100).toFixed(2) + '%' : '0%',
            cacheSize: this.calculationCache.size
        };
    }

    /**
     * Clear calculation cache
     */
    clearCache() {
        this.calculationCache.clear();
        console.log('Calculation cache cleared');
    }

    // Private helper methods

    /**
     * Calculate total return for a data slice
     */
    _calculateTotalReturn(dataSlice) {
        if (dataSlice.length < 2) return 0;

        const startPrice = new Decimal(dataSlice[0].close);
        const endPrice = new Decimal(dataSlice[dataSlice.length - 1].close);

        if (startPrice.isZero()) return 0;

        return endPrice.minus(startPrice).div(startPrice).mul(100).toDecimalPlaces(2).toNumber();
    }

    /**
     * Calculate average length of trends
     */
    _calculateAverageLength(trends) {
        if (trends.length === 0) return 0;

        const totalLength = trends.reduce((sum, trend) => sum + trend.length, 0);
        return Math.round(totalLength / trends.length * 100) / 100;
    }

    /**
     * Update calculation metrics
     */
    _updateCalculationMetrics(executionTime, success) {
        this.calculationMetrics.calculationsPerformed++;
        this.calculationMetrics.totalExecutionTime += executionTime;

        if (!success) {
            this.calculationMetrics.errorCount++;
        }
    }

    /**
     * Cleanup resources
     */
    async cleanup() {
        try {
            this.clearCache();
            console.log('CalculationEngine cleanup completed');
        } catch (error) {
            console.error('Error during CalculationEngine cleanup:', error);
        }
    }
}

module.exports = CalculationEngine;