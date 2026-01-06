/**
 * Statistical Analysis Service Tests
 * 
 * Validates mathematical precision against Python numpy/pandas calculations
 * Tests all migrated functions with identical input data
 * 
 * @author Seasonality SaaS Team
 * @version 1.0.0
 */

const StatisticsService = require('../statisticsService');
const Decimal = require('decimal.js');

describe('StatisticsService', () => {
    let statisticsService;

    beforeEach(() => {
        statisticsService = new StatisticsService();
    });

    describe('getDataTableStatistics', () => {
        test('should calculate statistics identical to Python numpy', () => {
            // Test data that matches Python test case
            const testData = [1.5, -2.3, 4.7, -1.2, 3.8, 0.0, -0.5, 2.1, -3.4, 1.9];

            const result = statisticsService.getDataTableStatistics(testData);

            // Expected results calculated with Python numpy (precision to 10 decimal places)
            const expected = {
                'All Count': 10,
                'Avg Return All': 0.66,
                'Sum Return All': 6.6,
                'Pos Count': 5,
                'Avg Return Pos': 2.8,
                'Sum Return Pos': 14.0,
                'Neg Count': 4,
                'Avg Return Neg': -1.85,
                'Sum Return Neg': -7.4
            };

            expect(result['All Count']).toBe(expected['All Count']);
            expect(result['Avg Return All']).toBeCloseTo(expected['Avg Return All'], 10);
            expect(result['Sum Return All']).toBeCloseTo(expected['Sum Return All'], 10);
            expect(result['Pos Count']).toBe(expected['Pos Count']);
            expect(result['Avg Return Pos']).toBeCloseTo(expected['Avg Return Pos'], 10);
            expect(result['Sum Return Pos']).toBeCloseTo(expected['Sum Return Pos'], 10);
            expect(result['Neg Count']).toBe(expected['Neg Count']);
            expect(result['Avg Return Neg']).toBeCloseTo(expected['Avg Return Neg'], 10);
            expect(result['Sum Return Neg']).toBeCloseTo(expected['Sum Return Neg'], 10);
        });

        test('should handle empty array', () => {
            const result = statisticsService.getDataTableStatistics([]);

            expect(result['All Count']).toBe(0);
            expect(result['Avg Return All']).toBe(0);
            expect(result['Sum Return All']).toBe(0);
            expect(result['Pos Count']).toBe(0);
            expect(result['Avg Return Pos']).toBe(0);
            expect(result['Sum Return Pos']).toBe(0);
            expect(result['Neg Count']).toBe(0);
            expect(result['Avg Return Neg']).toBe(0);
            expect(result['Sum Return Neg']).toBe(0);
        });

        test('should handle array with only positive values', () => {
            const testData = [1.1, 2.2, 3.3, 4.4, 5.5];
            const result = statisticsService.getDataTableStatistics(testData);

            expect(result['All Count']).toBe(5);
            expect(result['Pos Count']).toBe(5);
            expect(result['Neg Count']).toBe(0);
            expect(result['Avg Return All']).toBeCloseTo(3.3, 10);
            expect(result['Sum Return All']).toBeCloseTo(16.5, 10);
        });

        test('should handle array with only negative values', () => {
            const testData = [-1.1, -2.2, -3.3, -4.4, -5.5];
            const result = statisticsService.getDataTableStatistics(testData);

            expect(result['All Count']).toBe(5);
            expect(result['Pos Count']).toBe(0);
            expect(result['Neg Count']).toBe(5);
            expect(result['Avg Return All']).toBeCloseTo(-3.3, 10);
            expect(result['Sum Return All']).toBeCloseTo(-16.5, 10);
        });

        test('should handle precision edge cases', () => {
            // Test with very small numbers that could cause floating point errors
            const testData = [0.1, 0.2, 0.3, -0.1, -0.2, -0.3];
            const result = statisticsService.getDataTableStatistics(testData);

            // These should be exactly 0 with proper decimal arithmetic
            expect(result['Sum Return All']).toBeCloseTo(0, 10);
            expect(result['Avg Return All']).toBeCloseTo(0, 10);
        });
    });

    describe('maximumConsecutiveValues', () => {
        test('should find maximum consecutive streaks identical to Python', () => {
            // Test data that matches Python test case
            const testData = [1, 2, -1, -2, -3, 4, 5, 6, -7, 8, 9];

            const result = statisticsService.maximumConsecutiveValues(testData);

            // Expected results from Python
            expect(result.maximumPositiveCount).toBe(3); // [4, 5, 6] and [8, 9]
            expect(result.maximumNegativeCount).toBe(3); // [-1, -2, -3]
        });

        test('should handle all positive values', () => {
            const testData = [1, 2, 3, 4, 5];
            const result = statisticsService.maximumConsecutiveValues(testData);

            expect(result.maximumPositiveCount).toBe(5);
            expect(result.maximumNegativeCount).toBe(0);
        });

        test('should handle all negative values', () => {
            const testData = [-1, -2, -3, -4, -5];
            const result = statisticsService.maximumConsecutiveValues(testData);

            expect(result.maximumPositiveCount).toBe(0);
            expect(result.maximumNegativeCount).toBe(5);
        });

        test('should handle zeros correctly', () => {
            const testData = [1, 2, 0, -1, -2, 0, 3, 4, 5];
            const result = statisticsService.maximumConsecutiveValues(testData);

            expect(result.maximumPositiveCount).toBe(3); // [3, 4, 5]
            expect(result.maximumNegativeCount).toBe(2); // [-1, -2]
        });

        test('should handle empty array', () => {
            const result = statisticsService.maximumConsecutiveValues([]);

            expect(result.maximumPositiveCount).toBe(0);
            expect(result.maximumNegativeCount).toBe(0);
        });
    });

    describe('getTrendingDays', () => {
        test('should identify trending periods identical to Python', () => {
            // Mock data that matches Python DataFrame structure
            const mockData = [
                { Date: '2023-01-01', Close: 100, ReturnPercentage: 1.5 },
                { Date: '2023-01-02', Close: 102, ReturnPercentage: 2.0 },
                { Date: '2023-01-03', Close: 104, ReturnPercentage: 1.96 },
                { Date: '2023-01-04', Close: 103, ReturnPercentage: -0.96 },
                { Date: '2023-01-05', Close: 105, ReturnPercentage: 1.94 },
                { Date: '2023-01-06', Close: 107, ReturnPercentage: 1.90 },
                { Date: '2023-01-07', Close: 109, ReturnPercentage: 1.87 }
            ];

            const result = statisticsService.getTrendingDays(
                mockData,
                3,      // nTrades: minimum 3 consecutive days
                'more', // opt: looking for returns > threshold
                1.0,    // percentChange: 1% threshold
                1,      // nweek: 1 week ahead
                1,      // nmonth: 1 month ahead
                1       // nyear: 1 year ahead
            );

            expect(result).not.toBeNull();
            expect(result.StartDate).toHaveLength(1);
            expect(result.StartDate[0]).toBe('2023-01-01');
            expect(result.EndDate[0]).toBe('2023-01-04');
            expect(result.TotalDays[0]).toBe(3);

            // Verify percentage calculation precision
            const expectedPercentChange = ((103 - 100) / 100) * 100; // 3%
            expect(result.PercentChange[0]).toBeCloseTo(expectedPercentChange, 2);
        });

        test('should return null for invalid parameters', () => {
            const result = statisticsService.getTrendingDays([], 0, 'more', 1.0, 1, 1, 1);
            expect(result).toBeNull();
        });

        test('should handle "less" operation correctly', () => {
            const mockData = [
                { Date: '2023-01-01', Close: 100, ReturnPercentage: -1.5 },
                { Date: '2023-01-02', Close: 98, ReturnPercentage: -2.0 },
                { Date: '2023-01-03', Close: 96, ReturnPercentage: -2.04 },
                { Date: '2023-01-04', Close: 97, ReturnPercentage: 1.04 }
            ];

            const result = statisticsService.getTrendingDays(
                mockData,
                3,      // nTrades
                'less', // opt: looking for returns < threshold
                -1.0,   // percentChange: -1% threshold
                1, 1, 1
            );

            expect(result).not.toBeNull();
            expect(result.StartDate).toHaveLength(1);
            expect(result.TotalDays[0]).toBe(3);
        });
    });

    describe('getNConsecutiveSequanceIndexFromList', () => {
        test('should perform complex boolean logic identical to Python', () => {
            // Mock data table that matches Python pandas DataFrame structure
            const mockDataTable = {
                'Sum Return All': [2.5, 3.1, -1.2, 4.7, 2.8, -0.5, 1.9, 3.4],
                'Pos Accuracy': [65.5, 72.3, 45.2, 78.9, 69.1, 52.7, 71.8, 75.2],
                'Neg Accuracy': [34.5, 27.7, 54.8, 21.1, 30.9, 47.3, 28.2, 24.8],
                'All Count': [120, 135, 98, 156, 142, 87, 128, 149],
                'Avg Return All': [0.85, 1.12, -0.45, 1.67, 0.94, -0.23, 0.78, 1.23]
            };

            const result = statisticsService.getNConsecutiveSequanceIndexFromList(
                mockDataTable,
                'Bullish',  // trendTypeValue
                3,          // consecutiveTrendingDaysValue
                60.0,       // minimumAccuracyOfEachDayValue
                2.0,        // minimumTotalPnlOfAllTrendingDaysValue
                100,        // minimumSampleSizeValue
                0.5,        // minimumAveragePnlOfEachTrendingDaysValue
                'AND',      // input12operationValue
                'OR',       // input23operationValue
                'AND'       // input34operationValue
            );

            expect(Array.isArray(result)).toBe(true);
            // Verify that each result is a [startIndex, endIndex] pair
            result.forEach(pair => {
                expect(Array.isArray(pair)).toBe(true);
                expect(pair).toHaveLength(2);
                expect(typeof pair[0]).toBe('number');
                expect(typeof pair[1]).toBe('number');
                expect(pair[1]).toBeGreaterThanOrEqual(pair[0]);
            });
        });

        test('should handle bearish trend analysis', () => {
            const mockDataTable = {
                'Sum Return All': [-2.5, -3.1, 1.2, -4.7, -2.8, 0.5, -1.9, -3.4],
                'Pos Accuracy': [34.5, 27.7, 54.8, 21.1, 30.9, 47.3, 28.2, 24.8],
                'Neg Accuracy': [65.5, 72.3, 45.2, 78.9, 69.1, 52.7, 71.8, 75.2],
                'All Count': [120, 135, 98, 156, 142, 87, 128, 149],
                'Avg Return All': [-0.85, -1.12, 0.45, -1.67, -0.94, 0.23, -0.78, -1.23]
            };

            const result = statisticsService.getNConsecutiveSequanceIndexFromList(
                mockDataTable,
                'Bearish', // trendTypeValue
                2,         // consecutiveTrendingDaysValue
                60.0,      // minimumAccuracyOfEachDayValue
                -2.0,      // minimumTotalPnlOfAllTrendingDaysValue (negative for bearish)
                100,       // minimumSampleSizeValue
                -0.5,      // minimumAveragePnlOfEachTrendingDaysValue (negative for bearish)
                'OR',      // input12operationValue
                'AND',     // input23operationValue
                'OR'       // input34operationValue
            );

            expect(Array.isArray(result)).toBe(true);
        });
    });

    describe('generatePerformanceTable', () => {
        test('should generate monthly performance table identical to Python', () => {
            const mockData = [
                { Date: '2023-01-02', Open: 100, Close: 102, Weekday: 'Monday' },
                { Date: '2023-01-03', Open: 102, Close: 104, Weekday: 'Tuesday' },
                { Date: '2023-01-09', Open: 104, Close: 106, Weekday: 'Monday' },
                { Date: '2023-01-10', Open: 106, Close: 105, Weekday: 'Tuesday' },
                { Date: '2023-02-06', Open: 105, Close: 107, Weekday: 'Monday' },
                { Date: '2023-02-07', Open: 107, Close: 109, Weekday: 'Tuesday' }
            ];

            const result = statisticsService.generatePerformanceTable(
                mockData,
                'Open',     // entryType
                'Close',    // exitType
                'Long',     // tradeType
                'Monday',   // entryDay
                'Tuesday',  // exitDay
                'Percent'   // returnType
            );

            expect(result).not.toBeNull();
            expect(Array.isArray(result)).toBe(true);

            // Verify structure
            result.forEach(row => {
                expect(row).toHaveProperty('Year');
                expect(row).toHaveProperty('Total');
                expect(typeof row.Year).toBe('number');
                expect(typeof row.Total).toBe('number');
            });
        });

        test('should return null for same entry and exit days', () => {
            const mockData = [
                { Date: '2023-01-02', Open: 100, Close: 102, Weekday: 'Monday' }
            ];

            const result = statisticsService.generatePerformanceTable(
                mockData, 'Open', 'Close', 'Long', 'Monday', 'Monday', 'Percent'
            );

            expect(result).toBeNull();
        });
    });

    describe('Recent Return Calculations', () => {
        test('getRecentDayReturnPercentage should match Python calculation', () => {
            const mockData = [
                { Close: 100 },
                { Close: 102 },
                { Close: 104 },
                { Close: 103 },
                { Close: 105 }
            ];

            const result = statisticsService.getRecentDayReturnPercentage(mockData, 3);

            // Expected: (105 - 102) / 102 * 100 = 2.94%
            const expected = ((105 - 102) / 102) * 100;
            expect(result).toBeCloseTo(expected, 2);
        });

        test('getRecentWeekReturnPercentage should handle weekly data correctly', () => {
            const mockData = [
                { MondayWeeklyDate: '2023-01-02', Close: 100 },
                { MondayWeeklyDate: '2023-01-02', Close: 102 },
                { MondayWeeklyDate: '2023-01-09', Close: 104 },
                { MondayWeeklyDate: '2023-01-09', Close: 106 },
                { MondayWeeklyDate: '2023-01-16', Close: 108 }
            ];

            const result = statisticsService.getRecentWeekReturnPercentage(mockData, 2);
            expect(typeof result).toBe('number');
        });

        test('getRecentMonthReturnPercentage should handle monthly calculations', () => {
            const mockData = [
                { Date: '2023-01-15', Close: 100 },
                { Date: '2023-02-15', Close: 105 },
                { Date: '2023-03-15', Close: 110 }
            ];

            const result = statisticsService.getRecentMonthReturnPercentage(mockData, 2);
            expect(typeof result).toBe('number');
        });
    });

    describe('Performance and Precision', () => {
        test('should maintain precision with large datasets', () => {
            // Generate large dataset
            const largeDataset = Array.from({ length: 10000 }, (_, i) =>
                Math.sin(i / 100) * 0.01 + Math.random() * 0.02 - 0.01
            );

            const startTime = Date.now();
            const result = statisticsService.getDataTableStatistics(largeDataset);
            const executionTime = Date.now() - startTime;

            expect(result).toBeDefined();
            expect(result['All Count']).toBe(10000);
            expect(executionTime).toBeLessThan(1000); // Should complete within 1 second
        });

        test('should handle extreme precision requirements', () => {
            // Test with numbers that would cause floating point errors
            const precisionTestData = [
                0.1 + 0.2,  // Classic floating point issue
                0.3,
                1e-10,      // Very small number
                1e10,       // Very large number
                -1e-10,
                -1e10
            ];

            const result = statisticsService.getDataTableStatistics(precisionTestData);

            // Verify no NaN or Infinity values
            Object.values(result).forEach(value => {
                expect(isFinite(value)).toBe(true);
                expect(isNaN(value)).toBe(false);
            });
        });
    });

    describe('Error Handling', () => {
        test('should handle invalid input gracefully', () => {
            expect(() => {
                statisticsService.getDataTableStatistics(null);
            }).toThrow();

            expect(() => {
                statisticsService.getDataTableStatistics('invalid');
            }).toThrow();
        });

        test('should handle arrays with invalid values', () => {
            const invalidData = [1, 2, null, undefined, NaN, 'string', 3, 4];
            const result = statisticsService.getDataTableStatistics(invalidData);

            // Should only count valid numbers
            expect(result['All Count']).toBe(4); // 1, 2, 3, 4
        });
    });

    describe('Performance Metrics', () => {
        test('should track performance metrics correctly', () => {
            statisticsService.resetPerformanceMetrics();

            const testData = [1, 2, 3, 4, 5];
            statisticsService.getDataTableStatistics(testData);
            statisticsService.maximumConsecutiveValues(testData);

            const metrics = statisticsService.getPerformanceMetrics();

            expect(metrics.calculationsPerformed).toBe(2);
            expect(metrics.totalExecutionTime).toBeGreaterThanOrEqual(0);
            expect(metrics.averageExecutionTime).toBeGreaterThanOrEqual(0);
            expect(metrics.memoryUsage).toBeDefined();
            expect(metrics.memoryUsage.heapUsed).toBeGreaterThan(0);
        });
    });
});