const express = require('express')
const router = express.Router()
const prisma = require('../config/database')

router.get('/', async (req, res, next) => {
    try {
        // Check database connection
        await prisma.$queryRaw`SELECT 1`

        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            services: {
                database: 'connected',
                api: 'operational',
            },
        })
    } catch (error) {
        res.status(503).json({
            status: 'degraded',
            timestamp: new Date().toISOString(),
            services: {
                database: 'unavailable',
                api: 'operational',
            },
            error: error.message,
        })
    }
})

module.exports = router
