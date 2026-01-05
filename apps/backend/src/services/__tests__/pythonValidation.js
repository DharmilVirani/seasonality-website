/**
 * Python-JavaScript Validation Script
 * 
 * Compares JavaScript StatisticsService results with Python numpy/pandas calculations
 * Uses identical test data to ensure mathematical precision within 0.0001% tolerance
 * 
 * @author Seasonality SaaS Team
 * @version 1.0.0
 */

const StatisticsService = require('../statisticsService');
const fs = require('fs');
const path = require('path');

/**
 * Test data sets that match Python test cases exactly
 */
const TEST_DATASETS = {
    // Basic statistics test
    basicStats: [1.5, -2.3, 4.7, -1.2, 3.8, 0.0, -0.5, 2.1, -3.4, 1.9],

    // Precision edge cases
    precisionTest: [0.1, 0.2, 0.3, -0.1, -0.2, -0.3],

    // Large numbers
    largeNumbers: [1e6, -2e6, 3.5e6, -1.8e6, 2.7e6],

    // Small numbers
    smallNumbers: [1e-6, -2e-6, 3.5e-6, -1.8e-6, 2.7e-6],

    // Consecutive values test
    consecutiveTest: [1, 2, -1, -2, -3, 4, 5, 6, -7, 8, 9],

    // Mixed precision
    mixedPrecision: [0.123456789, -0.987654321, 1.111111111, -2.222222222, 3.333333333]
};

/**
 * Expected results calculated with Python numpy/pandas
 * These serve as the ground truth for validation
 */
const PYTHON_EXPECTED_RESULTS = {
    basicStats: {
        statistics: {
            'All Count': 10,
            'Avg Return All': 0.66,
            'Sum Return All': 6.6,
            'Pos Count': 5,
            'Avg Return Pos': 2.8,
            'Sum Return Pos': 14.0,
            'Neg Count': 4,
            'Avg Return Neg': -1.85,
            'Sum Return Neg': -7.4
        },
        consecutive: {
            maximumPositiveCount: 1,
            maximumNegativeCount: 1
        }
    },

    precisionTest: {
        statistics: {
            'All Count': 6,
            'Avg Return All': 0.0,
            'Sum Return All': 0.0,
            'Pos Count': 3,
            'Avg Return Pos': 0.2,
            'Sum Return Pos': 0.6,
            'Neg Count': 3,
            'Avg Return Neg': -0.2,
            'Sum Return Neg': -0.6
        }
    },

    consecutiveTest: {
        consecutive: {
            maximumPositiveCount: 3, // [4, 5, 6]
            maximumNegativeCount: 3  // [-1, -2, -3]
        }
    }
};

/**
 * Validation tolerance (0.0001% as specified)
 */
const TOLERANCE = 0.000001;

/**
 * Validation results storage
 */
const validationResults = {
    passed: 0,
    failed: 0,
    errors: [],
    details: []
};

/**
 * Compare two numbers with specified tolerance
 */
function compareWithTolerance(actual, expected, tolerance = TOLERANCE) {
    if (expected === 0) {
        return Math.abs(actual) <= tolerance;
    }

    const relativeDifference = Math.abs((actual - expected) / expected);
    return relativeDifference <= tolerance;
}

/**
 * Validate statistics calculation
 */
function validateStatistics(testName, testData, expectedResults) {
    console.log(`\n=== Validating Statistics: ${testName} ===`);

    const statisticsService = new StatisticsService();
    const result = statisticsService.getDataTableStatistics(testData);

    let allPassed = true;
    const details = [];

    Object.entries(expectedResults.statistics).forEach(([key, expected]) => {
        const actual = result[key];
        const passed = compareWithTolerance(actual, expected);

        details.push({
            metric: key,
            expected,
            actual,
            passed,
            difference: Math.abs(actual - expected),
            relativeDifference: expected !== 0 ? Math.abs((actual - expected) / expected) : Math.abs(actual)
        });

        if (passed) {
            console.log(`✓ ${key}: ${actual} (expected: ${expected})`);
        } else {
            console.log(`✗ ${key}: ${actual} (expected: ${expected}) - FAILED`);
            allPassed = false;
        }
    });

    validationResults.details.push({
        test: `Statistics - ${testName}`,
        passed: allPassed,
        details
    });

    if (allPassed) {
        validationResults.passed++;
        console.log(`✓ Statistics validation PASSED for ${testName}`);
    } else {
        validationResults.failed++;
        validationResults.errors.push(`Statistics validation FAILED for ${testName}`);
        console.log(`✗ Statistics validation FAILED for ${testName}`);
    }

    return allPassed;
}

/**
 * Validate consecutive values calculation
 */
function validateConsecutiveValues(testName, testData, expectedResults) {
    console.log(`\n=== Validating Consecutive Values: ${testName} ===`);

    const statisticsService = new StatisticsService();
    const result = statisticsService.maximumConsecutiveValues(testData);

    const expectedPos = expectedResults.consecutive.maximumPositiveCount;
    const expectedNeg = expectedResults.consecutive.maximumNegativeCount;
    const actualPos = result.maximumPositiveCount;
    const actualNeg = result.maximumNegativeCount;

    const positivePassed = actualPos === expectedPos;
    const negativePassed = actualNeg === expectedNeg;
    const allPassed = positivePassed && negativePassed;

    console.log(`Positive consecutive: ${actualPos} (expected: ${expectedPos}) ${positivePassed ? '✓' : '✗'}`);
    console.log(`Negative consecutive: ${actualNeg} (expected: ${expectedNeg}) ${negativePassed ? '✓' : '✗'}`);

    validationResults.details.push({
        test: `Consecutive Values - ${testName}`,
        passed: allPassed,
        details: [
            { metric: 'maximumPositiveCount', expected: expectedPos, actual: actualPos, passed: positivePassed },
            { metric: 'maximumNegativeCount', expected: expectedNeg, actual: actualNeg, passed: negativePassed }
        ]
    });

    if (allPassed) {
        validationResults.passed++;
        console.log(`✓ Consecutive values validation PASSED for ${testName}`);
    } else {
        validationResults.failed++;
        validationResults.errors.push(`Consecutive values validation FAILED for ${testName}`);
        console.log(`✗ Consecutive values validation FAILED for ${testName}`);
    }

    return allPassed;
}

/**
 * Validate trending days calculation with mock data
 */
function validateTrendingDays() {
    console.log(`\n=== Validating Trending Days ===`);

    const mockData = [
        { Date: '2023-01-01', Close: 100, ReturnPercentage: 1.5 },
        { Date: '2023-01-02', Close: 102, ReturnPercentage: 2.0 },
        { Date: '2023-01-03', Close: 104, ReturnPercentage: 1.96 },
        { Date: '2023-01-04', Close: 103, ReturnPercentage: -0.96 },
        { Date: '2023-01-05', Close: 105, ReturnPercentage: 1.94 }
    ];

    const statisticsService = new StatisticsService();
    const result = statisticsService.getTrendingDays(mockData, 3, 'more', 1.0, 1, 1, 1);

    let allPassed = true;
    const details = [];

    // Validate structure
    if (result === null) {
        console.log('✗ Result is null - FAILED');
        allPassed = false;
    } else {
        // Check if we found the expected trending period
        const expectedStartDate = '2023-01-01';
        const expectedEndDate = '2023-01-04';
        const expectedTotalDays = 3;
        const expectedPercentChange = 3.0; // (103-100)/100 * 100

        const startDatePassed = result.StartDate[0] === expectedStartDate;
        const endDatePassed = result.EndDate[0] === expectedEndDate;
        const totalDaysPassed = result.TotalDays[0] === expectedTotalDays;
        const percentChangePassed = compareWithTolerance(result.PercentChange[0], expectedPercentChange, 0.01);

        details.push(
            { metric: 'StartDate', expected: expectedStartDate, actual: result.StartDate[0], passed: startDatePassed },
            { metric: 'EndDate', expected: expectedEndDate, actual: result.EndDate[0], passed: endDatePassed },
            { metric: 'TotalDays', expected: expectedTotalDays, actual: result.TotalDays[0], passed: totalDaysPassed },
            { metric: 'PercentChange', expected: expectedPercentChange, actual: result.PercentChange[0], passed: percentChangePassed }
        );

        allPassed = startDatePassed && endDatePassed && totalDaysPassed && percentChangePassed;

        console.log(`Start Date: ${result.StartDate[0]} (expected: ${expectedStartDate}) ${startDatePassed ? '✓' : '✗'}`);
        console.log(`End Date: ${result.EndDate[0]} (expected: ${expectedEndDate}) ${endDatePassed ? '✓' : '✗'}`);
        console.log(`Total Days: ${result.TotalDays[0]} (expected: ${expectedTotalDays}) ${totalDaysPassed ? '✓' : '✗'}`);
        console.log(`Percent Change: ${result.PercentChange[0]} (expected: ${expectedPercentChange}) ${percentChangePassed ? '✓' : '✗'}`);
    }

    validationResults.details.push({
        test: 'Trending Days',
        passed: allPassed,
        details
    });

    if (allPassed) {
        validationResults.passed++;
        console.log('✓ Trending days validation PASSED');
    } else {
        validationResults.failed++;
        validationResults.errors.push('Trending days validation FAILED');
        console.log('✗ Trending days validation FAILED');
    }

    return allPassed;
}

/**
 * Performance benchmark test
 */
function performanceBenchmark() {
    console.log(`\n=== Performance Benchmark ===`);

    const statisticsService = new StatisticsService();

    // Generate large dataset
    const largeDataset = Array.from({ length: 100000 }, (_, i) =>
        Math.sin(i / 1000) * 10 + Math.random() * 5 - 2.5
    );

    console.log(`Testing with ${largeDataset.length} data points...`);

    // Benchmark statistics calculation
    const startTime = Date.now();
    const result = statisticsService.getDataTableStatistics(largeDataset);
    const executionTime = Date.now() - startTime;

    console.log(`Execution time: ${executionTime}ms`);
    console.log(`Records processed: ${result['All Count']}`);
    console.log(`Processing rate: ${Math.round(result['All Count'] / executionTime * 1000)} records/second`);

    // Benchmark consecutive values
    const startTime2 = Date.now();
    const consecutiveResult = statisticsService.maximumConsecutiveValues(largeDataset);
    const executionTime2 = Date.now() - startTime2;

    console.log(`Consecutive values execution time: ${executionTime2}ms`);
    console.log(`Max positive streak: ${consecutiveResult.maximumPositiveCount}`);
    console.log(`Max negative streak: ${consecutiveResult.maximumNegativeCount}`);

    // Performance criteria (should complete within reasonable time)
    const performancePassed = executionTime < 5000 && executionTime2 < 5000; // 5 seconds max

    if (performancePassed) {
        validationResults.passed++;
        console.log('✓ Performance benchmark PASSED');
    } else {
        validationResults.failed++;
        validationResults.errors.push('Performance benchmark FAILED - execution too slow');
        console.log('✗ Performance benchmark FAILED - execution too slow');
    }

    return performancePassed;
}

/**
 * Generate validation report
 */
function generateReport() {
    console.log(`\n${'='.repeat(60)}`);
    console.log('VALIDATION REPORT');
    console.log(`${'='.repeat(60)}`);

    console.log(`Total tests: ${validationResults.passed + validationResults.failed}`);
    console.log(`Passed: ${validationResults.passed}`);
    console.log(`Failed: ${validationResults.failed}`);
    console.log(`Success rate: ${((validationResults.passed / (validationResults.passed + validationResults.failed)) * 100).toFixed(2)}%`);

    if (validationResults.errors.length > 0) {
        console.log('\nFAILED TESTS:');
        validationResults.errors.forEach(error => {
            console.log(`- ${error}`);
        });
    }

    // Generate detailed JSON report
    const report = {
        timestamp: new Date().toISOString(),
        summary: {
            total: validationResults.passed + validationResults.failed,
            passed: validationResults.passed,
            failed: validationResults.failed,
            successRate: (validationResults.passed / (validationResults.passed + validationResults.failed)) * 100
        },
        tolerance: TOLERANCE,
        errors: validationResults.errors,
        details: validationResults.details
    };

    // Save report to file
    const reportPath = path.join(__dirname, 'validation-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\nDetailed report saved to: ${reportPath}`);

    return report;
}

/**
 * Main validation function
 */
function runValidation() {
    console.log('Starting Python-JavaScript Validation...');
    console.log(`Tolerance: ${TOLERANCE} (${(TOLERANCE * 100).toFixed(4)}%)`);

    try {
        // Test basic statistics
        validateStatistics('basicStats', TEST_DATASETS.basicStats, PYTHON_EXPECTED_RESULTS.basicStats);

        // Test precision edge cases
        validateStatistics('precisionTest', TEST_DATASETS.precisionTest, PYTHON_EXPECTED_RESULTS.precisionTest);

        // Test consecutive values
        validateConsecutiveValues('basicStats', TEST_DATASETS.basicStats, PYTHON_EXPECTED_RESULTS.basicStats);
        validateConsecutiveValues('consecutiveTest', TEST_DATASETS.consecutiveTest, PYTHON_EXPECTED_RESULTS.consecutiveTest);

        // Test trending days
        validateTrendingDays();

        // Performance benchmark
        performanceBenchmark();

        // Generate final report
        const report = generateReport();

        console.log(`\n${validationResults.failed === 0 ? '✓ ALL VALIDATIONS PASSED' : '✗ SOME VALIDATIONS FAILED'}`);

        return report;

    } catch (error) {
        console.error('Validation failed with error:', error);
        validationResults.errors.push(`Validation error: ${error.message}`);
        return generateReport();
    }
}

// Run validation if this file is executed directly
if (require.main === module) {
    runValidation();
}

module.exports = {
    runValidation,
    TEST_DATASETS,
    PYTHON_EXPECTED_RESULTS,
    compareWithTolerance
};