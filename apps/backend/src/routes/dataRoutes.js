const express = require('express')
const router = express.Router()
const prisma = require('../config/database')

// Get all tickers
router.get('/tickers', async (req, res, next) => {
    try {
        const tickers = await prisma.ticker.findMany({
            orderBy: {
                symbol: 'asc',
            },
        })

        res.json({
            success: true,
            data: tickers,
        })
    } catch (error) {
        next(error)
    }
})

// Get seasonality data for a specific ticker
router.get('/ticker/:tickerId', async (req, res, next) => {
    try {
        const { tickerId } = req.params
        const { startDate, endDate, limit = 100 } = req.query

        // Validate tickerId
        const ticker = await prisma.ticker.findUnique({
            where: { id: parseInt(tickerId) },
        })

        if (!ticker) {
            return res.status(404).json({
                error: 'Ticker not found',
                message: `No ticker found with ID ${tickerId}`,
            })
        }

        // Build query filter
        const where = {
            tickerId: parseInt(tickerId),
        }

        if (startDate || endDate) {
            where.date = {}
            if (startDate) where.date.gte = new Date(startDate)
            if (endDate) where.date.lte = new Date(endDate)
        }

        // Get paginated data
        const data = await prisma.seasonalityData.findMany({
            where,
            orderBy: {
                date: 'asc',
            },
            take: parseInt(limit),
            include: {
                ticker: true,
            },
        })

        res.json({
            success: true,
            data: {
                ticker: ticker.symbol,
                records: data,
            },
        })
    } catch (error) {
        next(error)
    }
})

// Get aggregated data for all tickers
router.get('/aggregate', async (req, res, next) => {
    try {
        const { date } = req.query

        if (!date) {
            return res.status(400).json({
                error: 'Missing date parameter',
                message: 'Please provide a date parameter',
            })
        }

        const aggregateData = await prisma.seasonalityData.findMany({
            where: {
                date: new Date(date),
            },
            include: {
                ticker: true,
            },
            orderBy: {
                tickerId: 'asc',
            },
        })

        res.json({
            success: true,
            data: {
                date,
                records: aggregateData,
            },
        })
    } catch (error) {
        next(error)
    }
})

module.exports = router
