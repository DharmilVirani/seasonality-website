# Backend Testing Guide

## Overview

This guide provides comprehensive instructions for testing the Seasonality SaaS backend without a frontend. It includes setup instructions, API testing tools, and validation procedures.

## 🚀 Quick Start

### 1. Environment Setup

First, ensure you have all required dependencies and environment variables:

```bash
# Navigate to backend directory
cd apps/backend

# Install dependencies
npm install

# Copy environment template
cp .env.example .env
```

### 2. Environment Variables

Update your `.env` file with the following:

```bash
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/seasonality_db"

# JWT Secret
JWT_SECRET="your-super-secret-jwt-key-here"

# Redis (optional - will use in-memory fallback if not available)
REDIS_HOST="localhost"
REDIS_PORT="6379"
REDIS_PASSWORD=""
REDIS_DB="0"

# Server Configuration
BACKEND_PORT="3001"
NODE_ENV="development"

# MinIO (optional for file uploads)
MINIO_ENDPOINT="localhost"
MINIO_PORT="9000"
MINIO_ACCESS_KEY="minioadmin"
MINIO_SECRET_KEY="minioadmin"
MINIO_USE_SSL="false"
```

### 3. Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Apply database schema (choose one option)

# Option A: Fresh database (recommended for testing)
npm run schema:reset

# Option B: Migrate existing database
npx prisma migrate dev --name initial_setup

# Option C: Push schema without migrations
npm run schema:push
```

### 4. Start the Server

```bash
# Development mode with auto-reload
npm run dev

# Or production mode
npm start
```

You should see:
```
✅ Redis connected (if Redis is available)
✅ Redis ready
🚀 Starting Complete Data Migration...
Backend server running on port 3001
Environment: development
JWT_SECRET loaded: YES ✓
```

## 🧪 Testing Methods

### Method 1: Using Postman/Insomnia (Recommended)

I'll provide a complete Postman collection below.

### Method 2: Using curl Commands

### Method 3: Using the Built-in Test Suite

### Method 4: Using Thunder Client (VS Code Extension)

## 📋 Postman Collection

Import this collection into Postman for comprehensive API testing:

```json
{
  "info": {
    "name": "Seasonality SaaS Backend API",
    "description": "Complete API collection for testing the backend",
    "version": "1.0.0"
  },
  "auth": {
    "type": "bearer",
    "bearer": [
      {
        "key": "token",
        "value": "{{jwt_token}}",
        "type": "string"
      }
    ]
  },
  "variable": [
    {
      "key": "base_url",
      "value": "http://localhost:3001",
      "type": "string"
    },
    {
      "key": "jwt_token",
      "value": "",
      "type": "string"
    }
  ],
  "item": [
    {
      "name": "Authentication",
      "item": [
        {
          "name": "Register User",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"name\": \"Test User\",\n  \"email\": \"test@example.com\",\n  \"password\": \"password123\",\n  \"role\": \"RESEARCH_TEAM\"\n}"
            },
            "url": {
              "raw": "{{base_url}}/api/auth/register",
              "host": ["{{base_url}}"],
              "path": ["api", "auth", "register"]
            }
          }
        },
        {
          "name": "Login User",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"email\": \"test@example.com\",\n  \"password\": \"password123\"\n}"
            },
            "url": {
              "raw": "{{base_url}}/api/auth/login",
              "host": ["{{base_url}}"],
              "path": ["api", "auth", "login"]
            }
          },
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "if (pm.response.code === 200) {",
                  "    const response = pm.response.json();",
                  "    pm.collectionVariables.set('jwt_token', response.token);",
                  "}"
                ]
              }
            }
          ]
        }
      ]
    },
    {
      "name": "Health Checks",
      "item": [
        {
          "name": "Basic Health Check",
          "request": {
            "method": "GET",
            "url": {
              "raw": "{{base_url}}/",
              "host": ["{{base_url}}"],
              "path": [""]
            }
          }
        },
        {
          "name": "Detailed Health Check",
          "request": {
            "method": "GET",
            "url": {
              "raw": "{{base_url}}/api/health",
              "host": ["{{base_url}}"],
              "path": ["api", "health"]
            }
          }
        },
        {
          "name": "Analysis Service Health",
          "request": {
            "method": "GET",
            "url": {
              "raw": "{{base_url}}/api/analysis/health",
              "host": ["{{base_url}}"],
              "path": ["api", "analysis", "health"]
            }
          }
        }
      ]
    },
    {
      "name": "Enhanced Upload",
      "item": [
        {
          "name": "Validate CSV Structure",
          "request": {
            "method": "POST",
            "header": [],
            "body": {
              "mode": "formdata",
              "formdata": [
                {
                  "key": "file",
                  "type": "file",
                  "src": "sample_data.csv"
                }
              ]
            },
            "url": {
              "raw": "{{base_url}}/api/upload/enhanced/validate",
              "host": ["{{base_url}}"],
              "path": ["api", "upload", "enhanced", "validate"]
            }
          }
        },
        {
          "name": "Upload Single CSV",
          "request": {
            "method": "POST",
            "header": [],
            "body": {
              "mode": "formdata",
              "formdata": [
                {
                  "key": "file",
                  "type": "file",
                  "src": "sample_data.csv"
                },
                {
                  "key": "timeframe",
                  "value": "DAILY",
                  "type": "text"
                },
                {
                  "key": "generateAllTimeframes",
                  "value": "true",
                  "type": "text"
                }
              ]
            },
            "url": {
              "raw": "{{base_url}}/api/upload/enhanced/single",
              "host": ["{{base_url}}"],
              "path": ["api", "upload", "enhanced", "single"]
            }
          }
        },
        {
          "name": "Get Upload History",
          "request": {
            "method": "GET",
            "url": {
              "raw": "{{base_url}}/api/upload/enhanced/history",
              "host": ["{{base_url}}"],
              "path": ["api", "upload", "enhanced", "history"]
            }
          }
        }
      ]
    },
    {
      "name": "Analysis",
      "item": [
        {
          "name": "Daily Analysis",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"symbolNameToPlotValue\": \"NIFTY\",\n  \"startDate\": \"2024-01-01\",\n  \"endDate\": \"2024-12-31\",\n  \"positiveNegativeDayFilter\": \"All\",\n  \"weekdayNameFilter\": [\"Monday\", \"Tuesday\", \"Wednesday\", \"Thursday\", \"Friday\"],\n  \"consecutiveDays\": 3,\n  \"trendDirection\": \"more\",\n  \"percentageThreshold\": 0,\n  \"saveResults\": true\n}"
            },
            "url": {
              "raw": "{{base_url}}/api/analysis/daily",
              "host": ["{{base_url}}"],
              "path": ["api", "analysis", "daily"]
            }
          }
        },
        {
          "name": "Weekly Analysis",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"symbolNameToPlotValue\": \"NIFTY\",\n  \"startDate\": \"2024-01-01\",\n  \"endDate\": \"2024-12-31\",\n  \"positiveNegativeMondayWeekFilter\": \"All\",\n  \"positiveNegativeExpiryWeekFilter\": \"All\",\n  \"saveResults\": false\n}"
            },
            "url": {
              "raw": "{{base_url}}/api/analysis/weekly",
              "host": ["{{base_url}}"],
              "path": ["api", "analysis", "weekly"]
            }
          }
        },
        {
          "name": "Monthly Analysis",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"symbolNameToPlotValue\": \"NIFTY\",\n  \"startDate\": \"2024-01-01\",\n  \"endDate\": \"2024-12-31\",\n  \"specificMonthSelectionValue\": 0,\n  \"entryType\": \"Open\",\n  \"exitType\": \"Close\",\n  \"tradeType\": \"Long\",\n  \"returnType\": \"Percent\"\n}"
            },
            "url": {
              "raw": "{{base_url}}/api/analysis/monthly",
              "host": ["{{base_url}}"],
              "path": ["api", "analysis", "monthly"]
            }
          }
        },
        {
          "name": "Consecutive Analysis",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"symbolNameToPlotValue\": \"NIFTY\",\n  \"trendType\": \"Bullish\",\n  \"consecutiveDays\": 3,\n  \"minimumAccuracy\": 60,\n  \"minimumTotalPnL\": 0,\n  \"minimumSampleSize\": 10,\n  \"minimumAveragePnL\": 0,\n  \"operation12\": \"AND\",\n  \"operation23\": \"AND\",\n  \"operation34\": \"AND\"\n}"
            },
            "url": {
              "raw": "{{base_url}}/api/analysis/consecutive",
              "host": ["{{base_url}}"],
              "path": ["api", "analysis", "consecutive"]
            }
          }
        },
        {
          "name": "Get Analysis History",
          "request": {
            "method": "GET",
            "url": {
              "raw": "{{base_url}}/api/analysis/history?limit=10",
              "host": ["{{base_url}}"],
              "path": ["api", "analysis", "history"],
              "query": [
                {
                  "key": "limit",
                  "value": "10"
                }
              ]
            }
          }
        }
      ]
    },
    {
      "name": "Performance & Monitoring",
      "item": [
        {
          "name": "Get Performance Metrics",
          "request": {
            "method": "GET",
            "url": {
              "raw": "{{base_url}}/api/analysis/performance",
              "host": ["{{base_url}}"],
              "path": ["api", "analysis", "performance"]
            }
          }
        },
        {
          "name": "Clear Cache",
          "request": {
            "method": "POST",
            "url": {
              "raw": "{{base_url}}/api/analysis/cache/clear",
              "host": ["{{base_url}}"],
              "path": ["api", "analysis", "cache", "clear"]
            }
          }
        }
      ]
    }
  ]
}
```

## 🔧 curl Commands for Quick Testing

### 1. Health Checks

```bash
# Basic health check
curl http://localhost:3001/

# Detailed health check
curl http://localhost:3001/api/health
```

### 2. Authentication

```bash
# Register a test user
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com", 
    "password": "password123",
    "role": "RESEARCH_TEAM"
  }'

# Login and get JWT token
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'

# Save the token from response for subsequent requests
export JWT_TOKEN="your-jwt-token-here"
```

### 3. Analysis Testing

```bash
# Daily analysis (replace JWT_TOKEN with actual token)
curl -X POST http://localhost:3001/api/analysis/daily \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "symbolNameToPlotValue": "NIFTY",
    "startDate": "2024-01-01",
    "endDate": "2024-12-31",
    "consecutiveDays": 3,
    "saveResults": true
  }'
```

## 📊 Sample Test Data

Create sample CSV files for testing uploads:

### sample_daily_data.csv
```csv
Date,Ticker,Open,High,Low,Close,Volume,OpenInterest
2024-01-01,NIFTY,21000,21200,20900,21150,1000000,0
2024-01-02,NIFTY,21150,21300,21050,21250,1200000,0
2024-01-03,NIFTY,21250,21400,21100,21180,1100000,0
2024-01-04,NIFTY,21180,21350,21080,21320,1300000,0
2024-01-05,NIFTY,21320,21450,21200,21280,1150000,0
```

### sample_weekly_data.csv
```csv
Date,Ticker,Open,High,Low,Close,Volume,OpenInterest
2024-01-01,NIFTY,21000,21500,20800,21280,5000000,0
2024-01-08,NIFTY,21280,21600,21100,21450,5200000,0
2024-01-15,NIFTY,21450,21700,21200,21380,4800000,0
2024-01-22,NIFTY,21380,21650,21150,21520,5100000,0
2024-01-29,NIFTY,21520,21800,21300,21680,5300000,0
```

## 🧪 Running Tests

### Unit and Integration Tests

```bash
# Run all tests
npm test

# Run specific test suites
npm test -- --testPathPattern=statisticsService.test.js
npm test -- --testPathPattern=serviceIntegration.test.js

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### Performance Tests

```bash
# Run performance benchmarks
npm run test:performance

# Run load tests (if implemented)
npm run test:load
```

## 🔍 Testing Checklist

### ✅ Basic Functionality

- [ ] Server starts successfully
- [ ] Database connection works
- [ ] Redis connection works (optional)
- [ ] Health endpoints respond
- [ ] Authentication works (register/login)

### ✅ Upload Functionality

- [ ] CSV validation works
- [ ] Single file upload processes
- [ ] Batch upload processes
- [ ] Upload history retrieves correctly
- [ ] Error handling works for invalid files

### ✅ Analysis Functionality

- [ ] Daily analysis completes
- [ ] Weekly analysis completes
- [ ] Monthly analysis completes
- [ ] Yearly analysis completes
- [ ] Consecutive analysis completes
- [ ] Analysis history retrieves correctly

### ✅ Performance & Monitoring

- [ ] Performance metrics are tracked
- [ ] Cache operations work
- [ ] Service health monitoring works
- [ ] Error rates are acceptable (<1%)
- [ ] Response times meet targets (<500ms)

## 🐛 Troubleshooting

### Common Issues

#### 1. Database Connection Issues

```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Check database exists
psql -U username -d seasonality_db -c "\dt"

# Reset database if needed
npm run schema:reset
```

#### 2. Redis Connection Issues

```bash
# Check if Redis is running
redis-cli ping

# If Redis is not available, the app will use in-memory fallback
# Check logs for: "Redis connected" vs "Cache service running without Redis"
```

#### 3. JWT Token Issues

```bash
# Make sure JWT_SECRET is set in .env
echo $JWT_SECRET

# Re-login to get fresh token if expired
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}'
```

#### 4. File Upload Issues

```bash
# Check file permissions
ls -la sample_data.csv

# Check file format (must be valid CSV)
head -5 sample_data.csv

# Check file size (must be < 50MB)
du -h sample_data.csv
```

#### 5. Analysis Errors

```bash
# Check if ticker exists in database
curl -H "Authorization: Bearer $JWT_TOKEN" \
  "http://localhost:3001/api/data/tickers"

# Upload sample data first if no tickers exist
curl -X POST http://localhost:3001/api/upload/enhanced/single \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -F "file=@sample_daily_data.csv" \
  -F "timeframe=DAILY"
```

## 📈 Performance Monitoring

### Real-time Monitoring

```bash
# Monitor server logs
tail -f logs/app.log

# Monitor system resources
htop

# Monitor database connections
psql -U username -d seasonality_db -c "SELECT * FROM pg_stat_activity;"

# Monitor Redis (if available)
redis-cli monitor
```

### Performance Metrics

Check these endpoints regularly:

```bash
# Service health
curl -H "Authorization: Bearer $JWT_TOKEN" \
  http://localhost:3001/api/analysis/health

# Performance metrics
curl -H "Authorization: Bearer $JWT_TOKEN" \
  http://localhost:3001/api/analysis/performance
```

## 🚀 Load Testing

For load testing, you can use tools like:

### Using Apache Bench (ab)

```bash
# Install ab
sudo apt-get install apache2-utils

# Test health endpoint
ab -n 1000 -c 10 http://localhost:3001/api/health

# Test authenticated endpoint (with JWT)
ab -n 100 -c 5 -H "Authorization: Bearer $JWT_TOKEN" \
  http://localhost:3001/api/analysis/history
```

### Using Artillery

```bash
# Install artillery
npm install -g artillery

# Create artillery config (artillery.yml)
# Run load test
artillery run artillery.yml
```

## 📝 Test Results Documentation

Document your test results:

### Expected Response Times
- Health checks: < 50ms
- Authentication: < 200ms
- Simple analysis: < 500ms
- Complex analysis: < 2000ms
- File upload: < 30s for typical files

### Expected Success Rates
- Health endpoints: 100%
- Authentication: 99%+
- Analysis operations: 95%+
- File uploads: 90%+ (depends on data quality)

## 🎯 Next Steps

After successful backend testing:

1. **Performance Optimization**
   - Identify bottlenecks from metrics
   - Optimize slow queries
   - Tune cache settings

2. **Production Preparation**
   - Set up monitoring dashboards
   - Configure log aggregation
   - Set up automated backups

3. **Frontend Integration**
   - Document API contracts
   - Provide OpenAPI/Swagger documentation
   - Set up CORS for frontend domain

4. **Deployment**
   - Containerize with Docker
   - Set up CI/CD pipelines
   - Configure production environment

This comprehensive testing approach ensures your backend is robust, performant, and ready for production use!