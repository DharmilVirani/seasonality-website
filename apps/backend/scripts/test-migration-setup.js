#!/usr/bin/env node

/**
 * Migration Setup Test Script
 * 
 * Validates that the migration environment is properly configured
 * and ready to run the data migration process
 * 
 * @author Seasonality SaaS Team
 * @version 1.0.0
 */

const fs = require('fs').promises;
const path = require('path');
const { PrismaClient } = require('@prisma/client');

// Test configuration
const TESTS = {
    environment: 'Environment Variables',
    database: 'Database Connection',
    oldSoftware: 'Old Software Data',
    dependencies: 'Dependencies',
    permissions: 'File Permissions',
    schema: 'Database Schema'
};

class MigrationSetupTester {
    constructor() {
        this.results = {};
        this.prisma = null;
    }

    /**
     * Run all setup tests
     */
    async runAllTests() {
        console.log('🧪 Migration Setup Test Suite');
        console.log('='.repeat(50));

        const testMethods = [
            this.testEnvironment,
            this.testDependencies,
            this.testOldSoftwareData,
            this.testDatabaseConnection,
            this.testDatabaseSchema,
            this.testFilePermissions
        ];

        for (const testMethod of testMethods) {
            try {
                await testMethod.call(this);
            } catch (error) {
                console.error(`❌ Test failed: ${error.message}`);
            }
        }

        this.displaySummary();

        if (this.prisma) {
            await this.prisma.$disconnect();
        }

        const allPassed = Object.values(this.results).every(result => result.passed);
        process.exit(allPassed ? 0 : 1);
    }

    /**
     * Test environment variables
     */
    async testEnvironment() {
        console.log('\n🔧 Testing Environment Variables...');

        const test = {
            name: TESTS.environment,
            passed: true,
            issues: []
        };

        // Check DATABASE_URL
        if (!process.env.DATABASE_URL) {
            test.passed = false;
            test.issues.push('DATABASE_URL environment variable is missing');
        } else {
            console.log('  ✅ DATABASE_URL is set');
        }

        // Check Node.js version
        const nodeVersion = process.version;
        const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

        if (majorVersion < 14) {
            test.passed = false;
            test.issues.push(`Node.js version ${nodeVersion} is not supported (requires 14+)`);
        } else {
            console.log(`  ✅ Node.js version ${nodeVersion} is supported`);
        }

        // Check OLD_SOFTWARE_PATH
        const oldSoftwarePath = process.env.OLD_SOFTWARE_PATH || path.join(__dirname, '..', 'old-software');
        console.log(`  ℹ️  Old software path: ${oldSoftwarePath}`);

        this.results.environment = test;

        if (!test.passed) {
            console.log('  ❌ Environment test failed:');
            test.issues.forEach(issue => console.log(`    - ${issue}`));
        }
    }

    /**
     * Test dependencies
     */
    async testDependencies() {
        console.log('\n📦 Testing Dependencies...');

        const test = {
            name: TESTS.dependencies,
            passed: true,
            issues: []
        };

        const requiredDeps = [
            '@prisma/client',
            'csv-parse',
            'decimal.js'
        ];

        for (const dep of requiredDeps) {
            try {
                require(dep);
                console.log(`  ✅ ${dep} is available`);
            } catch (error) {
                test.passed = false;
                test.issues.push(`${dep} is not installed`);
                console.log(`  ❌ ${dep} is missing`);
            }
        }

        this.results.dependencies = test;
    }

    /**
     * Test old software data availability
     */
    async testOldSoftwareData() {
        console.log('\n📁 Testing Old Software Data...');

        const test = {
            name: TESTS.oldSoftware,
            passed: true,
            issues: []
        };

        const oldSoftwarePath = process.env.OLD_SOFTWARE_PATH || path.join(__dirname, '..', 'old-software');

        try {
            // Check if old-software directory exists
            await fs.access(oldSoftwarePath);
            console.log(`  ✅ Old software directory found: ${oldSoftwarePath}`);

            // Check Symbols directory
            const symbolsPath = path.join(oldSoftwarePath, 'Symbols');
            await fs.access(symbolsPath);
            console.log('  ✅ Symbols directory found');

            // Count ticker directories
            const tickerDirs = await fs.readdir(symbolsPath);
            const tickerCount = tickerDirs.filter(async (dir) => {
                const stat = await fs.stat(path.join(symbolsPath, dir));
                return stat.isDirectory();
            }).length;

            console.log(`  ✅ Found ${tickerCount} ticker directories`);

            // Check sample ticker structure
            if (tickerCount > 0) {
                const sampleTicker = tickerDirs[0];
                const samplePath = path.join(symbolsPath, sampleTicker);
                const sampleFiles = await fs.readdir(samplePath);
                const csvFiles = sampleFiles.filter(f => f.endsWith('.csv'));

                console.log(`  ✅ Sample ticker (${sampleTicker}) has ${csvFiles.length} CSV files`);

                if (csvFiles.length < 5) {
                    test.issues.push(`Sample ticker has only ${csvFiles.length} CSV files (expected 5)`);
                }
            }

            // Check additional data directories
            const additionalDirs = ['elections', 'specialDays', 'basket', 'watchlist'];
            for (const dir of additionalDirs) {
                const dirPath = path.join(oldSoftwarePath, dir);
                try {
                    await fs.access(dirPath);
                    console.log(`  ✅ ${dir} directory found`);
                } catch {
                    console.log(`  ⚠️  ${dir} directory not found (optional)`);
                }
            }

        } catch (error) {
            test.passed = false;
            test.issues.push(`Old software data not accessible: ${error.message}`);
            console.log(`  ❌ Old software data test failed: ${error.message}`);
        }

        this.results.oldSoftware = test;
    }

    /**
     * Test database connection
     */
    async testDatabaseConnection() {
        console.log('\n🗄️  Testing Database Connection...');

        const test = {
            name: TESTS.database,
            passed: true,
            issues: []
        };

        try {
            this.prisma = new PrismaClient();

            // Test connection
            await this.prisma.$connect();
            console.log('  ✅ Database connection successful');

            // Test query
            const result = await this.prisma.$queryRaw`SELECT 1 as test`;
            console.log('  ✅ Database query test successful');

        } catch (error) {
            test.passed = false;
            test.issues.push(`Database connection failed: ${error.message}`);
            console.log(`  ❌ Database connection failed: ${error.message}`);
        }

        this.results.database = test;
    }

    /**
     * Test database schema
     */
    async testDatabaseSchema() {
        console.log('\n🏗️  Testing Database Schema...');

        const test = {
            name: TESTS.schema,
            passed: true,
            issues: []
        };

        if (!this.prisma) {
            test.passed = false;
            test.issues.push('Database connection not available');
            this.results.schema = test;
            return;
        }

        try {
            // Check if Ticker table exists
            const tickerCount = await this.prisma.ticker.count();
            console.log(`  ✅ Ticker table accessible (${tickerCount} records)`);

            // Check if SeasonalityData table exists
            const dataCount = await this.prisma.seasonalityData.count();
            console.log(`  ✅ SeasonalityData table accessible (${dataCount} records)`);

            // Test table relationships
            const sampleTicker = await this.prisma.ticker.findFirst({
                include: {
                    seasonalityData: {
                        take: 1
                    }
                }
            });

            if (sampleTicker) {
                console.log('  ✅ Table relationships working');
            } else {
                console.log('  ℹ️  No sample data found (expected for fresh database)');
            }

        } catch (error) {
            test.passed = false;
            test.issues.push(`Schema validation failed: ${error.message}`);
            console.log(`  ❌ Schema test failed: ${error.message}`);
        }

        this.results.schema = test;
    }

    /**
     * Test file permissions
     */
    async testFilePermissions() {
        console.log('\n🔐 Testing File Permissions...');

        const test = {
            name: TESTS.permissions,
            passed: true,
            issues: []
        };

        try {
            // Test write permissions in scripts directory
            const testFile = path.join(__dirname, 'test-write-permission.tmp');
            await fs.writeFile(testFile, 'test');
            await fs.unlink(testFile);
            console.log('  ✅ Write permissions in scripts directory');

            // Test read permissions for old software data
            const oldSoftwarePath = process.env.OLD_SOFTWARE_PATH || path.join(__dirname, '..', 'old-software');

            try {
                await fs.access(oldSoftwarePath, fs.constants.R_OK);
                console.log('  ✅ Read permissions for old software data');
            } catch {
                test.issues.push('No read permissions for old software data');
            }

        } catch (error) {
            test.passed = false;
            test.issues.push(`Permission test failed: ${error.message}`);
            console.log(`  ❌ Permission test failed: ${error.message}`);
        }

        this.results.permissions = test;
    }

    /**
     * Display test summary
     */
    displaySummary() {
        console.log('\n📊 Test Summary');
        console.log('='.repeat(50));

        const totalTests = Object.keys(this.results).length;
        const passedTests = Object.values(this.results).filter(r => r.passed).length;
        const failedTests = totalTests - passedTests;

        console.log(`Total tests: ${totalTests}`);
        console.log(`Passed: ${passedTests}`);
        console.log(`Failed: ${failedTests}`);
        console.log(`Success rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

        if (failedTests > 0) {
            console.log('\n❌ Failed Tests:');
            Object.values(this.results)
                .filter(r => !r.passed)
                .forEach(result => {
                    console.log(`\n${result.name}:`);
                    result.issues.forEach(issue => {
                        console.log(`  - ${issue}`);
                    });
                });

            console.log('\n🔧 Recommended Actions:');
            console.log('1. Fix the issues listed above');
            console.log('2. Run this test again to verify fixes');
            console.log('3. Refer to MIGRATION_GUIDE.md for detailed setup instructions');
        } else {
            console.log('\n🎉 All tests passed! Migration environment is ready.');
            console.log('\nNext steps:');
            console.log('1. Run migration validation: npm run migrate:validate');
            console.log('2. Run dry run: npm run migrate:dry-run');
            console.log('3. Run full migration: npm run migrate');
        }
    }
}

// Main execution
async function main() {
    const tester = new MigrationSetupTester();
    await tester.runAllTests();
}

// Run if this file is executed directly
if (require.main === module) {
    main().catch(error => {
        console.error('Test suite failed:', error);
        process.exit(1);
    });
}

module.exports = { MigrationSetupTester };