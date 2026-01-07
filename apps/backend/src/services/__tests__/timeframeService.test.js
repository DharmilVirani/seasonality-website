/**
 * TimeframeService Unit Tests
 * 
 * Comprehensive test suite validating JavaScript implementation against Python pandas logic
 * Tests all timeframe generation methods with sample data validation
 */

const TimeframeService = require('../timeframeService');
const { addDays, subDays, format } = require('date-fns');

// Mock Prisma client
jest.mock('@prisma/client', () => ({
    PrismaClient: jest.fn().mockImplementation(() => ({
        $transaction: jest.fn(),
        $disconnect: jest.fn(),
        mondayWeeklySeasonalityData: {
            createMany: jest.fn()
        },
        expiryWeeklySeasonalityData: {
            createMany: jest.fn()
        }
    }))
}));

describe('TimeframeService', () => {
    let timeframeService;
    let sampleDailyData;

    beforeEach(() => {
        timeframeService = new TimeframeService();

        // Create sample daily data for testing (2 weeks of data)
        sampleDailyData = [
            // Week 1: Monday to Friday
            { date: '2024-01-01', open: 100, high: 105, low: 98, close: 103, volume: 1000, openInterest: 500 }, // Monday
            { date: '2024-01-02', open: 103, high: 108, low: 102, close: 106, volume: 1200, openInterest: 520 }, // Tuesday  
            { date: '2024-01-03', open: 106, high: 110, low: 104, close: 108, volume: 1100, openInterest: 540 }, // Wednesday
            { date: '2024-01-04', open: 108, high: 112, low: 107, close: 110, volume: 1300, openInterest: 560 }, // Thursday
            { date: '2024-01-05', open: 110, high: 115, low: 109, close: 113, volume: 1400, openInterest: 580 }, // Friday

            // Week 2: Monday to Friday  
            { date: '2024-01-08', open: 113, high: 118, low: 111, close: 116, volume: 1500, openInterest: 600 }, // Monday
            { date: '2024-01-09', open: 116, high: 120, low: 114, close: 118, volume: 1600, openInterest: 620 }, // Tuesday
            { date: '2024-01-10', open: 118, high: 122, low: 116, close: 120, volume: 1700, openInterest: 640 }, // Wednesday
            { date: '2024-01-11', open: 120, high: 125, low: 118, close: 123, volume: 1800, openInterest: 660 }, // Thursday
            { date: '2024-01-12', open: 123, high: 128, low: 121, close: 126, volume: 1900, openInterest: 680 }, // Friday
        ];
    });

    afterEach(async () => {
        await timeframeService.cleanup();
    });

    describe('generateMondayWeeklyData', () => {
        test('should generate correct Monday weekly aggregation', async () => {
            const result = await timeframeService.generateMondayWeeklyData(sampleDailyData, 1);

            expect(result).toHaveLength(2); // 2 weeks of data

            // Test first week aggregation (Jan 1-5, 2024)
            const week1 = result[0];
            expect(week1.open).toBe(100); // First open of week
            expect(week1.high).toBe(115); // Max high of week  
            expect(week1.low).toBe(98);   // Min low of week
            expect(week1.close).toBe(113); // Last close of week
            expect(week1.volume).toBe(6000); // Sum of volumes (1000+1200+1100+1300+1400)
            expect(week1.openInterest).toBe(580); // Last open interest
            expect(week1.weekday).toBe('Monday');

            // Test second week aggregation (Jan 8-12, 2024)
            const week2 = result[1];
            expect(week2.open).toBe(113); // First open of week
            expect(week2.high).toBe(128); // Max high of week
            expect(week2.low).toBe(111);  // Min low of week  
            expect(week2.close).toBe(126); // Last close of week
            expect(week2.volume).toBe(8500); // Sum of volumes (1500+1600+1700+1800+1900)
            expect(week2.openInterest).toBe(680); // Last open interest
        });

        test('should calculate week numbers correctly', async () => {
            const result = await timeframeService.generateMondayWeeklyData(sampleDailyData, 1);

            // Both weeks are in January 2024, so monthly week numbers should be 1, 2
            expect(result[0].weekNumberMonthly).toBe(1);
            expect(result[1].weekNumberMonthly).toBe(2);

            // Both weeks are in 2024, so yearly week numbers should be 1, 2
            expect(result[0].weekNumberYearly).toBe(1);
            expect(result[1].weekNumberYearly).toBe(2);

            // Test even/odd flags
            expect(result[0].evenWeekNumberMonthly).toBe(false); // Week 1 is odd
            expect(result[1].evenWeekNumberMonthly).toBe(true);  // Week 2 is even
        });

        test('should calculate returns correctly', async () => {
            const result = await timeframeService.generateMondayWeeklyData(sampleDailyData, 1);

            // First week has no previous data
            expect(result[0].returnPoints).toBeNull();
            expect(result[0].returnPercentage).toBeNull();
            expect(result[0].positiveWeek).toBeNull();

            // Second week returns: 126 - 113 = 13 points, (13/113)*100 = 11.50%
            expect(result[1].returnPoints).toBe(13);
            expect(result[1].returnPercentage).toBe(11.5);
            expect(result[1].positiveWeek).toBe(true);
        });

        test('should handle empty data gracefully', async () => {
            await expect(timeframeService.generateMondayWeeklyData([], 1))
                .rejects.toThrow('Daily data is required for Monday weekly generation');
        });

        test('should handle null data gracefully', async () => {
            await expect(timeframeService.generateMondayWeeklyData(null, 1))
                .rejects.toThrow('Daily data is required for Monday weekly generation');
        });
    });

    describe('generateExpiryWeeklyData', () => {
        test('should generate correct expiry weekly aggregation', async () => {
            const result = await timeframeService.generateExpiryWeeklyData(sampleDailyData, 1);

            expect(result).toHaveLength(2); // 2 weeks of data

            // Test aggregation matches Monday weekly (same underlying data)
            const week1 = result[0];
            expect(week1.open).toBe(100);
            expect(week1.high).toBe(115);
            expect(week1.low).toBe(98);
            expect(week1.close).toBe(113);
            expect(week1.volume).toBe(6000);
            expect(week1.openInterest).toBe(580);

            // Date should be Friday (expiry date)
            expect(week1.weekday).toBe('Friday');
            expect(week1.startDate).toBeDefined(); // Should have start date
        });

        test('should handle Thursday-ending week logic', async () => {
            // Test with data that includes Thursday as week end
            const thursdayData = [
                { date: '2024-01-01', open: 100, high: 105, low: 98, close: 103, volume: 1000, openInterest: 500 }, // Monday
                { date: '2024-01-02', open: 103, high: 108, low: 102, close: 106, volume: 1200, openInterest: 520 }, // Tuesday
                { date: '2024-01-03', open: 106, high: 110, low: 104, close: 108, volume: 1100, openInterest: 540 }, // Wednesday
                { date: '2024-01-04', open: 108, high: 112, low: 107, close: 110, volume: 1300, openInterest: 560 }, // Thursday
            ];

            const result = await timeframeService.generateExpiryWeeklyData(thursdayData, 1);
            expect(result).toHaveLength(1);
            expect(result[0].close).toBe(110); // Thursday close
        });
    });

    describe('generateMonthlyData', () => {
        test('should generate correct monthly aggregation', async () => {
            const result = await timeframeService.generateMonthlyData(sampleDailyData, 1);

            expect(result).toHaveLength(1); // All data is in January 2024

            const month1 = result[0];
            expect(month1.open).toBe(100); // First open of month
            expect(month1.high).toBe(128); // Max high of month
            expect(month1.low).toBe(98);   // Min low of month
            expect(month1.close).toBe(126); // Last close of month
            expect(month1.volume).toBe(14500); // Sum of all volumes
            expect(month1.openInterest).toBe(680); // Last open interest

            // Date should be first day of month
            expect(format(new Date(month1.date), 'yyyy-MM-dd')).toBe('2024-01-01');
        });

        test('should calculate monthly fields correctly', async () => {
            const result = await timeframeService.generateMonthlyData(sampleDailyData, 1);

            const month1 = result[0];
            expect(month1.evenMonth).toBe(false); // January (1) is odd
            expect(month1.evenYear).toBe(true);   // 2024 is even

            // First month has no returns
            expect(month1.returnPoints).toBeNull();
            expect(month1.returnPercentage).toBeNull();
            expect(month1.positiveMonth).toBeNull();
        });
    });

    describe('generateYearlyData', () => {
        test('should generate correct yearly aggregation', async () => {
            const result = await timeframeService.generateYearlyData(sampleDailyData, 1);

            expect(result).toHaveLength(1); // All data is in 2024

            const year1 = result[0];
            expect(year1.open).toBe(100); // First open of year
            expect(year1.high).toBe(128); // Max high of year
            expect(year1.low).toBe(98);   // Min low of year
            expect(year1.close).toBe(126); // Last close of year
            expect(year1.volume).toBe(14500); // Sum of all volumes
            expect(year1.openInterest).toBe(680); // Last open interest

            // Date should be January 1st
            expect(format(new Date(year1.date), 'yyyy-MM-dd')).toBe('2024-01-01');
        });

        test('should calculate yearly fields correctly', async () => {
            const result = await timeframeService.generateYearlyData(sampleDailyData, 1);

            const year1 = result[0];
            expect(year1.evenYear).toBe(true); // 2024 is even

            // First year has no returns
            expect(year1.returnPoints).toBeNull();
            expect(year1.returnPercentage).toBeNull();
            expect(year1.positiveYear).toBeNull();
        });
    });

    describe('calculateReturnPercentages', () => {
        test('should calculate returns correctly for daily timeframe', () => {
            const testData = [
                { close: 100 },
                { close: 105 },
                { close: 102 }
            ];

            const result = timeframeService.calculateReturnPercentages(testData, 'daily');

            // First record
            expect(result[0].returnPoints).toBeNull();
            expect(result[0].returnPercentage).toBeNull();

            // Second record: (105-100)/100 * 100 = 5%
            expect(result[1].returnPoints).toBe(5);
            expect(result[1].returnPercentage).toBe(5);
            expect(result[1].positive).toBe(true);

            // Third record: (102-105)/105 * 100 = -2.86%
            expect(result[2].returnPoints).toBe(-3);
            expect(result[2].returnPercentage).toBe(-2.86);
            expect(result[2].positive).toBe(false);
        });

        test('should handle zero division gracefully', () => {
            const testData = [
                { close: 0 },
                { close: 100 }
            ];

            const result = timeframeService.calculateReturnPercentages(testData, 'daily');

            expect(result[1].returnPoints).toBe(100);
            expect(result[1].returnPercentage).toBeNull(); // Division by zero
        });
    });

    describe('linkCrossTimeframeData', () => {
        test('should link timeframe data correctly', async () => {
            // Generate all timeframes first
            const mondayWeekly = await timeframeService.generateMondayWeeklyData(sampleDailyData, 1);
            const expiryWeekly = await timeframeService.generateExpiryWeeklyData(sampleDailyData, 1);
            const monthly = await timeframeService.generateMonthlyData(sampleDailyData, 1);
            const yearly = await timeframeService.generateYearlyData(sampleDailyData, 1);

            const result = await timeframeService.linkCrossTimeframeData(
                sampleDailyData,
                { monday: mondayWeekly, expiry: expiryWeekly },
                monthly,
                yearly
            );

            expect(result.daily).toHaveLength(10);
            expect(result.weekly.monday).toHaveLength(2);
            expect(result.weekly.expiry).toHaveLength(2);
            expect(result.monthly).toHaveLength(1);
            expect(result.yearly).toHaveLength(1);

            // Test that daily records have cross-timeframe references
            const firstDaily = result.daily[0];
            expect(firstDaily.mondayWeeklyDate).toBeDefined();
            expect(firstDaily.expiryWeeklyDate).toBeDefined();
        });
    });

    describe('processTickerTimeframes', () => {
        test('should process complete timeframe generation', async () => {
            const result = await timeframeService.processTickerTimeframes(1, sampleDailyData);

            expect(result.daily).toHaveLength(10);
            expect(result.weekly.monday).toHaveLength(2);
            expect(result.weekly.expiry).toHaveLength(2);
            expect(result.monthly).toHaveLength(1);
            expect(result.yearly).toHaveLength(1);
        });

        test('should handle processing errors gracefully', async () => {
            // Test with invalid data
            await expect(timeframeService.processTickerTimeframes(1, null))
                .rejects.toThrow();
        });
    });

    describe('validateAggregation', () => {
        test('should validate correct aggregation', () => {
            const original = [
                { date: '2024-01-01', open: 100, high: 105, low: 98, close: 103, volume: 1000 },
                { date: '2024-01-02', open: 103, high: 108, low: 102, close: 106, volume: 1200 }
            ];

            const aggregated = {
                open: 100,
                high: 108,
                low: 98,
                close: 106,
                volume: 2200
            };

            const validation = timeframeService.validateAggregation(original, aggregated, 'weekly');

            expect(validation.isValid).toBe(true);
            expect(validation.errors).toHaveLength(0);
            expect(validation.metrics.recordCount).toBe(2);
        });

        test('should detect aggregation errors', () => {
            const original = [
                { date: '2024-01-01', open: 100, high: 105, low: 98, close: 103, volume: 1000 }
            ];

            const aggregated = {
                open: 99, // Wrong open
                high: 105,
                low: 98,
                close: 103,
                volume: 1000
            };

            const validation = timeframeService.validateAggregation(original, aggregated, 'weekly');

            expect(validation.isValid).toBe(false);
            expect(validation.errors).toContain('Open mismatch: expected 100, got 99');
        });
    });

    describe('Performance Tests', () => {
        test('should process large dataset efficiently', async () => {
            // Generate 1000+ daily records
            const largeDataset = [];
            const startDate = new Date('2020-01-01');

            for (let i = 0; i < 1000; i++) {
                const date = addDays(startDate, i);
                largeDataset.push({
                    date: format(date, 'yyyy-MM-dd'),
                    open: 100 + Math.random() * 10,
                    high: 105 + Math.random() * 10,
                    low: 95 + Math.random() * 10,
                    close: 100 + Math.random() * 10,
                    volume: 1000 + Math.random() * 500,
                    openInterest: 500 + Math.random() * 100
                });
            }

            const startTime = Date.now();
            const result = await timeframeService.processTickerTimeframes(1, largeDataset);
            const endTime = Date.now();

            const processingTime = endTime - startTime;

            // Should process 1000+ records in under 2 seconds (2000ms)
            expect(processingTime).toBeLessThan(2000);
            expect(result.daily).toHaveLength(1000);

            console.log(`Processed ${largeDataset.length} records in ${processingTime}ms`);
        });
    });

    describe('Edge Cases', () => {
        test('should handle single day data', async () => {
            const singleDay = [sampleDailyData[0]];

            const result = await timeframeService.processTickerTimeframes(1, singleDay);

            expect(result.daily).toHaveLength(1);
            expect(result.weekly.monday).toHaveLength(1);
            expect(result.weekly.expiry).toHaveLength(1);
            expect(result.monthly).toHaveLength(1);
            expect(result.yearly).toHaveLength(1);
        });

        test('should handle missing volume/openInterest', async () => {
            const dataWithMissing = [
                { date: '2024-01-01', open: 100, high: 105, low: 98, close: 103 }, // Missing volume/openInterest
                { date: '2024-01-02', open: 103, high: 108, low: 102, close: 106, volume: null, openInterest: null }
            ];

            const result = await timeframeService.generateMondayWeeklyData(dataWithMissing, 1);

            expect(result[0].volume).toBe(0); // Should default to 0
            expect(result[0].openInterest).toBe(0); // Should default to 0
        });

        test('should handle weekend gaps in data', async () => {
            const weekdayOnlyData = [
                { date: '2024-01-01', open: 100, high: 105, low: 98, close: 103, volume: 1000, openInterest: 500 }, // Monday
                { date: '2024-01-02', open: 103, high: 108, low: 102, close: 106, volume: 1200, openInterest: 520 }, // Tuesday
                // Skip Wednesday, Thursday, Friday
                { date: '2024-01-08', open: 106, high: 110, low: 104, close: 108, volume: 1100, openInterest: 540 }, // Next Monday
            ];

            const result = await timeframeService.generateMondayWeeklyData(weekdayOnlyData, 1);

            // Should still group correctly by weeks
            expect(result).toHaveLength(2);
        });
    });
});