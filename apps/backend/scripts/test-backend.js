#!/usr/bin/env node

/**
 * Backend Testing Script
 * 
 * Automated testing script for the Seasonality SaaS backend
 * Tests all major functionality without requiring a frontend
 * 
 * Usage:
 *   node scripts/test-backend.js [options]
 * 
 * Options:
 *   --full          Run complete test suite
 *   --quick         Run quick smoke tests only
 *   --upload        Test upload functionality
 *   --analysis      Test analysis functionality
 *   --auth          Test authentication
 *   --health        Test health endpoints
 *   --performance   Test performance metrics
 *   --help          Show help
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

class BackendTester {
    constructor() {
        this.baseURL = process.env.BACKEND_URL || 'http://localhost:3001';
        this.jwtToken = null;
        this.testResults = {
            passed: 0,
            failed: 0,
            total: 0,
            details: []
        };

        // Configure axios defaults
        this.client = axios.create({
            baseURL: this.baseURL,
            timeout: 30000,
            validateStatus: () => true // Don't throw on HTTP errors
        });
    }

    /**
     * Main test runner
     */
    async runTests(options = {}) {
        console.log('🚀 Starting Backend Testing Suite');
        console.log(`📍 Testing server at: ${this.baseURL}`);
        console.log('='.repeat(60));

        try {
            // Check if server is running
            await this.checkServerHealth();

            if (options.full || options.auth || !options.quick) {
                await this.testAuthentication();
            }

            if (options.full || options.health || options.quick) {
                await this.testHealthEndpoints();
            }

            if (options.full || options.upload) {
                await this.testUploadFunctionality();
            }

            if (options.full || options.analysis) {
                await this.testAnalysisFunctionality();
            }

            if (options.full || options.performance) {
                await this.testPerformanceEndpoints();
            }

            this.printSummary();

        } catch (error) {
            console.error('❌ Test suite failed to complete:', error.message);
            process.exit(1);
        }
    }

    /**
     * Check if server is running
     */
    async checkServerHealth() {
        console.log('\n🔍 Checking server health...');

        try {
            const response = await this.client.get('/');

            if (response.status === 200) {
                this.recordTest('Server Health Check', true, 'Server is running');
                console.log('✅ Server is running');
            } else {
                this.recordTest('Server Health Check', false, `Server returned status ${response.status}`);
                throw new Error(`Server is not responding properly (status: ${response.status})`);
            }
        } catch (error) {
            this.recordTest('Server Health Check', false, error.message);
            throw new Error(`Cannot connect to server: ${error.message}`);
        }
    }

    /**
     * Test authentication endpoints
     */
    async testAuthentication() {
        console.log('\n🔐 Testing Authentication...');

        // Test user registration
        const testUser = {
            name: 'Test User',
            email: `test_${Date.now()}@example.com`,
            password: 'password123',
            role: 'RESEARCH_TEAM'
        };

        try {
            const registerResponse = await this.client.post('/api/auth/register', testUser);

            if (registerResponse.status === 201 || registerResponse.status === 200) {
                this.recordTest('User Registration', true, 'User registered successfully');
                console.log('✅ User registration successful');
            } else {
                this.recordTest('User Registration', false, `Registration failed: ${registerResponse.data?.message || 'Unknown error'}`);
                console.log('❌ User registration failed');
            }
        } catch (error) {
            this.recordTest('User Registration', false, error.message);
            console.log('❌ User registration error:', error.message);
        }

        // Test user login
        try {
            const loginResponse = await this.client.post('/api/auth/login', {
                email: testUser.email,
                password: testUser.password
            });

            if (loginResponse.status === 200 && loginResponse.data.token) {
                this.jwtToken = loginResponse.data.token;
                this.client.defaults.headers.common['Authorization'] = `Bearer ${this.jwtToken}`;
                this.recordTest('User Login', true, 'Login successful, JWT token received');
                console.log('✅ User login successful');
            } else {
                this.recordTest('User Login', false, `Login failed: ${loginResponse.data?.message || 'No token received'}`);
                console.log('❌ User login failed');
            }
        } catch (error) {
            this.recordTest('User Login', false, error.message);
            console.log('❌ User login error:', error.message);
        }
    }

    /**
     * Test health endpoints
     */
    async testHealthEndpoints() {
        console.log('\n🏥 Testing Health Endpoints...');

        // Basic health check
        try {
            const response = await this.client.get('/api/health');

            if (response.status === 200) {
                this.recordTest('Basic Health Check', true, 'Health endpoint responding');
                console.log('✅ Basic health check passed');
            } else {
                this.recordTest('Basic Health Check', false, `Health check failed: ${response.status}`);
                console.log('❌ Basic health check failed');
            }
        } catch (error) {
            this.recordTest('Basic Health Check', false, error.message);
            console.log('❌ Basic health check error:', error.message);
        }

        // Analysis service health (requires authentication)
        if (this.jwtToken) {
            try {
                const response = await this.client.get('/api/analysis/health');

                if (response.status === 200) {
                    this.recordTest('Analysis Service Health', true, 'Analysis service is healthy');
                    console.log('✅ Analysis service health check passed');
                } else {
                    this.recordTest('Analysis Service Health', false, `Analysis health check failed: ${response.status}`);
                    console.log('❌ Analysis service health check failed');
                }
            } catch (error) {
                this.recordTest('Analysis Service Health', false, error.message);
                console.log('❌ Analysis service health check error:', error.message);
            }
        }
    }

    /**
     * Test upload functionality
     */
    async testUploadFunctionality() {
        console.log('\n📤 Testing Upload Functionality...');

        if (!this.jwtToken) {
            console.log('⚠️  Skipping upload tests - no authentication token');
            return;
        }

        // Test CSV validation
        await this.testCSVValidation();

        // Test single file upload
        await this.testSingleFileUpload();

        // Test upload history
        await this.testUploadHistory();
    }

    /**
     * Test CSV validation
     */
    async testCSVValidation() {
        const csvPath = path.join(__dirname, '..', 'test-data', 'sample_daily_data.csv');

        if (!fs.existsSync(csvPath)) {
            this.recordTest('CSV Validation', false, 'Test CSV file not found');
            console.log('❌ Test CSV file not found');
            return;
        }

        try {
            const formData = new FormData();
            formData.append('file', fs.createReadStream(csvPath));

            const response = await this.client.post('/api/upload/enhanced/validate', formData, {
                headers: {
                    ...formData.getHeaders(),
                    'Authorization': `Bearer ${this.jwtToken}`
                }
            });

            if (response.status === 200 && response.data.success) {
                this.recordTest('CSV Validation', true, `Validated ${response.data.data.recordCount} records`);
                console.log('✅ CSV validation successful');
            } else {
                this.recordTest('CSV Validation', false, response.data?.message || 'Validation failed');
                console.log('❌ CSV validation failed');
            }
        } catch (error) {
            this.recordTest('CSV Validation', false, error.message);
            console.log('❌ CSV validation error:', error.message);
        }
    }

    /**
     * Test single file upload
     */
    async testSingleFileUpload() {
        const csvPath = path.join(__dirname, '..', 'test-data', 'sample_daily_data.csv');

        if (!fs.existsSync(csvPath)) {
            this.recordTest('Single File Upload', false, 'Test CSV file not found');
            console.log('❌ Test CSV file not found');
            return;
        }

        try {
            const formData = new FormData();
            formData.append('file', fs.createReadStream(csvPath));
            formData.append('timeframe', 'DAILY');
            formData.append('generateAllTimeframes', 'true');

            const response = await this.client.post('/api/upload/enhanced/single', formData, {
                headers: {
                    ...formData.getHeaders(),
                    'Authorization': `Bearer ${this.jwtToken}`
                }
            });

            if (response.status === 200 && response.data.success) {
                this.recordTest('Single File Upload', true, `Processed ${response.data.data.summary?.totalRecords || 0} records`);
                console.log('✅ Single file upload successful');
            } else {
                this.recordTest('Single File Upload', false, response.data?.message || 'Upload failed');
                console.log('❌ Single file upload failed');
            }
        } catch (error) {
            this.recordTest('Single File Upload', false, error.message);
            console.log('❌ Single file upload error:', error.message);
        }
    }

    /**
     * Test upload history
     */
    async testUploadHistory() {
        try {
            const response = await this.client.get('/api/upload/enhanced/history');

            if (response.status === 200) {
                this.recordTest('Upload History', true, `Retrieved ${response.data.data?.length || 0} upload records`);
                console.log('✅ Upload history retrieval successful');
            } else {
                this.recordTest('Upload History', false, 'Failed to retrieve upload history');
                console.log('❌ Upload history retrieval failed');
            }
        } catch (error) {
            this.recordTest('Upload History', false, error.message);
            console.log('❌ Upload history error:', error.message);
        }
    }

    /**
     * Test analysis functionality
     */
    async testAnalysisFunctionality() {
        console.log('\n📊 Testing Analysis Functionality...');

        if (!this.jwtToken) {
            console.log('⚠️  Skipping analysis tests - no authentication token');
            return;
        }

        // Test daily analysis
        await this.testDailyAnalysis();

        // Test weekly analysis
        await this.testWeeklyAnalysis();

        // Test analysis history
        await this.testAnalysisHistory();
    }

    /**
     * Test daily analysis
     */
    async testDailyAnalysis() {
        const analysisParams = {
            symbolNameToPlotValue: 'NIFTY',
            startDate: '2024-01-01',
            endDate: '2024-01-31',
            consecutiveDays: 2,
            trendDirection: 'more',
            percentageThreshold: 0,
            saveResults: false
        };

        try {
            const response = await this.client.post('/api/analysis/daily', analysisParams);

            if (response.status === 200 && response.data.success) {
                this.recordTest('Daily Analysis', true, `Analysis completed in ${response.data.data.metadata?.executionTime || 0}ms`);
                console.log('✅ Daily analysis successful');
            } else {
                this.recordTest('Daily Analysis', false, response.data?.message || 'Analysis failed');
                console.log('❌ Daily analysis failed:', response.data?.message);
            }
        } catch (error) {
            this.recordTest('Daily Analysis', false, error.message);
            console.log('❌ Daily analysis error:', error.message);
        }
    }

    /**
     * Test weekly analysis
     */
    async testWeeklyAnalysis() {
        const analysisParams = {
            symbolNameToPlotValue: 'NIFTY',
            startDate: '2024-01-01',
            endDate: '2024-01-31',
            saveResults: false
        };

        try {
            const response = await this.client.post('/api/analysis/weekly', analysisParams);

            if (response.status === 200 && response.data.success) {
                this.recordTest('Weekly Analysis', true, `Analysis completed in ${response.data.data.metadata?.executionTime || 0}ms`);
                console.log('✅ Weekly analysis successful');
            } else {
                this.recordTest('Weekly Analysis', false, response.data?.message || 'Analysis failed');
                console.log('❌ Weekly analysis failed:', response.data?.message);
            }
        } catch (error) {
            this.recordTest('Weekly Analysis', false, error.message);
            console.log('❌ Weekly analysis error:', error.message);
        }
    }

    /**
     * Test analysis history
     */
    async testAnalysisHistory() {
        try {
            const response = await this.client.get('/api/analysis/history?limit=10');

            if (response.status === 200) {
                this.recordTest('Analysis History', true, `Retrieved ${response.data.data?.length || 0} analysis records`);
                console.log('✅ Analysis history retrieval successful');
            } else {
                this.recordTest('Analysis History', false, 'Failed to retrieve analysis history');
                console.log('❌ Analysis history retrieval failed');
            }
        } catch (error) {
            this.recordTest('Analysis History', false, error.message);
            console.log('❌ Analysis history error:', error.message);
        }
    }

    /**
     * Test performance endpoints
     */
    async testPerformanceEndpoints() {
        console.log('\n⚡ Testing Performance Endpoints...');

        if (!this.jwtToken) {
            console.log('⚠️  Skipping performance tests - no authentication token');
            return;
        }

        // Test performance metrics
        try {
            const response = await this.client.get('/api/analysis/performance');

            if (response.status === 200) {
                this.recordTest('Performance Metrics', true, 'Performance metrics retrieved');
                console.log('✅ Performance metrics retrieval successful');
            } else {
                this.recordTest('Performance Metrics', false, 'Failed to retrieve performance metrics');
                console.log('❌ Performance metrics retrieval failed');
            }
        } catch (error) {
            this.recordTest('Performance Metrics', false, error.message);
            console.log('❌ Performance metrics error:', error.message);
        }

        // Test cache operations
        try {
            const response = await this.client.post('/api/analysis/cache/clear');

            if (response.status === 200) {
                this.recordTest('Cache Clear', true, 'Cache cleared successfully');
                console.log('✅ Cache clear successful');
            } else {
                this.recordTest('Cache Clear', false, 'Failed to clear cache');
                console.log('❌ Cache clear failed');
            }
        } catch (error) {
            this.recordTest('Cache Clear', false, error.message);
            console.log('❌ Cache clear error:', error.message);
        }
    }

    /**
     * Record test result
     */
    recordTest(testName, passed, details) {
        this.testResults.total++;
        if (passed) {
            this.testResults.passed++;
        } else {
            this.testResults.failed++;
        }

        this.testResults.details.push({
            test: testName,
            passed,
            details,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Print test summary
     */
    printSummary() {
        console.log('\n' + '='.repeat(60));
        console.log('📋 TEST SUMMARY');
        console.log('='.repeat(60));
        console.log(`Total Tests: ${this.testResults.total}`);
        console.log(`✅ Passed: ${this.testResults.passed}`);
        console.log(`❌ Failed: ${this.testResults.failed}`);
        console.log(`Success Rate: ${((this.testResults.passed / this.testResults.total) * 100).toFixed(1)}%`);

        if (this.testResults.failed > 0) {
            console.log('\n❌ FAILED TESTS:');
            this.testResults.details
                .filter(test => !test.passed)
                .forEach(test => {
                    console.log(`  • ${test.test}: ${test.details}`);
                });
        }

        console.log('\n📊 DETAILED RESULTS:');
        this.testResults.details.forEach(test => {
            const status = test.passed ? '✅' : '❌';
            console.log(`  ${status} ${test.test}: ${test.details}`);
        });

        // Save results to file
        const resultsFile = path.join(__dirname, '..', 'test-results.json');
        fs.writeFileSync(resultsFile, JSON.stringify(this.testResults, null, 2));
        console.log(`\n💾 Results saved to: ${resultsFile}`);

        // Exit with appropriate code
        process.exit(this.testResults.failed > 0 ? 1 : 0);
    }

    /**
     * Show help
     */
    static showHelp() {
        console.log(`
Backend Testing Script

Usage:
  node scripts/test-backend.js [options]

Options:
  --full          Run complete test suite (default)
  --quick         Run quick smoke tests only
  --upload        Test upload functionality only
  --analysis      Test analysis functionality only
  --auth          Test authentication only
  --health        Test health endpoints only
  --performance   Test performance metrics only
  --help          Show this help message

Environment Variables:
  BACKEND_URL     Backend server URL (default: http://localhost:3001)

Examples:
  node scripts/test-backend.js --quick
  node scripts/test-backend.js --upload --analysis
  BACKEND_URL=http://localhost:3001 node scripts/test-backend.js --full
        `);
    }
}

// Main execution
async function main() {
    const args = process.argv.slice(2);

    if (args.includes('--help') || args.includes('-h')) {
        BackendTester.showHelp();
        return;
    }

    const options = {
        full: args.includes('--full') || args.length === 0,
        quick: args.includes('--quick'),
        upload: args.includes('--upload'),
        analysis: args.includes('--analysis'),
        auth: args.includes('--auth'),
        health: args.includes('--health'),
        performance: args.includes('--performance')
    };

    const tester = new BackendTester();
    await tester.runTests(options);
}

// Run if this file is executed directly
if (require.main === module) {
    main().catch(error => {
        console.error('❌ Test script failed:', error);
        process.exit(1);
    });
}

module.exports = BackendTester;