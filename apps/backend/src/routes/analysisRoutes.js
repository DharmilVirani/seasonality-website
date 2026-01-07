/**
 * Analysis Routes - Integrated Analysis API Endpoints
 * 
 * Provides comprehensive analysis endpoints using the integrated service layer
 * Implements request validation, error handling, and performance monitoring
 * 
 * @author Seasonality SaaS Team
 * @version 1.0.0
 */

const express = require('express');
const rateLimit = require('express-rate-limit');
const AnalysisService = require('../services/analysisService');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { validateAnalysisRequest } = require('../middleware/validation');

const router = express.Router();
const analysisService = new AnalysisService();

// Rate limiting for analysis endpoints
const analysisRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // Limit each IP to 50 requests per windowMs
    message: {
        error: 'Too many analysis requests, please try again later',
        retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Apply rate limiting to all analysis routes
router.use(analysisRateLimit);

/**
 * POST /api/analysis/daily
 * Perform daily analysis with filters
 */
router.post('/daily',
    authenticateToken,
    validateAnalysisRequest,
    async (req, res) => {
        const startTime = Date.now();

        try {
            const analysisParams = {
                ...req.body,
                userId: req.user.id
            };

            const result = await analysisService.performDailyAnalysis(analysisParams);

            // Save results if requested
            if (req.body.saveResults) {
                await analysisService.saveAnalysisResults(result, req.user.id);
            }

            res.json({
                success: true,
                data: result,
                metadata: {
                    ...result.metadata,
                    requestTime: new Date().toISOString(),
                    userId: req.user.id
                }
            });

        } catch (error) {
            console.error('Daily analysis error:', error);
            res.status(500).json({
                success: false,
                error: 'Daily analysis failed',
                message: error.message,
                executionTime: Date.now() - startTime
            });
        }
    }
);

/**
 * POST /api/analysis/weekly
 * Perform weekly analysis (Monday + Expiry)
 */
router.post('/weekly',
    authenticateToken,
    validateAnalysisRequest,
    async (req, res) => {
        const startTime = Date.now();

        try {
            const analysisParams = {
                ...req.body,
                userId: req.user.id
            };

            const result = await analysisService.performWeeklyAnalysis(analysisParams);

            if (req.body.saveResults) {
                await analysisService.saveAnalysisResults(result, req.user.id);
            }

            res.json({
                success: true,
                data: result,
                metadata: {
                    ...result.metadata,
                    requestTime: new Date().toISOString(),
                    userId: req.user.id
                }
            });

        } catch (error) {
            console.error('Weekly analysis error:', error);
            res.status(500).json({
                success: false,
                error: 'Weekly analysis failed',
                message: error.message,
                executionTime: Date.now() - startTime
            });
        }
    }
);

/**
 * POST /api/analysis/monthly
 * Perform monthly analysis with seasonal patterns
 */
router.post('/monthly',
    authenticateToken,
    validateAnalysisRequest,
    async (req, res) => {
        const startTime = Date.now();

        try {
            const analysisParams = {
                ...req.body,
                userId: req.user.id
            };

            const result = await analysisService.performMonthlyAnalysis(analysisParams);

            if (req.body.saveResults) {
                await analysisService.saveAnalysisResults(result, req.user.id);
            }

            res.json({
                success: true,
                data: result,
                metadata: {
                    ...result.metadata,
                    requestTime: new Date().toISOString(),
                    userId: req.user.id
                }
            });

        } catch (error) {
            console.error('Monthly analysis error:', error);
            res.status(500).json({
                success: false,
                error: 'Monthly analysis failed',
                message: error.message,
                executionTime: Date.now() - startTime
            });
        }
    }
);

/**
 * POST /api/analysis/yearly
 * Perform yearly analysis with decade patterns
 */
router.post('/yearly',
    authenticateToken,
    validateAnalysisRequest,
    async (req, res) => {
        const startTime = Date.now();

        try {
            const analysisParams = {
                ...req.body,
                userId: req.user.id
            };

            const result = await analysisService.performYearlyAnalysis(analysisParams);

            if (req.body.saveResults) {
                await analysisService.saveAnalysisResults(result, req.user.id);
            }

            res.json({
                success: true,
                data: result,
                metadata: {
                    ...result.metadata,
                    requestTime: new Date().toISOString(),
                    userId: req.user.id
                }
            });

        } catch (error) {
            console.error('Yearly analysis error:', error);
            res.status(500).json({
                success: false,
                error: 'Yearly analysis failed',
                message: error.message,
                executionTime: Date.now() - startTime
            });
        }
    }
);

/**
 * POST /api/analysis/election
 * Perform election and scenario analysis
 */
router.post('/election',
    authenticateToken,
    requireRole(['ADMIN', 'RESEARCH_TEAM']),
    validateAnalysisRequest,
    async (req, res) => {
        const startTime = Date.now();

        try {
            const analysisParams = {
                ...req.body,
                userId: req.user.id
            };

            const result = await analysisService.performElectionAnalysis(analysisParams);

            if (req.body.saveResults) {
                await analysisService.saveAnalysisResults(result, req.user.id);
            }

            res.json({
                success: true,
                data: result,
                metadata: {
                    ...result.metadata,
                    requestTime: new Date().toISOString(),
                    userId: req.user.id
                }
            });

        } catch (error) {
            console.error('Election analysis error:', error);
            res.status(500).json({
                success: false,
                error: 'Election analysis failed',
                message: error.message,
                executionTime: Date.now() - startTime
            });
        }
    }
);

/**
 * POST /api/analysis/consecutive
 * Perform complex consecutive analysis
 */
router.post('/consecutive',
    authenticateToken,
    validateAnalysisRequest,
    async (req, res) => {
        const startTime = Date.now();

        try {
            const analysisParams = {
                ...req.body,
                userId: req.user.id
            };

            const result = await analysisService.performConsecutiveAnalysis(analysisParams);

            if (req.body.saveResults) {
                await analysisService.saveAnalysisResults(result, req.user.id);
            }

            res.json({
                success: true,
                data: result,
                metadata: {
                    ...result.metadata,
                    requestTime: new Date().toISOString(),
                    userId: req.user.id
                }
            });

        } catch (error) {
            console.error('Consecutive analysis error:', error);
            res.status(500).json({
                success: false,
                error: 'Consecutive analysis failed',
                message: error.message,
                executionTime: Date.now() - startTime
            });
        }
    }
);

/**
 * GET /api/analysis/history
 * Get analysis history for user
 */
router.get('/history',
    authenticateToken,
    async (req, res) => {
        try {
            const filters = {
                userId: req.user.id,
                analysisType: req.query.analysisType,
                status: req.query.status,
                startDate: req.query.startDate,
                endDate: req.query.endDate,
                limit: parseInt(req.query.limit) || 50
            };

            const history = await analysisService.getAnalysisHistory(filters);

            res.json({
                success: true,
                data: history,
                metadata: {
                    totalResults: history.length,
                    filters: filters,
                    requestTime: new Date().toISOString()
                }
            });

        } catch (error) {
            console.error('Analysis history error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch analysis history',
                message: error.message
            });
        }
    }
);

/**
 * GET /api/analysis/health
 * Get analysis service health status
 */
router.get('/health',
    authenticateToken,
    requireRole(['ADMIN']),
    async (req, res) => {
        try {
            const healthStatus = await analysisService.getHealthStatus();

            res.json({
                success: true,
                data: healthStatus,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Health check error:', error);
            res.status(500).json({
                success: false,
                error: 'Health check failed',
                message: error.message
            });
        }
    }
);

/**
 * GET /api/analysis/performance
 * Get analysis performance metrics
 */
router.get('/performance',
    authenticateToken,
    requireRole(['ADMIN']),
    async (req, res) => {
        try {
            const performanceMetrics = {
                analysis: analysisService.performanceMetrics,
                statistics: analysisService.statisticsService.getPerformanceMetrics(),
                dataQuery: analysisService.dataQueryService.getPerformanceMetrics(),
                calculation: analysisService.calculationEngine.getPerformanceMetrics(),
                cache: analysisService.cacheService.getPerformanceMetrics()
            };

            res.json({
                success: true,
                data: performanceMetrics,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Performance metrics error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch performance metrics',
                message: error.message
            });
        }
    }
);

/**
 * POST /api/analysis/cache/clear
 * Clear analysis cache (admin only)
 */
router.post('/cache/clear',
    authenticateToken,
    requireRole(['ADMIN']),
    async (req, res) => {
        try {
            await analysisService.cacheService.clear();

            res.json({
                success: true,
                message: 'Analysis cache cleared successfully',
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Cache clear error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to clear cache',
                message: error.message
            });
        }
    }
);

/**
 * Error handling middleware for analysis routes
 */
router.use((error, req, res, next) => {
    console.error('Analysis route error:', error);

    // Handle specific error types
    if (error.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            error: 'Validation failed',
            details: error.details
        });
    }

    if (error.name === 'UnauthorizedError') {
        return res.status(401).json({
            success: false,
            error: 'Unauthorized access'
        });
    }

    // Generic error response
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred'
    });
});

module.exports = router;