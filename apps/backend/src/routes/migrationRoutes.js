/**
 * Migration Routes
 *
 * Provides API endpoints for system initialization and data migration
 * Handles basket setup, political cycle initialization, and data migration
 */

const express = require('express')
const router = express.Router()
const dataMigrationService = require('../services/dataMigrationService')
const basketService = require('../services/basketService')
const politicalCycleService = require('../services/politicalCycleService')
const seasonalityService = require('../services/seasonalityService')

/**
 * @route POST /api/migration/
 * @desc Initialize completeinitialize-complete system - baskets, political cycles, special days, and migration
 */
router.post('/initialize-complete', async (req, res) => {
    try {
        console.log('Starting complete system initialization...')

        const result = await dataMigrationService.runCompleteMigration()

        res.status(200).json({
            success: true,
            message: 'Complete system initialization finished successfully',
            data: result,
        })
    } catch (error) {
        console.error('Error in complete system initialization:', error)
        res.status(500).json({
            success: false,
            message: 'Failed to complete system initialization',
            error: error.message,
        })
    }
})

/**
 * @route POST /api/migration/initialize-baskets
 * @desc Initialize basket system only
 */
router.post('/initialize-baskets', async (req, res) => {
    try {
        console.log('Initializing basket system...')

        await basketService.initializeCompleteBasketSystem()

        const baskets = await basketService.getAllBaskets()

        res.status(200).json({
            success: true,
            message: 'Basket system initialized successfully',
            data: {
                basketCount: baskets.length,
                baskets: baskets,
            },
        })
    } catch (error) {
        console.error('Error initializing baskets:', error)
        res.status(500).json({
            success: false,
            message: 'Failed to initialize basket system',
            error: error.message,
        })
    }
})

/**
 * @route POST /api/migration/initialize-political-cycles
 * @desc Initialize political cycles and special days
 */
router.post('/initialize-political-cycles', async (req, res) => {
    try {
        console.log('Initializing political cycles and special days...')

        await politicalCycleService.initializeAll()

        const [cycles, specialDays, electionYears] = await Promise.all([
            require('../services/politicalCycleService').getPoliticalCycles(
                new Date('2000-01-01'),
                new Date('2030-12-31')
            ),
            require('../services/politicalCycleService').getSpecialDays(new Date('2000-01-01'), new Date('2030-12-31')),
            require('../services/politicalCycleService').getElectionYearAnalysis(1), // Test with ticker ID 1
        ])

        res.status(200).json({
            success: true,
            message: 'Political cycles and special days initialized successfully',
            data: {
                politicalCycles: cycles.length,
                specialDays: specialDays.length,
                electionYears: electionYears.electionYears?.length || 0,
            },
        })
    } catch (error) {
        console.error('Error initializing political cycles:', error)
        res.status(500).json({
            success: false,
            message: 'Failed to initialize political cycles',
            error: error.message,
        })
    }
})

/**
 * @route POST /api/migration/migrate-seasonality-data
 * @desc Migrate seasonality data to enhanced tables
 */
router.post('/migrate-seasonality-data', async (req, res) => {
    try {
        console.log('Starting seasonality data migration...')

        await dataMigrationService.migrateSeasonalityData()

        const status = await dataMigrationService.getMigrationStatus()

        res.status(200).json({
            success: true,
            message: 'Seasonality data migration completed',
            data: status,
        })
    } catch (error) {
        console.error('Error migrating seasonality data:', error)
        res.status(500).json({
            success: false,
            message: 'Failed to migrate seasonality data',
            error: error.message,
        })
    }
})

/**
 * @route GET /api/migration/status
 * @desc Get current migration status
 */
router.get('/status', async (req, res) => {
    try {
        const status = await dataMigrationService.getMigrationStatus()

        res.status(200).json({
            success: true,
            data: status,
        })
    } catch (error) {
        console.error('Error getting migration status:', error)
        res.status(500).json({
            success: false,
            message: 'Failed to get migration status',
            error: error.message,
        })
    }
})

/**
 * @route GET /api/migration/baskets
 * @desc Get all baskets with item counts
 */
router.get('/baskets', async (req, res) => {
    try {
        const baskets = await basketService.getAllBaskets()

        res.status(200).json({
            success: true,
            data: baskets,
        })
    } catch (error) {
        console.error('Error fetching baskets:', error)
        res.status(500).json({
            success: false,
            message: 'Failed to fetch baskets',
            error: error.message,
        })
    }
})

/**
 * @route GET /api/migration/baskets/:basketName
 * @desc Get specific basket with all items
 */
router.get('/baskets/:basketName', async (req, res) => {
    try {
        const { basketName } = req.params

        const basket = await basketService.getBasketByName(basketName)

        if (!basket) {
            return res.status(404).json({
                success: false,
                message: `Basket ${basketName} not found`,
            })
        }

        res.status(200).json({
            success: true,
            data: basket,
        })
    } catch (error) {
        console.error(`Error fetching basket ${req.params.basketName}:`, error)
        res.status(500).json({
            success: false,
            message: 'Failed to fetch basket',
            error: error.message,
        })
    }
})

/**
 * @route POST /api/migration/analyze-basket/:basketName
 * @desc Analyze seasonality patterns for a specific basket
 */
router.post('/analyze-basket/:basketName', async (req, res) => {
    try {
        const { basketName } = req.params
        const { analysisType = 'monthly' } = req.body

        const analysis = await basketService.analyzeBasketSeasonality(basketName, analysisType)

        res.status(200).json({
            success: true,
            data: analysis,
        })
    } catch (error) {
        console.error(`Error analyzing basket ${req.params.basketName}:`, error)
        res.status(500).json({
            success: false,
            message: 'Failed to analyze basket',
            error: error.message,
        })
    }
})

/**
 * @route POST /api/migration/compare-baskets
 * @desc Compare multiple baskets performance
 */
router.post('/compare-baskets', async (req, res) => {
    try {
        const { basketNames, analysisType = 'monthly' } = req.body

        if (!basketNames || !Array.isArray(basketNames) || basketNames.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'basketNames array is required',
            })
        }

        const comparison = await basketService.compareBaskets(basketNames, analysisType)

        res.status(200).json({
            success: true,
            data: comparison,
        })
    } catch (error) {
        console.error('Error comparing baskets:', error)
        res.status(500).json({
            success: false,
            message: 'Failed to compare baskets',
            error: error.message,
        })
    }
})

/**
 * @route POST /api/migration/test-services
 * @desc Test all services to ensure they're working correctly
 */
router.post('/test-services', async (req, res) => {
    try {
        const testResults = {
            basketService: false,
            politicalCycleService: false,
            seasonalityService: false,
            dataMigrationService: false,
        }

        // Test basket service
        try {
            const baskets = await basketService.getAllBaskets()
            testResults.basketService = true
        } catch (error) {
            testResults.basketService = error.message
        }

        // Test political cycle service
        try {
            await politicalCycleService.initializeData()
            testResults.politicalCycleService = true
        } catch (error) {
            testResults.politicalCycleService = error.message
        }

        // Test seasonality service
        try {
            const patterns = await seasonalityService.calculateOverallStatistics()
            testResults.seasonalityService = true
        } catch (error) {
            testResults.seasonalityService = error.message
        }

        // Test data migration service
        try {
            const status = await dataMigrationService.getMigrationStatus()
            testResults.dataMigrationService = true
        } catch (error) {
            testResults.dataMigrationService = error.message
        }

        res.status(200).json({
            success: true,
            message: 'Service tests completed',
            data: testResults,
        })
    } catch (error) {
        console.error('Error testing services:', error)
        res.status(500).json({
            success: false,
            message: 'Failed to test services',
            error: error.message,
        })
    }
})

module.exports = router
