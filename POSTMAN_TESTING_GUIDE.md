# 🚀 Complete Postman Testing Guide - Seasonality SaaS Backend

## 📋 Overview

This guide provides step-by-step instructions for testing your complete backend flow using Postman, from authentication to file upload (both enhanced and bulk) to analysis.

## 🛠️ Setup Instructions

### 1. Import Postman Collection

1. Open Postman
2. Click **Import** button
3. Select **File** tab
4. Choose the `POSTMAN_TESTING_COLLECTION.json` file
5. Click **Import**

### 2. Environment Setup

The collection uses variables that are automatically set during testing:
- `base_url`: http://localhost:3001 (default)
- `jwt_token`: Automatically set after login
- `batch_id`: Automatically set during bulk upload
- `upload_url`: Automatically set for MinIO upload
- `object_key`: Automatically set for file tracking

### 3. Prepare Test Data

Create a sample `seasonality.csv` file with this format:

```csv
Date,Ticker,Open,High,Low,Close,Volume,OpenInterest
01-01-2024,NIFTY,21000.00,21200.00,20900.00,21150.00,1000000,0
02-01-2024,NIFTY,21150.00,21300.00,21050.00,21250.00,1200000,0
03-01-2024,NIFTY,21250.00,21400.00,21100.00,21180.00,1100000,0
04-01-2024,NIFTY,21180.00,21350.00,21080.00,21320.00,1300000,0
05-01-2024,NIFTY,21320.00,21450.00,21200.00,21280.00,1150000,0
08-01-2024,BANKNIFTY,45000.00,45500.00,44800.00,45200.00,800000,0
09-01-2024,BANKNIFTY,45200.00,45600.00,45000.00,45400.00,850000,0
10-01-2024,BANKNIFTY,45400.00,45800.00,45200.00,45300.00,900000,0
```

## 🔄 Complete Testing Flow

### Phase 1: Authentication & Setup

#### Step 1.1: Register Research Team User
- **Request**: `1.1 Register Research Team User`
- **Purpose**: Create a user with RESEARCH_TEAM role
- **Expected Result**: 201 Created with user details
- **Notes**: Change email if user already exists

#### Step 1.2: Login Research Team User
- **Request**: `1.2 Login Research Team User`
- **Purpose**: Get JWT token for authenticated requests
- **Expected Result**: 200 OK with JWT token
- **Auto-Action**: JWT token automatically saved to `{{jwt_token}}`

### Phase 2: Health Checks

#### Step 2.1: Basic Health Check
- **Request**: `2.1 Basic Health Check`
- **Purpose**: Verify server is running
- **Expected Result**: 200 OK with server status

#### Step 2.2: Upload Service Health
- **Request**: `2.2 Upload Service Health`
- **Purpose**: Check upload service configuration
- **Expected Result**: 200 OK with service details

#### Step 2.3: Analysis Service Health
- **Request**: `2.3 Analysis Service Health`
- **Purpose**: Verify analysis service is ready
- **Expected Result**: 200 OK with service health
- **Requires**: Authentication token

### Phase 3: Enhanced Upload Flow (Recommended for Single Files)

#### Step 3.1: Validate CSV File
- **Request**: `3.1 Validate CSV File`
- **Purpose**: Check CSV structure without processing
- **File Upload**: Select your `seasonality.csv` file
- **Expected Result**: 200 OK with validation details
- **Check**: `isValid: true`, record count, detected timeframe

#### Step 3.2: Upload Single CSV File
- **Request**: `3.2 Upload Single CSV File`
- **Purpose**: Upload and process CSV with multi-timeframe generation
- **File Upload**: Select your `seasonality.csv` file
- **Parameters**:
  - `timeframe`: DAILY
  - `generateAllTimeframes`: true
  - `calculateReturns`: true
- **Expected Result**: 200 OK with processing summary
- **Check**: `success: true`, tickers processed, records processed

#### Step 3.3: Get Upload History
- **Request**: `3.3 Get Upload History`
- **Purpose**: View upload history
- **Expected Result**: 200 OK with upload list
- **Check**: Your recent upload should appear

### Phase 4: Bulk Upload Flow (For Multiple Files)

#### Step 4.1: Get Presigned URLs
- **Request**: `4.1 Get Presigned URLs`
- **Purpose**: Get MinIO presigned URLs for direct upload
- **Body**: Specify files to upload (name and size)
- **Expected Result**: 200 OK with presigned URLs
- **Auto-Action**: `batch_id`, `upload_url`, `object_key` automatically saved

#### Step 4.2: Upload File to MinIO
- **Request**: `4.2 Upload File to MinIO`
- **Purpose**: Upload file directly to MinIO storage
- **File Upload**: Select your `seasonality.csv` file
- **Important**: 
  - Uses presigned URL (no Authorization header)
  - Content-Type: text/csv
- **Expected Result**: 200 OK (empty response is normal)

#### Step 4.3: Start Bulk Processing
- **Request**: `4.3 Start Bulk Processing`
- **Purpose**: Trigger async processing of uploaded files
- **Body**: Uses auto-saved batch_id and object_key
- **Expected Result**: 200 OK with processing confirmation
- **Check**: `status: "PROCESSING"`, files queued

#### Step 4.4: Check Batch Status
- **Request**: `4.4 Check Batch Status`
- **Purpose**: Monitor processing progress
- **Expected Result**: 200 OK with batch status
- **Check**: `progress`, `processedFiles`, `status`
- **Note**: Run multiple times to see progress

#### Step 4.5: List All Batches
- **Request**: `4.5 List All Batches`
- **Purpose**: View all upload batches
- **Expected Result**: 200 OK with batch list

### Phase 5: Analysis Flow

#### Step 5.1: Daily Analysis
- **Request**: `5.1 Daily Analysis`
- **Purpose**: Perform comprehensive daily analysis
- **Parameters**: Symbol, date range, filters
- **Expected Result**: 200 OK with analysis results
- **Check**: Statistics, trending days, insights

#### Step 5.2: Weekly Analysis
- **Request**: `5.2 Weekly Analysis`
- **Purpose**: Analyze Monday and Expiry weekly data
- **Expected Result**: 200 OK with weekly analysis
- **Check**: Monday vs Expiry comparison

#### Step 5.3: Monthly Analysis
- **Request**: `5.3 Monthly Analysis`
- **Purpose**: Monthly seasonal analysis
- **Expected Result**: 200 OK with monthly patterns

#### Step 5.4: Consecutive Analysis
- **Request**: `5.4 Consecutive Analysis`
- **Purpose**: Find consecutive patterns
- **Expected Result**: 200 OK with sequence analysis

#### Step 5.5: Get Analysis History
- **Request**: `5.5 Get Analysis History`
- **Purpose**: View previous analyses
- **Expected Result**: 200 OK with analysis list

### Phase 6: Performance & Monitoring

#### Step 6.1: Get Performance Metrics
- **Request**: `6.1 Get Performance Metrics`
- **Purpose**: Check system performance
- **Expected Result**: 200 OK with metrics

#### Step 6.2: Clear Cache
- **Request**: `6.2 Clear Cache`
- **Purpose**: Clear analysis cache
- **Expected Result**: 200 OK with confirmation

#### Step 6.3: Get Upload Stats
- **Request**: `6.3 Get Upload Stats`
- **Purpose**: View upload statistics
- **Expected Result**: 200 OK with upload metrics

### Phase 7: Data Verification

#### Step 7.1: Get Tickers
- **Request**: `7.1 Get Tickers`
- **Purpose**: List available tickers
- **Expected Result**: 200 OK with ticker list
- **Check**: Your uploaded tickers should appear

#### Step 7.2: Get Ticker Data
- **Request**: `7.2 Get Ticker Data`
- **Purpose**: View specific ticker data
- **Expected Result**: 200 OK with OHLCV data
- **Check**: Data matches your uploaded CSV

## 🔍 Testing Scenarios

### Scenario 1: Quick Single File Test
1. Login (1.2)
2. Validate CSV (3.1)
3. Upload CSV (3.2)
4. Daily Analysis (5.1)
5. Check Results (7.1, 7.2)

### Scenario 2: Complete Bulk Upload Test
1. Login (1.2)
2. Get Presigned URLs (4.1)
3. Upload to MinIO (4.2)
4. Start Processing (4.3)
5. Monitor Status (4.4) - repeat until complete
6. Run Analysis (5.1-5.4)

### Scenario 3: Full System Test
1. All Authentication steps (1.1-1.2)
2. All Health Checks (2.1-2.3)
3. Enhanced Upload Flow (3.1-3.3)
4. Analysis Flow (5.1-5.5)
5. Performance Monitoring (6.1-6.3)
6. Data Verification (7.1-7.2)

## 🚨 Troubleshooting

### Common Issues

#### 1. Authentication Errors
- **Problem**: 401 Unauthorized
- **Solution**: Check JWT token is set, re-login if expired
- **Check**: `{{jwt_token}}` variable has value

#### 2. File Upload Errors
- **Problem**: 400 Bad Request on file upload
- **Solution**: 
  - Ensure CSV format is correct
  - Check file size < 50MB
  - Verify required columns exist

#### 3. Presigned URL Errors
- **Problem**: MinIO upload fails
- **Solution**:
  - Check MinIO is running
  - Verify presigned URL is not expired
  - Ensure no Authorization header on MinIO upload

#### 4. Processing Timeout
- **Problem**: Batch processing stuck
- **Solution**:
  - Check Redis is running
  - Verify worker processes are active
  - Check batch status for errors

#### 5. Analysis Errors
- **Problem**: No data found for analysis
- **Solution**:
  - Verify data was uploaded successfully
  - Check ticker symbols match
  - Ensure date ranges are valid

### Expected Response Times
- Authentication: < 200ms
- File validation: < 500ms
- Single file upload: < 30s
- Bulk upload (presign): < 2s
- Analysis: < 5s

### Success Indicators
- ✅ All requests return 200/201 status
- ✅ JWT token automatically saved
- ✅ File uploads show processing success
- ✅ Analysis returns meaningful data
- ✅ Tickers appear in ticker list
- ✅ Data verification shows uploaded records

## 📊 Sample Expected Responses

### Successful Upload Response
```json
{
  "success": true,
  "data": {
    "batchId": "batch_1234567890",
    "status": "SUCCESS",
    "summary": {
      "totalTickers": 2,
      "processedTickers": 2,
      "totalRecords": 8,
      "executionTime": 1250
    }
  }
}
```

### Successful Analysis Response
```json
{
  "success": true,
  "data": {
    "analysisId": "analysis_1234567890",
    "timeframe": "DAILY",
    "results": {
      "statistics": {
        "All Count": 5,
        "Pos Count": 3,
        "Neg Count": 2,
        "Avg Return All": 0.85
      },
      "insights": {
        "summary": {
          "winRate": 60.0,
          "avgReturn": 0.85
        }
      }
    }
  }
}
```

## 🎯 Testing Checklist

### Pre-Testing
- [ ] Backend server running on port 3001
- [ ] Database connected and migrated
- [ ] Redis running (for bulk uploads)
- [ ] MinIO running (for bulk uploads)
- [ ] Test CSV file prepared

### Authentication
- [ ] User registration successful
- [ ] Login returns JWT token
- [ ] Token automatically saved in Postman

### Upload Testing
- [ ] CSV validation passes
- [ ] Enhanced upload processes successfully
- [ ] Bulk upload gets presigned URLs
- [ ] MinIO upload completes
- [ ] Batch processing starts and completes

### Analysis Testing
- [ ] Daily analysis returns results
- [ ] Weekly analysis compares timeframes
- [ ] Monthly analysis shows patterns
- [ ] Consecutive analysis finds sequences

### Data Verification
- [ ] Tickers created in database
- [ ] Data records stored correctly
- [ ] Multi-timeframe data generated
- [ ] Return calculations accurate

This comprehensive testing approach ensures your complete backend flow works correctly from file upload through analysis! 🚀