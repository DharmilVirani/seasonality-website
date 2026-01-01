/**
 * Delete Ticker Routes
 * Handles deletion of ticker data from Ticker and SeasonalityData tables
 */

const express = require('express')
const router = express.Router()
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

/**
 * Delete ticker and all associated data
 * DELETE /api/ticker/:tickerId
 *
 * This endpoint:
 * 1. Finds the ticker by ID
 * 2. Deletes all SeasonalityData rows for that ticker
 * 3. Deletes the ticker from Ticker table
 * 4. Resets the auto-increment sequence if needed
 */
router.delete('/:tickerId', async (req, res, next) => {
    try {
        const { tickerId } = req.params

        // Validate tickerId
        const id = parseInt(tickerId)
        if (isNaN(id)) {
            return res.status(400).json({
                error: 'Invalid ticker ID',
                message: 'Please provide a valid numeric ticker ID',
            })
        }

        // Check if ticker exists
        const ticker = await prisma.ticker.findUnique({
            where: { id },
        })

        if (!ticker) {
            return res.status(404).json({
                error: 'Ticker not found',
                message: `No ticker found with ID ${tickerId}`,
            })
        }

        // Start a transaction to ensure data consistency
        const result = await prisma.$transaction(async (tx) => {
            // 1. Delete all SeasonalityData for this ticker
            const deletedSeasonalityData = await tx.seasonalityData.deleteMany({
                where: { tickerId: id },
            })

            // 2. Delete the ticker
            const deletedTicker = await tx.ticker.delete({
                where: { id },
            })

            // 3. Reset the auto-increment sequence
            // Get the maximum remaining ID
            const maxTicker = await tx.ticker.findFirst({
                orderBy: { id: 'desc' },
            })

            const nextId = maxTicker ? maxTicker.id + 1 : 1

            // Reset the sequence to the next available ID
            await tx.$executeRaw`
                SELECT setval(pg_get_serial_sequence('"Ticker"', 'id'), ${nextId}, true)
            `

            // Also reset SeasonalityData sequence if needed
            const maxSeasonalityData = await tx.seasonalityData.findFirst({
                orderBy: { id: 'desc' },
            })

            const nextSeasonalityId = maxSeasonalityData ? maxSeasonalityData.id + 1 : 1

            await tx.$executeRaw`
                SELECT setval(pg_get_serial_sequence('"SeasonalityData"', 'id'), ${nextSeasonalityId}, true)
            `

            return {
                deletedTicker,
                deletedSeasonalityDataCount: deletedSeasonalityData.count,
                nextTickerId: nextId,
                nextSeasonalityDataId: nextSeasonalityId,
            }
        })

        res.json({
            success: true,
            message: `Ticker ${ticker.symbol} and ${result.deletedSeasonalityDataCount} associated data records deleted successfully`,
            data: {
                deletedTicker: {
                    id: result.deletedTicker.id,
                    symbol: result.deletedTicker.symbol,
                },
                deletedSeasonalityDataCount: result.deletedSeasonalityDataCount,
                sequences: {
                    nextTickerId: result.nextTickerId,
                    nextSeasonalityDataId: result.nextSeasonalityDataId,
                },
            },
        })
    } catch (error) {
        console.error('Error deleting ticker:', error)
        next(error)
    }
})

/**
 * Delete ticker by symbol
 * DELETE /api/ticker/symbol/:symbol
 *
 * Alternative endpoint to delete ticker by symbol instead of ID
 */
router.delete('/symbol/:symbol', async (req, res, next) => {
    try {
        const { symbol } = req.params

        if (!symbol || typeof symbol !== 'string') {
            return res.status(400).json({
                error: 'Invalid symbol',
                message: 'Please provide a valid ticker symbol',
            })
        }

        // Check if ticker exists
        const ticker = await prisma.ticker.findUnique({
            where: { symbol: symbol.toUpperCase() },
        })

        if (!ticker) {
            return res.status(404).json({
                error: 'Ticker not found',
                message: `No ticker found with symbol ${symbol}`,
            })
        }

        // Use the ID-based deletion endpoint
        req.params.tickerId = ticker.id.toString()
        return router.handle(req, res, next)
    } catch (error) {
        console.error('Error deleting ticker by symbol:', error)
        next(error)
    }
})

/**
 * Get ticker deletion preview
 * GET /api/ticker/:tickerId/preview
 *
 * Preview what will be deleted without actually deleting
 */
router.get('/:tickerId/preview', async (req, res, next) => {
    try {
        const { tickerId } = req.params

        // Validate tickerId
        const id = parseInt(tickerId)
        if (isNaN(id)) {
            return res.status(400).json({
                error: 'Invalid ticker ID',
                message: 'Please provide a valid numeric ticker ID',
            })
        }

        // Get ticker info
        const ticker = await prisma.ticker.findUnique({
            where: { id },
            include: {
                _count: {
                    select: { seasonalityData: true },
                },
            },
        })

        if (!ticker) {
            return res.status(404).json({
                error: 'Ticker not found',
                message: `No ticker found with ID ${tickerId}`,
            })
        }

        // Get some sample seasonality data
        const sampleSeasonalityData = await prisma.seasonalityData.findMany({
            where: { tickerId: id },
            take: 5,
            orderBy: { date: 'desc' },
        })

        res.json({
            success: true,
            data: {
                ticker: {
                    id: ticker.id,
                    symbol: ticker.symbol,
                    createdAt: ticker.createdAt,
                    updatedAt: ticker.updatedAt,
                },
                willDelete: {
                    ticker: 1,
                    seasonalityData: ticker._count.seasonalityData,
                },
                sampleSeasonalityData,
            },
        })
    } catch (error) {
        console.error('Error getting deletion preview:', error)
        next(error)
    }
})

module.exports = router
