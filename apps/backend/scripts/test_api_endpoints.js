const axios = require('axios')
const FormData = require('form-data')
const fs = require('fs')
const path = require('path')

class ApiTester {
    constructor(baseUrl = 'http://localhost:3001') {
        this.baseUrl = baseUrl
        this.formData = FormData
    }

    async testHealthEndpoint() {
        console.log('🩺 Testing health endpoint...')
        try {
            const response = await axios.get(`${this.baseUrl}/api/health`)
            console.log('✅ Health endpoint response:', response.data)
            return response.data.services.database === 'connected'
        } catch (error) {
            console.error('❌ Health endpoint failed:', error.message)
            return false
        }
    }

    async testTickerEndpoint() {
        console.log('📊 Testing ticker endpoint...')
        try {
            const response = await axios.get(`${this.baseUrl}/api/data/tickers`)
            console.log('✅ Ticker endpoint response:', response.data)
            return response.data.success === true
        } catch (error) {
            console.error('❌ Ticker endpoint failed:', error.message)
            return false
        }
    }

    async testFileUpload(sampleCsvPath) {
        console.log('📁 Testing file upload...')
        try {
            if (!fs.existsSync(sampleCsvPath)) {
                console.error('❌ Sample CSV file not found:', sampleCsvPath)
                return false
            }

            const form = new this.formData()
            form.append('file', fs.createReadStream(sampleCsvPath))

            const response = await axios.post(`${this.baseUrl}/api/upload`, form, {
                headers: {
                    ...form.getHeaders(),
                },
            })

            console.log('✅ File upload response:', response.data)
            return response.data.success === true
        } catch (error) {
            console.error('❌ File upload failed:', error.response?.data || error.message)
            return false
        }
    }

    async runAllTests() {
        console.log('🚀 Starting API endpoint tests...')
        console.log('Base URL:', this.baseUrl)
        console.log('')

        const results = {
            health: await this.testHealthEndpoint(),
            tickers: await this.testTickerEndpoint(),
            upload: false, // Will be set if we have a sample file
        }

        // Try to find a sample CSV file
        const sampleFiles = [
            path.join(__dirname, '../others/Seasonality.csv'),
            path.join(__dirname, '../sample.csv'),
            path.join(__dirname, 'sample.csv'),
        ]

        let sampleFileFound = false
        for (const file of sampleFiles) {
            if (fs.existsSync(file)) {
                results.upload = await this.testFileUpload(file)
                sampleFileFound = true
                break
            }
        }

        if (!sampleFileFound) {
            console.log('ℹ️ No sample CSV file found for upload test')
        }

        console.log('')
        console.log('📋 Test Results:')
        console.log(`   Health Endpoint: ${results.health ? '✅ PASS' : '❌ FAIL'}`)
        console.log(`   Ticker Endpoint: ${results.tickers ? '✅ PASS' : '❌ FAIL'}`)
        console.log(`   File Upload: ${results.upload ? '✅ PASS' : sampleFileFound ? '❌ FAIL' : '⚪ SKIPPED'}`)

        const allPassed = results.health && results.tickers && (results.upload || !sampleFileFound)
        console.log('')
        console.log(allPassed ? '🎉 All tests passed!' : '⚠️ Some tests failed')

        return allPassed
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    const tester = new ApiTester()
    tester
        .runAllTests()
        .then((success) => process.exit(success ? 0 : 1))
        .catch(() => process.exit(1))
}

module.exports = ApiTester
