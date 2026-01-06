# Quick Start Testing Guide

## 🚀 Complete Backend Testing Setup

This guide will get you up and running with the complete backend testing environment in minutes.

## Prerequisites

- Node.js 16+ installed
- PostgreSQL database running
- Redis (optional, but recommended)
- Git

## Step 1: Environment Setup

### 1.1 Clone and Install Dependencies

```bash
# Navigate to backend directory
cd apps/backend

# Install all dependencies
npm install
```

### 1.2 Environment Configuration

Create your `.env` file:

```bash
# Copy the example environment file
cp .env.example .env
```

Update `.env` with your settings:

```bash
# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/seasonality_db"

# JWT Secret (use a strong secret in production)
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"

# Server Configuration
BACKEND_PORT="3001"
NODE_ENV="development"

# Redis Configuration (optional)
REDIS_HOST="localhost"
REDIS_PORT="6379"
REDIS_PASSWORD=""
REDIS_DB="0"

# MinIO Configuration (optional)
MINIO_ENDPOINT="localhost"
MINIO_PORT="9000"
MINIO_ACCESS_KEY="minioadmin"
MINIO_SECRET_KEY="minioadmin"
MINIO_USE_SSL="false"
```

## Step 2: Database Setup

### 2.1 Create Database

```bash
# Create PostgreSQL database
createdb seasonality_db

# Or using psql
psql -c "CREATE DATABASE seasonality_db;"
```

### 2.2 Apply Schema

Choose one of these options:

**Option A: Fresh Setup (Recommended for Testing)**
```bash
npm run schema:reset
```

**Option B: Migration-based Setup**
```bash
npx prisma migrate dev --name initial_setup
```

**Option C: Direct Schema Push**
```bash
npm run schema:push
```

### 2.3 Generate Prisma Client

```bash
npm run db:generate
```

## Step 3: Test Environment Setup

### 3.1 Setup Test Environment

```bash
# Setup with sample data
npm run test:setup:full
```

This will:
- ✅ Validate environment
- ✅ Reset database
- ✅ Create test users
- ✅ Create sample tickers (NIFTY, BANKNIFTY, etc.)
- ✅ Generate sample market data
- ✅ Create special days and election dates

### 3.2 Verify Setup

```bash
# Validate setup
npm run test:setup
```

## Step 4: Start the Server

```bash
# Start in development mode
npm run dev
```

You should see:
```
✅ Redis connected
✅ Redis ready
Backend server running on port 3001
Environment: development
JWT_SECRET loaded: YES ✓
```

## Step 5: Run Tests

### 5.1 Quick Smoke Tests

```bash
# Run quick tests (health checks, basic functionality)
npm run test:backend:quick
```

### 5.2 Complete Test Suite

```bash
# Run all tests
npm run test:backend
```

### 5.3 Specific Test Categories

```bash
# Test authentication only
node scripts/test-backend.js --auth

# Test upload functionality
node scripts/test-backend.js --upload

# Test analysis functionality
node scripts/test-backend.js --analysis

# Test performance endpoints
node scripts/test-backend.js --performance
```

## Step 6: Manual API Testing

### 6.1 Using curl

```bash
# Health check
curl http://localhost:3001/

# Register user
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "password123",
    "role": "RESEARCH_TEAM"
  }'

# Login and get token
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'

# Save the JWT token from the response
export JWT_TOKEN="your-jwt-token-here"

# Test analysis
curl -X POST http://localhost:3001/api/analysis/daily \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "symbolNameToPlotValue": "NIFTY",
    "startDate": "2024-01-01",
    "endDate": "2024-01-31"
  }'
```

### 6.2 Using Postman

1. Import the Postman collection from `BACKEND_TESTING_GUIDE.md`
2. Set the `base_url` variable to `http://localhost:3001`
3. Run the "Login User" request to get JWT token
4. Test other endpoints

## Step 7: Upload Testing

### 7.1 Test CSV Upload

```bash
# Upload sample data
curl -X POST http://localhost:3001/api/upload/enhanced/single \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -F "file=@test-data/sample_daily_data.csv" \
  -F "timeframe=DAILY" \
  -F "generateAllTimeframes=true"
```

### 7.2 Validate CSV Structure

```bash
# Validate CSV without uploading
curl -X POST http://localhost:3001/api/upload/enhanced/validate \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -F "file=@test-data/sample_daily_data.csv"
```

## Step 8: Analysis Testing

### 8.1 Daily Analysis

```bash
curl -X POST http://localhost:3001/api/analysis/daily \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "symbolNameToPlotValue": "NIFTY",
    "startDate": "2024-01-01",
    "endDate": "2024-01-31",
    "consecutiveDays": 3,
    "weekdayNameFilter": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
  }'
```

### 8.2 Weekly Analysis

```bash
curl -X POST http://localhost:3001/api/analysis/weekly \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "symbolNameToPlotValue": "NIFTY",
    "startDate": "2024-01-01",
    "endDate": "2024-01-31"
  }'
```

## Step 9: Performance Monitoring

### 9.1 Check Service Health

```bash
curl -H "Authorization: Bearer $JWT_TOKEN" \
  http://localhost:3001/api/analysis/health
```

### 9.2 Get Performance Metrics

```bash
curl -H "Authorization: Bearer $JWT_TOKEN" \
  http://localhost:3001/api/analysis/performance
```

## Step 10: Troubleshooting

### Common Issues and Solutions

#### 1. Database Connection Error

```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Check database exists
psql -l | grep seasonality

# Recreate database if needed
dropdb seasonality_db
createdb seasonality_db
npm run schema:reset
```

#### 2. Redis Connection Error

```bash
# Check if Redis is running
redis-cli ping

# If Redis is not available, the app will still work with in-memory fallback
# Look for this message in logs: "Cache service running without Redis"
```

#### 3. JWT Token Issues

```bash
# Make sure JWT_SECRET is set
echo $JWT_SECRET

# If empty, add to .env file:
echo 'JWT_SECRET="your-secret-key-here"' >> .env

# Restart server
npm run dev
```

#### 4. Port Already in Use

```bash
# Check what's using port 3001
lsof -i :3001

# Kill the process or change port in .env
echo 'BACKEND_PORT="3002"' >> .env
```

#### 5. Missing Dependencies

```bash
# Reinstall all dependencies
rm -rf node_modules package-lock.json
npm install
```

## Expected Test Results

### Successful Test Output

```
🚀 Starting Backend Testing Suite
📍 Testing server at: http://localhost:3001
============================================================

🔍 Checking server health...
✅ Server is running

🔐 Testing Authentication...
✅ User registration successful
✅ User login successful

🏥 Testing Health Endpoints...
✅ Basic health check passed
✅ Analysis service health check passed

📤 Testing Upload Functionality...
✅ CSV validation successful
✅ Single file upload successful
✅ Upload history retrieval successful

📊 Testing Analysis Functionality...
✅ Daily analysis successful
✅ Weekly analysis successful
✅ Analysis history retrieval successful

⚡ Testing Performance Endpoints...
✅ Performance metrics retrieval successful
✅ Cache clear successful

============================================================
📋 TEST SUMMARY
============================================================
Total Tests: 12
✅ Passed: 12
❌ Failed: 0
Success Rate: 100.0%
```

### Performance Benchmarks

Expected response times:
- Health checks: < 50ms
- Authentication: < 200ms
- Simple analysis: < 500ms
- Complex analysis: < 2000ms
- File upload: < 30s

## Next Steps

After successful testing:

1. **Frontend Integration**: The backend is ready for frontend integration
2. **Production Deployment**: Configure production environment
3. **Monitoring Setup**: Set up application monitoring
4. **Load Testing**: Test with higher loads using tools like Artillery
5. **Documentation**: API documentation is available in the service files

## Support

If you encounter issues:

1. Check the logs: `tail -f logs/app.log`
2. Review the troubleshooting section above
3. Check the detailed guides:
   - `BACKEND_TESTING_GUIDE.md` - Comprehensive testing guide
   - `SERVICE_INTEGRATION_GUIDE.md` - Service architecture details
   - `SCHEMA_UPDATE_GUIDE.md` - Database schema information

## Test Data Files

The following test data files are available in `test-data/`:

- `sample_daily_data.csv` - NIFTY daily data (20 records)
- `sample_weekly_data.csv` - NIFTY weekly data (10 records)  
- `sample_banknifty_data.csv` - BANKNIFTY daily data (20 records)

You can create additional test files following the same CSV format:
```csv
Date,Ticker,Open,High,Low,Close,Volume,OpenInterest
2024-01-01,SYMBOL,100.00,102.00,99.00,101.50,1000000,0
```

## Automated Testing

For continuous testing, you can set up automated tests:

```bash
# Add to your CI/CD pipeline
npm run test:setup:full
npm run test:backend
```

This ensures your backend is always tested and working correctly! 🚀