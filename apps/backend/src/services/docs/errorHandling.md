# Statistics Service Error Handling Documentation

## Overview

The StatisticsService implements comprehensive error handling to ensure robust operation in production environments. This document outlines error types, handling strategies, and recovery mechanisms.

## Error Categories

### 1. Input Validation Errors

#### Invalid Data Types
```javascript
// Error: Input must be an array of numbers
statisticsService.getDataTableStatistics("invalid string");
statisticsService.getDataTableStatistics(null);
statisticsService.getDataTableStatistics(undefined);
```

**Error Message:** `"Input must be an array of numbers"`
**Recovery:** Validate input type before calling methods

#### Empty Arrays
```javascript
// Handled gracefully - returns zero statistics
const result = statisticsService.getDataTableStatistics([]);
// Returns: { 'All Count': 0, 'Avg Return All': 0, ... }
```

**Behavior:** Returns valid statistics object with zero values
**Recovery:** No error thrown, safe to continue processing

#### Arrays with Invalid Values
```javascript
// Filters out invalid values automatically
const data = [1, 2, null, undefined, NaN, "string", 3, 4];
const result = statisticsService.getDataTableStatistics(data);
// Processes only: [1, 2, 3, 4]
```

**Behavior:** Invalid values are filtered out, valid numbers are processed
**Recovery:** Automatic filtering, warning logged

### 2. Mathematical Errors

#### Division by Zero
```javascript
// Handled by decimal.js precision
const result = statisticsService.getDataTableStatistics([0, 0, 0]);
// Returns valid statistics with zero averages
```

**Behavior:** Returns 0 for averages when no valid data exists
**Recovery:** Automatic handling, no error thrown

#### Overflow/Underflow
```javascript
// Very large numbers handled by decimal.js
const largeNumbers = [1e20, -1e20, 1e21];
const result = statisticsService.getDataTableStatistics(largeNumbers);
// Processes correctly with high precision
```

**Behavior:** Decimal.js handles arbitrary precision
**Recovery:** Automatic precision management

#### Floating Point Precision Issues
```javascript
// Classic floating point issue resolved
const precisionTest = [0.1, 0.2, 0.3, -0.1, -0.2, -0.3];
const result = statisticsService.getDataTableStatistics(precisionTest);
// Sum Return All: exactly 0.0 (not 5.551115123125783e-17)
```

**Behavior:** Exact decimal arithmetic prevents precision errors
**Recovery:** Automatic precision correction

### 3. Date and Time Errors

#### Invalid Date Formats
```javascript
// getTrendingDays with invalid dates
const invalidData = [
  { Date: 'invalid-date', Close: 100, ReturnPercentage: 1.5 }
];

try {
  const result = statisticsService.getTrendingDays(invalidData, 3, 'more', 1.0, 1, 1, 1);
} catch (error) {
  console.error('Date parsing error:', error.message);
}
```

**Error Message:** `"Invalid date format in data"`
**Recovery:** Validate date formats before processing

#### Date Range Issues
```javascript
// Leap year and month boundary handling
const result = statisticsService.getRecentMonthReturnPercentage(data, 13);
// Handles year transitions correctly
```

**Behavior:** Robust date arithmetic using date-fns
**Recovery:** Automatic date boundary handling

### 4. Memory and Performance Errors

#### Large Dataset Memory Issues
```javascript
// Monitor memory usage for large datasets
const largeDataset = new Array(1000000).fill(0).map(() => Math.random());

try {
  const result = statisticsService.getDataTableStatistics(largeDataset);
  const metrics = statisticsService.getPerformanceMetrics();
  
  if (metrics.memoryUsage.heapUsed > 500) { // 500MB threshold
    console.warn('High memory usage detected:', metrics.memoryUsage);
  }
} catch (error) {
  if (error.message.includes('out of memory')) {
    console.error('Memory limit exceeded, consider batch processing');
  }
}
```

**Error Message:** `"JavaScript heap out of memory"`
**Recovery:** Implement batch processing for large datasets

#### Performance Timeout
```javascript
// Set execution timeout for long-running operations
const timeout = setTimeout(() => {
  throw new Error('Operation timeout - execution taking too long');
}, 30000); // 30 second timeout

try {
  const result = statisticsService.getNConsecutiveSequanceIndexFromList(
    largeDataTable, 'Bullish', 10, 60.0, 2.0, 100, 0.5, 'AND', 'OR', 'AND'
  );
  clearTimeout(timeout);
} catch (error) {
  clearTimeout(timeout);
  console.error('Performance error:', error.message);
}
```

### 5. Configuration Errors

#### Invalid Parameters
```javascript
// Invalid trend type
try {
  const result = statisticsService.getNConsecutiveSequanceIndexFromList(
    dataTable, 'InvalidTrend', 3, 60.0, 2.0, 100, 0.5, 'AND', 'OR', 'AND'
  );
} catch (error) {
  console.error('Configuration error:', error.message);
}
```

**Error Message:** `"trendTypeValue must be 'Bullish' or 'Bearish'"`
**Recovery:** Validate parameters before method calls

#### Out of Range Values
```javascript
// Negative consecutive days
try {
  const result = statisticsService.getTrendingDays(data, -1, 'more', 1.0, 1, 1, 1);
} catch (error) {
  console.error('Parameter error:', error.message);
}
```

**Error Message:** `"nTrades must be a positive integer"`
**Recovery:** Parameter validation and sanitization

## Error Handling Patterns

### 1. Try-Catch Wrapper
```javascript
function safeStatisticsCalculation(data) {
  try {
    // Validate input
    if (!Array.isArray(data)) {
      throw new Error('Data must be an array');
    }
    
    if (data.length === 0) {
      return { error: 'No data provided', statistics: null };
    }
    
    // Calculate statistics
    const statistics = statisticsService.getDataTableStatistics(data);
    const consecutive = statisticsService.maximumConsecutiveValues(data);
    
    return {
      success: true,
      statistics,
      consecutive,
      metadata: {
        recordCount: data.length,
        timestamp: new Date().toISOString()
      }
    };
    
  } catch (error) {
    console.error('Statistics calculation failed:', error);
    
    return {
      success: false,
      error: error.message,
      statistics: null,
      metadata: {
        timestamp: new Date().toISOString(),
        inputType: typeof data,
        inputLength: Array.isArray(data) ? data.length : 0
      }
    };
  }
}
```

### 2. Input Sanitization
```javascript
function sanitizeReturnData(rawData) {
  if (!Array.isArray(rawData)) {
    throw new Error('Input must be an array');
  }
  
  const sanitized = rawData
    .filter(value => value !== null && value !== undefined)
    .map(value => {
      const num = parseFloat(value);
      if (isNaN(num) || !isFinite(num)) {
        return null;
      }
      return num;
    })
    .filter(value => value !== null);
  
  if (sanitized.length === 0) {
    throw new Error('No valid numeric data found');
  }
  
  return sanitized;
}
```

### 3. Graceful Degradation
```javascript
function robustTrendAnalysis(data, config) {
  const results = {
    statistics: null,
    consecutive: null,
    trending: null,
    errors: []
  };
  
  // Try statistics calculation
  try {
    results.statistics = statisticsService.getDataTableStatistics(data);
  } catch (error) {
    results.errors.push(`Statistics: ${error.message}`);
  }
  
  // Try consecutive analysis
  try {
    results.consecutive = statisticsService.maximumConsecutiveValues(data);
  } catch (error) {
    results.errors.push(`Consecutive: ${error.message}`);
  }
  
  // Try trending analysis (more complex, higher failure risk)
  try {
    if (config.enableTrending && data.length > 0) {
      results.trending = statisticsService.getTrendingDays(
        data, config.nTrades, config.opt, config.percentChange,
        config.nweek, config.nmonth, config.nyear
      );
    }
  } catch (error) {
    results.errors.push(`Trending: ${error.message}`);
  }
  
  return results;
}
```

### 4. Circuit Breaker Pattern
```javascript
class StatisticsCircuitBreaker {
  constructor(failureThreshold = 5, resetTimeout = 60000) {
    this.failureCount = 0;
    this.failureThreshold = failureThreshold;
    this.resetTimeout = resetTimeout;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.nextAttempt = Date.now();
  }
  
  async execute(operation) {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker is OPEN');
      }
      this.state = 'HALF_OPEN';
    }
    
    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  onSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }
  
  onFailure() {
    this.failureCount++;
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.resetTimeout;
    }
  }
}

// Usage
const circuitBreaker = new StatisticsCircuitBreaker();

async function protectedStatisticsCall(data) {
  return circuitBreaker.execute(() => {
    return statisticsService.getDataTableStatistics(data);
  });
}
```

## Monitoring and Logging

### 1. Error Metrics Collection
```javascript
class StatisticsErrorMonitor {
  constructor() {
    this.errorCounts = new Map();
    this.errorHistory = [];
  }
  
  recordError(operation, error) {
    const errorType = error.constructor.name;
    const key = `${operation}:${errorType}`;
    
    this.errorCounts.set(key, (this.errorCounts.get(key) || 0) + 1);
    
    this.errorHistory.push({
      timestamp: new Date().toISOString(),
      operation,
      errorType,
      message: error.message,
      stack: error.stack
    });
    
    // Keep only last 1000 errors
    if (this.errorHistory.length > 1000) {
      this.errorHistory.shift();
    }
  }
  
  getErrorSummary() {
    return {
      totalErrors: this.errorHistory.length,
      errorsByType: Object.fromEntries(this.errorCounts),
      recentErrors: this.errorHistory.slice(-10)
    };
  }
}
```

### 2. Health Check Endpoint
```javascript
function createHealthCheck(statisticsService, errorMonitor) {
  return async (req, res) => {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      checks: {}
    };
    
    try {
      // Test basic functionality
      const testData = [1, -1, 2, -2];
      const testResult = statisticsService.getDataTableStatistics(testData);
      
      health.checks.basicCalculation = {
        status: 'pass',
        responseTime: 'fast'
      };
      
      // Check performance metrics
      const metrics = statisticsService.getPerformanceMetrics();
      health.checks.performance = {
        status: metrics.averageExecutionTime < 1000 ? 'pass' : 'warn',
        averageExecutionTime: metrics.averageExecutionTime,
        memoryUsage: metrics.memoryUsage
      };
      
      // Check error rates
      const errorSummary = errorMonitor.getErrorSummary();
      health.checks.errorRate = {
        status: errorSummary.totalErrors < 100 ? 'pass' : 'warn',
        totalErrors: errorSummary.totalErrors
      };
      
    } catch (error) {
      health.status = 'unhealthy';
      health.checks.basicCalculation = {
        status: 'fail',
        error: error.message
      };
    }
    
    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
  };
}
```

## Best Practices

### 1. Input Validation
- Always validate input types and ranges
- Sanitize data before processing
- Provide clear error messages
- Log validation failures for monitoring

### 2. Resource Management
- Monitor memory usage for large datasets
- Implement timeouts for long operations
- Use streaming algorithms when possible
- Clean up resources in finally blocks

### 3. Error Recovery
- Implement graceful degradation
- Provide fallback values when appropriate
- Use circuit breakers for external dependencies
- Cache results to avoid recomputation

### 4. Monitoring
- Track error rates and types
- Monitor performance metrics
- Set up alerts for critical failures
- Maintain error history for debugging

### 5. Testing
- Test error conditions explicitly
- Validate error messages and codes
- Test recovery mechanisms
- Include edge cases in test suites

## Production Deployment Considerations

1. **Error Alerting**: Set up monitoring for error rates exceeding thresholds
2. **Resource Limits**: Configure memory and CPU limits for containers
3. **Graceful Shutdown**: Handle SIGTERM signals to complete in-flight calculations
4. **Health Checks**: Implement readiness and liveness probes
5. **Logging**: Use structured logging for error analysis
6. **Metrics**: Export error metrics to monitoring systems (Prometheus, etc.)

This comprehensive error handling ensures the StatisticsService operates reliably in production environments while providing clear feedback for debugging and monitoring.