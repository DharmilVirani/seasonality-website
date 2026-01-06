/**
 * TimeframeService Usage Examples
 * 
 * Comprehensive examples demonstrating how to use the TimeframeService
 * for multi-timeframe data generation and processing
 */

const TimeframeService = require('../timeframeService');
const { format, addDays } = require('date-fns');

/**
 * Example 1: Basic Timeframe Generation
 * Demonstrates generating all timeframes for a single ticker
 */
async function basicTimeframeGeneration() {
    console.log('=== Example 1: Basic Timeframe Generation ===');

    const timeframeService = new TimeframeService();

    // Sample daily data for AAPL
    const dailyData = [
        { date: '2024-01-01', open: 185.50, high: 187.20, low: 184.80, close: 186.90, volume: 45000000, openInterest: 0 },
        { date: '2024-01-02', open: 186.90, high: 189.30, low: 186.50, close: 188.75, volume: 52000000, openInterest: 0 },
        { date: '2024-01-03', open: 188.75, high: 190.10, low: 187.90, close: 189.45, volume: 48000000, openInterest: 0 },
        { date: '2024-01-04', open: 189.45, high: 191.80, low: 189.20, close: 191.25, volume: 55000000, openInterest: 0 },
        { date: '2024-01-05', open: 191.25, high: 193.50, low: 190.80, close: 192.60, volume: 58000000, openInterest: 0 },
        // Second week
        { date: '2024-01-08', open: 192.60, high: 194.20, low: 191.90, close: 193.80, volume: 46000000, openInterest: 0 },
        { date: '2024-01-09', open: 193.80, high: 195.60, low: 193.40, close: 195.10, volume: 51000000, openInterest: 0 },
        { date: '2024-01-10', open: 195.10, high: 196.80, low: 194.70, close: 196.25, volume: 49000000, openInterest: 0 },
        { date: '2024-01-11', open: 196.25, high: 198.40, low: 195.90, close: 197.85, volume: 53000000, openInterest: 0 },
        { date: '2024-01-12', open: 197.85, high: 199.20, low: 197.30, close: 198.90, volume: 56000000, openInterest: 0 }
    ];

    try {
        // Process all timeframes for ticker ID 1 (AAPL)
        const result = await timeframeService.processTickerTimeframes(1, dailyData);

        console.log('Generated timeframes:');
        console.log(`- Daily records: ${result.daily.length}`);
        console.log(`- Monday Weekly records: ${result.weekly.monday.length}`);
        console.log(`- Expiry Weekly records: ${result.weekly.expiry.length}`);
        console.log(`- Monthly records: ${result.monthly.length}`);
        console.log(`- Yearly records: ${result.yearly.length}`);

        // Display first Monday weekly record
        console.log('\nFirst Monday Weekly Record:');
        console.log(JSON.stringify(result.weekly.monday[0], null, 2));

        return result;
    } catch (error) {
        console.error('Error in basic timeframe generation:', error);
    } finally {
        await timeframeService.cleanup();
    }
}

/**
 * Example 2: Futures Data Processing
 * Demonstrates processing futures data with open interest
 */
async function futuresDataProcessing() {
    console.log('\n=== Example 2: Futures Data Processing ===');

    const timeframeService = new TimeframeService();

    // Sample futures data (ES - S&P 500 E-mini)
    const futuresData = [
        { date: '2024-01-01', open: 4750.25, high: 4765.50, low: 4745.00, close: 4760.75, volume: 2500000, openInterest: 3200000 },
        { date: '2024-01-02', open: 4760.75, high: 4778.25, low: 4755.50, close: 4772.00, volume: 2800000, openInterest: 3250000 },
        { date: '2024-01-03', open: 4772.00, high: 4785.75, low: 4768.25, close: 4780.50, volume: 2600000, openInterest: 3180000 },
        { date: '2024-01-04', open: 4780.50, high: 4795.00, low: 4775.75, close: 4788.25, volume: 2900000, openInterest: 3300000 },
        { date: '2024-01-05', open: 4788.25, high: 4802.50, low: 4785.00, close: 4798.75, volume: 3100000, openInterest: 3350000 }
    ];

    try {
        // Generate expiry weekly data (important for futures)
        const expiryWeekly = await timeframeService.generateExpiryWeeklyData(futuresData, 2);

        console.log('Expiry Weekly Data (Futures):');
        expiryWeekly.forEach((record, index) => {
            console.log(`Week ${index + 1}:`);
            console.log(`  Date: ${format(new Date(record.date), 'yyyy-MM-dd')} (${record.weekday})`);
            console.log(`  OHLC: ${record.open} / ${record.high} / ${record.low} / ${record.close}`);
            console.log(`  Volume: ${record.volume.toLocaleString()}`);
            console.log(`  Open Interest: ${record.openInterest.toLocaleString()}`);
            if (record.returnPercentage !== null) {
                console.log(`  Return: ${record.returnPercentage}%`);
            }
        });

        return expiryWeekly;
    } catch (error) {
        console.error('Error in futures data processing:', error);
    } finally {
        await timeframeService.cleanup();
    }
}

/**
 * Example 3: Batch Processing Multiple Tickers
 * Demonstrates processing multiple tickers simultaneously
 */
async function batchProcessingExample() {
    console.log('\n=== Example 3: Batch Processing Multiple Tickers ===');

    const timeframeService = new TimeframeService();

    // Create sample data for multiple tickers
    const tickerDataMap = new Map();

    // AAPL data
    const aaplData = generateSampleData('2024-01-01', 20, 185.50);
    tickerDataMap.set(1, aaplData);

    // MSFT data
    const msftData = generateSampleData('2024-01-01', 20, 375.25);
    tickerDataMap.set(2, msftData);

    // GOOGL data
    const googlData = generateSampleData('2024-01-01', 20, 142.80);
    tickerDataMap.set(3, googlData);

    try {
        console.log(`Processing ${tickerDataMap.size} tickers...`);

        const startTime = Date.now();
        const results = await timeframeService.processBatchTimeframes(tickerDataMap);
        const endTime = Date.now();

        console.log(`Batch processing completed in ${endTime - startTime}ms`);

        // Display results summary
        for (const [tickerId, timeframeData] of results) {
            console.log(`\nTicker ${tickerId}:`);
            console.log(`  Daily: ${timeframeData.daily.length} records`);
            console.log(`  Monday Weekly: ${timeframeData.weekly.monday.length} records`);
            console.log(`  Expiry Weekly: ${timeframeData.weekly.expiry.length} records`);
            console.log(`  Monthly: ${timeframeData.monthly.length} records`);
            console.log(`  Yearly: ${timeframeData.yearly.length} records`);
        }

        return results;
    } catch (error) {
        console.error('Error in batch processing:', error);
    } finally {
        await timeframeService.cleanup();
    }
}

/**
 * Example 4: Cross-Timeframe Analysis
 * Demonstrates analyzing relationships between timeframes
 */
async function crossTimeframeAnalysis() {
    console.log('\n=== Example 4: Cross-Timeframe Analysis ===');

    const timeframeService = new TimeframeService();

    // Generate 3 months of daily data
    const dailyData = generateSampleData('2024-01-01', 90, 100.00);

    try {
        const result = await timeframeService.processTickerTimeframes(1, dailyData);

        // Analyze weekly vs monthly performance
        console.log('Weekly Performance Analysis:');
        result.weekly.monday.forEach((week, index) => {
            if (week.returnPercentage !== null) {
                console.log(`Week ${index + 1}: ${week.returnPercentage}% (${week.positiveWeek ? 'Positive' : 'Negative'})`);
            }
        });

        console.log('\nMonthly Performance Analysis:');
        result.monthly.forEach((month, index) => {
            if (month.returnPercentage !== null) {
                console.log(`Month ${index + 1}: ${month.returnPercentage}% (${month.positiveMonth ? 'Positive' : 'Negative'})`);
            }
        });

        // Calculate correlation metrics
        const weeklyReturns = result.weekly.monday
            .filter(w => w.returnPercentage !== null)
            .map(w => w.returnPercentage);

        const monthlyReturns = result.monthly
            .filter(m => m.returnPercentage !== null)
            .map(m => m.returnPercentage);

        console.log('\nPerformance Summary:');
        console.log(`Average Weekly Return: ${(weeklyReturns.reduce((a, b) => a + b, 0) / weeklyReturns.length).toFixed(2)}%`);
        console.log(`Average Monthly Return: ${(monthlyReturns.reduce((a, b) => a + b, 0) / monthlyReturns.length).toFixed(2)}%`);

        return result;
    } catch (error) {
        console.error('Error in cross-timeframe analysis:', error);
    } finally {
        await timeframeService.cleanup();
    }
}

/**
 * Example 5: Data Validation and Quality Assurance
 * Demonstrates validation of aggregation results
 */
async function dataValidationExample() {
    console.log('\n=== Example 5: Data Validation and Quality Assurance ===');

    const timeframeService = new TimeframeService();

    // Create test data with known values for validation
    const testData = [
        { date: '2024-01-01', open: 100.00, high: 105.00, low: 98.00, close: 103.00, volume: 1000000, openInterest: 500000 },
        { date: '2024-01-02', open: 103.00, high: 108.00, low: 102.00, close: 106.00, volume: 1200000, openInterest: 520000 },
        { date: '2024-01-03', open: 106.00, high: 110.00, low: 104.00, close: 108.00, volume: 1100000, openInterest: 540000 },
        { date: '2024-01-04', open: 108.00, high: 112.00, low: 107.00, close: 110.00, volume: 1300000, openInterest: 560000 },
        { date: '2024-01-05', open: 110.00, high: 115.00, low: 109.00, close: 113.00, volume: 1400000, openInterest: 580000 }
    ];

    try {
        // Generate weekly data
        const weeklyData = await timeframeService.generateMondayWeeklyData(testData, 1);

        // Validate aggregation manually
        const expectedAggregation = {
            open: 100.00,    // First open
            high: 115.00,    // Max high
            low: 98.00,      // Min low
            close: 113.00,   // Last close
            volume: 6000000, // Sum of volumes
            openInterest: 580000 // Last open interest
        };

        // Use built-in validation
        const validation = timeframeService.validateAggregation(testData, expectedAggregation, 'weekly');

        console.log('Validation Results:');
        console.log(`Valid: ${validation.isValid}`);
        console.log(`Errors: ${validation.errors.length}`);

        if (validation.errors.length > 0) {
            validation.errors.forEach(error => console.log(`  - ${error}`));
        }

        console.log('Metrics:');
        console.log(`  Records processed: ${validation.metrics.recordCount}`);
        console.log(`  Date range: ${validation.metrics.dateRange.start} to ${validation.metrics.dateRange.end}`);
        console.log(`  Price range: ${validation.metrics.priceRange.low} - ${validation.metrics.priceRange.high}`);

        // Performance metrics
        const perfMetrics = timeframeService.getPerformanceMetrics();
        console.log('\nPerformance Metrics:');
        console.log(`Memory usage: ${Math.round(perfMetrics.memoryUsage.heapUsed / 1024 / 1024)}MB`);
        console.log(`Uptime: ${Math.round(perfMetrics.uptime)}s`);

        return { validation, weeklyData };
    } catch (error) {
        console.error('Error in data validation:', error);
    } finally {
        await timeframeService.cleanup();
    }
}

/**
 * Example 6: Database Integration
 * Demonstrates saving timeframe data to database
 */
async function databaseIntegrationExample() {
    console.log('\n=== Example 6: Database Integration ===');

    const timeframeService = new TimeframeService();

    // Generate sample data
    const dailyData = generateSampleData('2024-01-01', 30, 150.00);

    try {
        // Process timeframes
        const timeframeData = await timeframeService.processTickerTimeframes(1, dailyData);

        console.log('Generated timeframe data, preparing to save to database...');

        // Note: This would actually save to database in production
        // For demo purposes, we'll just show the structure
        console.log('Database save structure:');
        console.log(`- MondayWeeklySeasonalityData: ${timeframeData.weekly.monday.length} records`);
        console.log(`- ExpiryWeeklySeasonalityData: ${timeframeData.weekly.expiry.length} records`);

        // Simulate database save (commented out for demo)
        // await timeframeService.saveTimeframeData(1, timeframeData);

        console.log('Database integration example completed (simulation)');

        return timeframeData;
    } catch (error) {
        console.error('Error in database integration:', error);
    } finally {
        await timeframeService.cleanup();
    }
}

/**
 * Helper function to generate sample data
 */
function generateSampleData(startDate, days, startPrice) {
    const data = [];
    let currentPrice = startPrice;
    let currentDate = new Date(startDate);

    for (let i = 0; i < days; i++) {
        // Skip weekends for realistic market data
        if (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
            currentDate = addDays(currentDate, 1);
            continue;
        }

        // Generate realistic OHLCV data
        const volatility = 0.02; // 2% daily volatility
        const change = (Math.random() - 0.5) * volatility * currentPrice;

        const open = currentPrice;
        const close = currentPrice + change;
        const high = Math.max(open, close) + Math.random() * 0.01 * currentPrice;
        const low = Math.min(open, close) - Math.random() * 0.01 * currentPrice;
        const volume = Math.floor(1000000 + Math.random() * 2000000);
        const openInterest = Math.floor(500000 + Math.random() * 1000000);

        data.push({
            date: format(currentDate, 'yyyy-MM-dd'),
            open: Math.round(open * 100) / 100,
            high: Math.round(high * 100) / 100,
            low: Math.round(low * 100) / 100,
            close: Math.round(close * 100) / 100,
            volume,
            openInterest
        });

        currentPrice = close;
        currentDate = addDays(currentDate, 1);
    }

    return data;
}

/**
 * Run all examples
 */
async function runAllExamples() {
    console.log('TimeframeService Usage Examples\n');
    console.log('================================\n');

    try {
        await basicTimeframeGeneration();
        await futuresDataProcessing();
        await batchProcessingExample();
        await crossTimeframeAnalysis();
        await dataValidationExample();
        await databaseIntegrationExample();

        console.log('\n=== All Examples Completed Successfully ===');
    } catch (error) {
        console.error('Error running examples:', error);
    }
}

// Export examples for individual use
module.exports = {
    basicTimeframeGeneration,
    futuresDataProcessing,
    batchProcessingExample,
    crossTimeframeAnalysis,
    dataValidationExample,
    databaseIntegrationExample,
    generateSampleData,
    runAllExamples
};

// Run examples if this file is executed directly
if (require.main === module) {
    runAllExamples();
}