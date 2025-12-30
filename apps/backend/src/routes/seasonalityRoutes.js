const express = require('express');
const router = express.Router();
const seasonalityService = require('../services/seasonalityService');
const authMiddleware = require('../middleware/authMiddleware');

// Apply authentication middleware to all routes
router.use(authMiddleware);

/**
 * GET /api/seasonality/:tickerId
 * Get seasonality data for a specific ticker with optional filtering
 */
router.get('/:tickerId', async (req, res) => {
  try {
    const { tickerId } = req.params;
    const filters = req.query;

    const result = await seasonalityService.getSeasonalityData(tickerId, filters);

    if (result.success) {
      res.json({
        success: true,
        data: result.data,
        count: result.count
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error in seasonality route:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/seasonality/:tickerId/multi-timeframe
 * Get multi-timeframe data for a ticker
 */
router.get('/:tickerId/multi-timeframe', async (req, res) => {
  try {
    const { tickerId } = req.params;
    const { timeframes } = req.query;
    
    const timeframeList = timeframes ? timeframes.split(',') : ['daily', 'weekly', 'monthly', 'yearly'];

    const result = await seasonalityService.getMultiTimeframeData(tickerId, timeframeList);

    if (result.success) {
      res.json({
        success: true,
        data: result.data
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error in multi-timeframe route:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/seasonality/:tickerId/political-cycle
 * Get political cycle analysis data
 */
router.get('/:tickerId/political-cycle', async (req, res) => {
  try {
    const { tickerId } = req.params;
    const { countries } = req.query;
    
    const countryList = countries ? countries.split(',') : ['USA', 'INDIA'];

    const result = await seasonalityService.getPoliticalCycleData(tickerId, countryList);

    if (result.success) {
      res.json({
        success: true,
        data: result.data
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error in political cycle route:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * POST /api/seasonality/:tickerId/statistical
 * Get statistical analysis data
 */
router.post('/:tickerId/statistical', async (req, res) => {
  try {
    const { tickerId } = req.params;
    const { tests, significanceLevel } = req.body;
    
    const testList = tests || ['shapiro', 'jarque', 'anderson'];
    const alpha = significanceLevel || 0.05;

    const result = await seasonalityService.getStatisticalAnalysis(tickerId, testList);

    if (result.success) {
      res.json({
        success: true,
        data: result.data
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error in statistical analysis route:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/seasonality/basket/:basketId
 * Get basket analysis data
 */
router.get('/basket/:basketId', async (req, res) => {
  try {
    const { basketId } = req.params;

    const result = await seasonalityService.getBasketAnalysis(basketId);

    if (result.success) {
      res.json({
        success: true,
        data: result.data
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error in basket analysis route:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/seasonality/:tickerId/summary
 * Get summary statistics for a ticker
 */
router.get('/:tickerId/summary', async (req, res) => {
  try {
    const { tickerId } = req.params;

    const seasonalityData = await seasonalityService.getSeasonalityData(tickerId);
    
    if (!seasonalityData.success) {
      return res.status(500).json({
        success: false,
        error: seasonalityData.error
      });
    }

    const data = seasonalityData.data;
    const statistics = require('../../calculationEngine').calculateStatistics(data.map(d => d.returnPercentage));

    // Calculate additional metrics
    const totalDays = data.length;
    const positiveDays = data.filter(d => d.returnPercentage > 0).length;
    const negativeDays = data.filter(d => d.returnPercentage < 0).length;
    const zeroDays = data.filter(d => d.returnPercentage === 0).length;

    const maxReturn = Math.max(...data.map(d => d.returnPercentage));
    const minReturn = Math.min(...data.map(d => d.returnPercentage));

    // Calculate monthly performance
    const monthlyPerformance = {};
    data.forEach(item => {
      const monthKey = `${item.year}-${String(item.monthNumber).padStart(2, '0')}`;
      if (!monthlyPerformance[monthKey]) {
        monthlyPerformance[monthKey] = {
          returns: [],
          totalReturn: 0
        };
      }
      monthlyPerformance[monthKey].returns.push(item.returnPercentage);
    });

    Object.keys(monthlyPerformance).forEach(month => {
      const returns = monthlyPerformance[month].returns;
      monthlyPerformance[month].totalReturn = returns.reduce((sum, r) => sum + r, 0);
    });

    res.json({
      success: true,
      data: {
        summary: {
          totalDays,
          positiveDays,
          negativeDays,
          zeroDays,
          positivePercentage: ((positiveDays / totalDays) * 100).toFixed(2),
          negativePercentage: ((negativeDays / totalDays) * 100).toFixed(2),
          maxReturn: maxReturn.toFixed(2),
          minReturn: minReturn.toFixed(2)
        },
        statistics,
        monthlyPerformance
      }
    });
  } catch (error) {
    console.error('Error in summary route:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

module.exports = router;