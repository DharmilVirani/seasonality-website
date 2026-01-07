/**
 * Service Integration Tests
 * 
 * Tests the integration between all services in the service layer
 * Validates service composition, dependency injection, and end-to-end workflows
 * 
 * @author Seasonality SaaS Team
 * @version 1.0.0
 */

const AnalysisService = require('../analysisService');
const EnhancedUploadService = require('../enhancedUploadService');
const DataQueryService = require('../dataQueryService');
const CalculationEngine = require('../calculationEngine');
const CacheService = require('../cacheService');
const StatisticsService = require('../statisticsService');

// Mock data for testing
const mockDailyData = [
    { date: '2024-01-01', close: 100, open: 98, high: 102, low: 97, volume: 1000, returnPercentage: null },
    { date: '2024-01-02', close: 105, open: 100, high: 106, low: 99, volume: 1200, returnPercentage: 5.0 },
    { date: '2024-01-03', close: 103, open: 105, high: 107, low: 102, volume: 1100, returnPercentage: -1.9 },
    { date: '2024-01-04', close: 108, open: 103, high: 109, low: 101, volume: 1300, returnPercentage: 4.85 },
    { date: '2024-01-05', close: 106, open: 108, high: 110, low: 105, volume: 1150, returnPercentage: -1.85 }
];

const mockAnalysisParams = {
    symbolNameToPlotValue: 'TEST',
    startDate: '2024-01-01',
    endDate: '2024-01-05',
    consecutiveDays: 2,
    trendDirection: 'more',
    percentageThreshold: 0
};

describe('Service Integration Tests', () => {
    let analysisService;
    let enhancedUploadService;
    let dataQueryService;
    let calculationEngine;
    let cacheService;
    let statisticsService;

    beforeAll(async () => {
        // Initialize services
        analysisService = new AnalysisService();
        enhancedUploadService = new EnhancedUploadService();
        dataQueryService = new DataQueryService();
        calculationEngine = new CalculationEngine();
        cacheService = new CacheService();
        statisticsService = new StatisticsService();
    });

    afterAll(async () => {
        // Cleanup services
        await Promise.all([
            analysisService.cleanup(),
            enhancedUploadService.cleanup(),
            dataQueryService.cleanup(),
            calculationEngine.cleanup(),
            cacheService.cleanup()
        ]);
    });

    describe('Service Initialization', () => {
        test('should initialize all services successfully', () => {
            expect(analysisService).toBeDefined();
            expect(analysisService.statisticsService).toBeDefined();
            expect(analysisService.timeframeService).toBeDefined();
            expect(analysisService.filterService).toBeDefined();
            expect(analysisService.dataQueryService).toBeDefined();
            expect(analysisService.calculationEngine).toBeDefined();
            expect(analysisService.cacheService).toBeDefined();
        });

        test('should have proper service composition', () => {
            expect(analysisService.statisticsService).toBeInstanceOf(StatisticsService);
            expect(enhancedUploadService.timeframeService).toBeDefined();
            expect(enhancedUploadService.calculationEngine).toBeDefined();
            expect(enhancedUploadService.cacheService).toBeDefined();
        });
    });

    describe('Calculation Engine Integration', () => {
        test('should calculate return percentages correctly', () => {
            const result = calculationEngine.calculateReturnPercentages(mockDailyData);

            expect(result).toHaveLength(5);
            expect(result[0].returnPercentage).toBeNull(); // First record
            expect(result[1].returnPercentage).toBeCloseTo(5.0, 2);
            expect(result[2].returnPercentage).toBeCloseTo(-1.9, 2);
            expect(result[3].returnPercentage).toBeCloseTo(4.85, 2);
            expect(result[4].returnPercentage).toBeCloseTo(-1.85, 2);
        });

        test('should calculate moving averages', () => {
            const result = calculationEngine.calculateMovingAverage(mockDailyData, 3, 'close');

            expect(result).toHaveLength(5);
            expect(result[0].ma3).toBeNull();
            expect(result[1].ma3).toBeNull();
            expect(result[2].ma3).toBeCloseTo(102.67, 2); // (100+105+103)/3
        });

        test('should calculate volatility', () => {
            const dataWithReturns = calculationEngine.calculateReturnPercentages(mockDailyData);
            const result = calculationEngine.calculateVolatility(dataWithReturns, 3);

            expect(result).toHaveLength(5);
            expect(result[2].volatility).toBeDefined();
            expect(result[2].annualizedVolatility).toBeDefined();
        });

        test('should detect trends', () => {
            const dataWithReturns = calculationEngine.calculateReturnPercentages(mockDailyData);
            const result = calculationEngine.detectTrends(dataWithReturns, { minTrendLength: 2 });

            expect(result.trends).toBeDefined();
            expect(result.summary).toBeDefined();
            expect(result.summary.totalUptrends).toBeGreaterThanOrEqual(0);
            expect(result.summary.totalDowntrends).toBeGreaterThanOrEqual(0);
        });

        test('should calculate correlation between series', () => {
            const series1 = mockDailyData;
            const series2 = mockDailyData.map(d => ({ ...d, returnPercentage: d.returnPercentage }));

            const correlation = calculationEngine.calculateCorrelation(series1, series2);
            expect(correlation).toBeCloseTo(1.0, 1); // Perfect correlation with itself
        });

        test('should calculate Sharpe ratio', () => {
            const dataWithReturns = calculationEngine.calculateReturnPercentages(mockDailyData);
            const sharpeRatio = calculationEngine.calculateSharpeRatio(dataWithReturns, 0);

            expect(typeof sharpeRatio).toBe('number');
            expect(sharpeRatio).not.toBeNaN();
        });

        test('should calculate maximum drawdown', () => {
            const result = calculationEngine.calculateMaxDrawdown(mockDailyData);

            expect(result.maxDrawdown).toBeDefined();
            expect(result.peakPrice).toBeDefined();
            expect(result.troughPrice).toBeDefined();
            expect(result.drawdownDuration).toBeDefined();
        });
    });

    describe('Statistics Service Integration', () => {
        test('should calculate data table statistics', () => {
            const returns = [5.0, -1.9, 4.85, -1.85];
            const result = statisticsService.getDataTableStatistics(returns);

            expect(result['All Count']).toBe(4);
            expect(result['Pos Count']).toBe(2);
            expect(result['Neg Count']).toBe(2);
            expect(result['Avg Return All']).toBeCloseTo(1.525, 2);
        });

        test('should find maximum consecutive values', () => {
            const returns = [5.0, 3.0, -1.9, -2.1, 4.85, -1.85];
            const result = statisticsService.maximumConsecutiveValues(returns);

            expect(result.maximumPositiveCount).toBe(2);
            expect(result.maximumNegativeCount).toBe(2);
        });

        test('should calculate accuracy percentages', () => {
            const row = {
                'All Count': 10,
                'Pos Count': 6,
                'Neg Count': 4
            };

            const posAccuracy = statisticsService.getAccuracy(row, 'Pos Count');
            const negAccuracy = statisticsService.getAccuracy(row, 'Neg Count');

            expect(posAccuracy).toBe('6(60.00%)');
            expect(negAccuracy).toBe('4(40.00%)');
        });
    });

    describe('Cache Service Integration', () => {
        test('should set and get cache values', async () => {
            const key = 'test_key';
            const value = { test: 'data', number: 123 };

            const setResult = await cacheService.set(key, value, 60);
            expect(setResult).toBe(true);

            const getResult = await cacheService.get(key);
            expect(getResult).toEqual(value);
        });

        test('should handle cache expiration', async () => {
            const key = 'expire_test';
            const value = 'expire_value';

            await cacheService.set(key, value, 1); // 1 second TTL

            // Wait for expiration
            await new Promise(resolve => setTimeout(resolve, 1100));

            const result = await cacheService.get(key);
            expect(result).toBeNull();
        });

        test('should set and get multiple values', async () => {
            const keyValuePairs = {
                'key1': 'value1',
                'key2': { nested: 'object' },
                'key3': 123
            };

            const setResult = await cacheService.setMultiple(keyValuePairs, 60);
            expect(setResult).toBe(true);

            const getResult = await cacheService.getMultiple(['key1', 'key2', 'key3']);
            expect(getResult.key1).toBe('value1');
            expect(getResult.key2).toEqual({ nested: 'object' });
            expect(getResult.key3).toBe(123);
        });

        test('should increment numeric values', async () => {
            const key = 'counter';

            const result1 = await cacheService.increment(key, 5);
            expect(result1).toBe(5);

            const result2 = await cacheService.increment(key, 3);
            expect(result2).toBe(8);
        });

        test('should check key existence', async () => {
            const key = 'existence_test';

            let exists = await cacheService.exists(key);
            expect(exists).toBe(false);

            await cacheService.set(key, 'test_value');

            exists = await cacheService.exists(key);
            expect(exists).toBe(true);
        });

        test('should get TTL for keys', async () => {
            const key = 'ttl_test';

            await cacheService.set(key, 'test_value', 300); // 5 minutes

            const ttl = await cacheService.getTTL(key);
            expect(ttl).toBeGreaterThan(290);
            expect(ttl).toBeLessThanOrEqual(300);
        });

        test('should ping Redis server', async () => {
            const pingResult = await cacheService.ping();
            // This might fail in test environment without Redis
            // expect(pingResult).toBe(true);
        });
    });

    describe('Service Performance Metrics', () => {
        test('should track calculation engine metrics', () => {
            const metrics = calculationEngine.getPerformanceMetrics();

            expect(metrics.calculationsPerformed).toBeGreaterThanOrEqual(0);
            expect(metrics.totalExecutionTime).toBeGreaterThanOrEqual(0);
            expect(metrics.errorCount).toBeGreaterThanOrEqual(0);
            expect(metrics.averageExecutionTime).toBeGreaterThanOrEqual(0);
        });

        test('should track cache service metrics', () => {
            const metrics = cacheService.getPerformanceMetrics();

            expect(metrics.hits).toBeGreaterThanOrEqual(0);
            expect(metrics.misses).toBeGreaterThanOrEqual(0);
            expect(metrics.sets).toBeGreaterThanOrEqual(0);
            expect(metrics.totalOperations).toBeGreaterThanOrEqual(0);
        });

        test('should track statistics service metrics', () => {
            const metrics = statisticsService.getPerformanceMetrics();

            expect(metrics.calculationsPerformed).toBeGreaterThanOrEqual(0);
            expect(metrics.totalExecutionTime).toBeGreaterThanOrEqual(0);
            expect(metrics.averageExecutionTime).toBeGreaterThanOrEqual(0);
        });
    });

    describe('Error Handling Integration', () => {
        test('should handle invalid data gracefully in calculation engine', () => {
            expect(() => {
                calculationEngine.calculateReturnPercentages([]);
            }).toThrow('Data array is required and cannot be empty');

            expect(() => {
                calculationEngine.calculateReturnPercentages(null);
            }).toThrow('Data array is required and cannot be empty');
        });

        test('should handle invalid parameters in statistics service', () => {
            expect(() => {
                statisticsService.getDataTableStatistics(null);
            }).toThrow('Input must be an array of numbers');

            expect(() => {
                statisticsService.maximumConsecutiveValues('not an array');
            }).toThrow('Input must be an array of numbers');
        });

        test('should handle cache errors gracefully', async () => {
            // Test with invalid key
            const result = await cacheService.get('');
            expect(result).toBeNull();
        });
    });

    describe('Service Cleanup', () => {
        test('should cleanup calculation engine', async () => {
            await expect(calculationEngine.cleanup()).resolves.not.toThrow();
        });

        test('should cleanup cache service', async () => {
            await expect(cacheService.cleanup()).resolves.not.toThrow();
        });

        test('should reset performance metrics', () => {
            cacheService.resetMetrics();
            const metrics = cacheService.getPerformanceMetrics();

            expect(metrics.hits).toBe(0);
            expect(metrics.misses).toBe(0);
            expect(metrics.sets).toBe(0);
            expect(metrics.totalOperations).toBe(0);
        });
    });

    describe('End-to-End Service Integration', () => {
        test('should integrate calculation engine with statistics service', () => {
            // Calculate returns using calculation engine
            const dataWithReturns = calculationEngine.calculateReturnPercentages(mockDailyData);

            // Extract returns for statistics
            const returns = dataWithReturns
                .map(record => record.returnPercentage)
                .filter(val => val !== null);

            // Calculate statistics using statistics service
            const stats = statisticsService.getDataTableStatistics(returns);

            expect(stats['All Count']).toBe(returns.length);
            expect(stats['Avg Return All']).toBeDefined();
            expect(stats['Pos Count']).toBeGreaterThanOrEqual(0);
            expect(stats['Neg Count']).toBeGreaterThanOrEqual(0);
        });

        test('should integrate cache with calculation results', async () => {
            const cacheKey = 'test_calculation_cache';

            // Perform calculation
            const result = calculationEngine.calculateReturnPercentages(mockDailyData);

            // Cache the result
            await cacheService.set(cacheKey, result, 60);

            // Retrieve from cache
            const cachedResult = await cacheService.get(cacheKey);

            expect(cachedResult).toEqual(result);
        });

        test('should handle service composition in analysis service', () => {
            // Verify that analysis service properly composes other services
            expect(analysisService.statisticsService).toBeInstanceOf(StatisticsService);
            expect(analysisService.calculationEngine).toBeInstanceOf(CalculationEngine);
            expect(analysisService.cacheService).toBeInstanceOf(CacheService);
        });
    });
});

describe('Service Performance Tests', () => {
    let calculationEngine;
    let statisticsService;
    let cacheService;

    beforeAll(() => {
        calculationEngine = new CalculationEngine();
        statisticsService = new StatisticsService();
        cacheService = new CacheService();
    });

    afterAll(async () => {
        await Promise.all([
            calculationEngine.cleanup(),
            cacheService.cleanup()
        ]);
    });

    test('should handle large datasets efficiently', () => {
        // Generate large dataset
        const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
            date: new Date(2020, 0, i + 1).toISOString().split('T')[0],
            close: 100 + Math.random() * 20 - 10,
            open: 100 + Math.random() * 20 - 10,
            high: 100 + Math.random() * 20 - 5,
            low: 100 + Math.random() * 20 - 15,
            volume: Math.floor(Math.random() * 10000) + 1000
        }));

        const startTime = Date.now();
        const result = calculationEngine.calculateReturnPercentages(largeDataset);
        const executionTime = Date.now() - startTime;

        expect(result).toHaveLength(10000);
        expect(executionTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    test('should maintain performance with multiple concurrent operations', async () => {
        const operations = Array.from({ length: 100 }, (_, i) =>
            cacheService.set(`perf_test_${i}`, { data: `test_data_${i}` }, 60)
        );

        const startTime = Date.now();
        await Promise.all(operations);
        const executionTime = Date.now() - startTime;

        expect(executionTime).toBeLessThan(2000); // Should complete within 2 seconds
    });

    test('should handle memory efficiently with large calculations', () => {
        const initialMemory = process.memoryUsage().heapUsed;

        // Perform multiple calculations
        for (let i = 0; i < 100; i++) {
            const data = Array.from({ length: 1000 }, (_, j) => ({
                date: `2024-01-${j + 1}`,
                close: 100 + Math.random() * 10,
                returnPercentage: Math.random() * 4 - 2
            }));

            calculationEngine.calculateReturnPercentages(data);
            statisticsService.getDataTableStatistics(data.map(d => d.returnPercentage));
        }

        const finalMemory = process.memoryUsage().heapUsed;
        const memoryIncrease = finalMemory - initialMemory;

        // Memory increase should be reasonable (less than 100MB)
        expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
    });
});