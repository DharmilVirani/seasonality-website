# Database Schema Optimization for Migration

## Overview

This document analyzes the current database schema and proposes optimizations for handling the 5 different timeframe data structure from the old software (Daily, Monday Weekly, Expiry Weekly, Monthly, Yearly) while maintaining the new system's relational design.

## Current Database Schema Analysis

### Existing Tables
```sql
-- Current schema from seasonality-website/apps/backend/prisma/schema.prisma
User (id, username, email, password, role, createdAt, updatedAt)
UploadBatch (id, name, status, totalFiles, processedFiles, failedFiles, createdAt, updatedAt)
UploadedFile (id, filename, status, recordsProcessed, error, processedAt, batchId, tickerId)
Ticker (id, symbol, createdAt, updatedAt)
SeasonalityData (id, date, tickerId, open, high, low, close, volume, openInterest, createdAt, updatedAt)
```

## Problem Analysis

### Old Software Data Structure
Each symbol has 5 CSV files:
- **1_Daily.csv** - Daily market data
- **2_MondayWeekly.csv** - Monday-based weekly data  
- **3_ExpiryWeekly.csv** - Options expiry-based weekly data
- **4_Monthly.csv** - Monthly aggregated data
- **5_Yearly.csv** - Yearly aggregated data

### Current New Schema Limitation
The current `SeasonalityData` table doesn't distinguish between timeframes, which could lead to:
1. **Data Confusion**: Daily and monthly data mixed in same table
2. **Query Complexity**: Need to filter by timeframe logic
3. **Performance Issues**: Large table with mixed granularities
4. **Data Integrity**: No validation for timeframe-specific constraints

## Proposed Database Schema Optimization

### Option 1: Single Table with Timeframe Column (Recommended)

```sql
// Enhanced current schema
model SeasonalityData {
  id           Int      @id @default(autoincrement())
  date         DateTime
  tickerId     Int
  timeframe    Timeframe  // NEW: Enum for timeframe type
  open         Float?
  high         Float?
  low          Float?
  close        Float?
  volume       Int?
  openInterest Int?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  
  ticker       Ticker   @relation(fields: [tickerId], references: [id], onDelete: Cascade)
  
  @@unique([date, tickerId, timeframe])  // NEW: Composite unique constraint
  @@index([tickerId, timeframe])        // NEW: Index for performance
  @@index([date, timeframe])            // NEW: Index for date-based queries
}

// NEW: Timeframe enum
enum Timeframe {
  DAILY
  MONDAY_WEEKLY
  EXPIRY_WEEKLY
  MONTHLY
  YEARLY
}
```

**Advantages:**
- ✅ Single table maintains simplicity
- ✅ Timeframe column enables clear data separation
- ✅ Composite unique constraint prevents duplicates
- ✅ Proper indexing for performance
- ✅ Easy to query specific timeframes
- ✅ Maintains relational integrity

### Option 2: Separate Tables per Timeframe

```sql
// Alternative: Separate tables for each timeframe
model DailyData {
  id           Int      @id @default(autoincrement())
  date         DateTime
  tickerId     Int
  open         Float?
  high         Float?
  low          Float?
  close        Float?
  volume       Int?
  openInterest Int?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  
  ticker       Ticker   @relation(fields: [tickerId], references: [id], onDelete: Cascade)
  
  @@unique([date, tickerId])
  @@index([tickerId])
}

model MondayWeeklyData {
  id           Int      @id @default(autoincrement())
  date         DateTime  // Monday date
  tickerId     Int
  weekNumberMonthly Int?
  weekNumberYearly  Int?
  open         Float?
  high         Float?
  low          Float?
  close        Float?
  volume       Int?
  openInterest Int?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  
  ticker       Ticker   @relation(fields: [tickerId], references: [id], onDelete: Cascade)
  
  @@unique([date, tickerId])
  @@index([tickerId])
}

// Similar tables for: ExpiryWeeklyData, MonthlyData, YearlyData
```

**Advantages:**
- ✅ Clear separation of data by timeframe
- ✅ Optimized storage per timeframe
- ✅ Timeframe-specific columns possible

**Disadvantages:**
- ❌ Complex queries across timeframes
- ❌ Code duplication in services
- ❌ More complex migrations
- ❌ Harder to maintain consistency

### Option 3: Hybrid Approach (Timeframe-Specific Views)

```sql
// Base table with all data
model SeasonalityData {
  id           Int      @id @default(autoincrement())
  date         DateTime
  tickerId     Int
  timeframe    Timeframe
  open         Float?
  high         Float?
  low          Float?
  close        Float?
  volume       Int?
  openInterest Int?
  // Timeframe-specific columns
  weekNumberMonthly Int?
  weekNumberYearly  Int?
  month           Int?
  year            Int?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  ticker          Ticker   @relation(fields: [tickerId], references: [id], onDelete: Cascade)
  
  @@unique([date, tickerId, timeframe])
  @@index([tickerId, timeframe])
}

// Database views for each timeframe
// View: DailyData (WHERE timeframe = 'DAILY')
// View: MondayWeeklyData (WHERE timeframe = 'MONDAY_WEEKLY') 
// View: ExpiryWeeklyData (WHERE timeframe = 'EXPIRY_WEEKLY')
// View: MonthlyData (WHERE timeframe = 'MONTHLY')
// View: YearlyData (WHERE timeframe = 'YEARLY')
```

## Recommended Implementation: Option 1

### Enhanced Schema Design

```prisma
// Updated schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        Int      @id @default(autoincrement())
  username  String   @unique
  email     String   @unique
  password  String
  role      Role     @default(USER)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  uploadBatches UploadBatch[]
  uploadedFiles UploadedFile[]
}

model Role {
  id    Int    @id @default(autoincrement())
  name  String @unique
  users User[]
}

model UploadBatch {
  id             Int           @id @default(autoincrement())
  name           String
  status         BatchStatus   @default(PENDING)
  totalFiles     Int
  processedFiles Int           @default(0)
  failedFiles    Int           @default(0)
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt
  
  uploadedFiles  UploadedFile[]
  createdBy      User          @relation(fields: [createdById], references: [id])
  createdById    Int
}

model UploadedFile {
  id              Int           @id @default(autoincrement())
  filename        String
  status          FileStatus    @default(PENDING)
  recordsProcessed Int          @default(0)
  error           String?
  processedAt     DateTime?
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  
  batch           UploadBatch   @relation(fields: [batchId], references: [id])
  batchId         Int
  ticker          Ticker?       @relation(fields: [tickerId], references: [id])
  tickerId        Int?
  
  @@index([batchId])
  @@index([tickerId])
}

model Ticker {
  id        Int            @id @default(autoincrement())
  symbol    String         @unique
  createdAt DateTime       @default(now())
  updatedAt DateTime       @updatedAt
  
  seasonalityData SeasonalityData[]
  uploadedFiles   UploadedFile[]
}

model SeasonalityData {
  id           Int        @id @default(autoincrement())
  date         DateTime
  tickerId     Int
  timeframe    Timeframe
  open         Float?
  high         Float?
  low          Float?
  close        Float?
  volume       Int?
  openInterest Int?
  // Timeframe-specific calculated fields
  weekNumberMonthly Int?
  weekNumberYearly  Int?
  month            Int?
  year             Int?
  returnPoints     Float?
  returnPercentage Float?
  positiveDay      Boolean?
  positiveWeek     Boolean?
  positiveMonth    Boolean?
  positiveYear     Boolean?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  
  ticker           Ticker   @relation(fields: [tickerId], references: [id], onDelete: Cascade)
  
  @@unique([date, tickerId, timeframe])
  @@index([tickerId, timeframe])
  @@index([date, timeframe])
  @@index([timeframe, year])
}

enum Timeframe {
  DAILY
  MONDAY_WEEKLY
  EXPIRY_WEEKLY
  MONTHLY
  YEARLY
}

enum BatchStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
  PARTIAL
}

enum FileStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
}
```

## Migration Strategy

### Phase 1: Schema Update
1. **Add timeframe enum** to existing schema
2. **Add timeframe column** to SeasonalityData table
3. **Create composite unique constraint** on (date, tickerId, timeframe)
4. **Add performance indexes** for common queries

### Phase 2: Data Migration
1. **Migrate existing data** with timeframe = 'DAILY' (assuming current data is daily)
2. **Create migration scripts** to process CSV files by timeframe
3. **Validate data integrity** after migration

### Phase 3: Service Updates
1. **Update CSV processing** to detect and assign correct timeframe
2. **Modify API endpoints** to accept timeframe parameter
3. **Update frontend** to handle timeframe selection

## API Endpoint Updates

### Enhanced Data Analysis Endpoints

```http
GET /analysis/seasonality
Query Parameters:
- symbol: "RELIANCE"
- timeframe: "daily|monday_weekly|expiry_weekly|monthly|yearly"  // NEW
- startDate: "2024-01-01"
- endDate: "2024-12-31"

Response:
{
    "symbol": "RELIANCE",
    "timeframe": "daily",
    "data": [...],
    "statistics": {...}
}
```

### Timeframe-Specific Endpoints

```http
GET /analysis/seasonality/daily
GET /analysis/seasonality/weekly/monday
GET /analysis/seasonality/weekly/expiry  
GET /analysis/seasonality/monthly
GET /analysis/seasonality/yearly
```

## Frontend Component Updates

### Timeframe Selection Component

```jsx
// New component for timeframe selection
const TimeframeSelector = ({ onTimeframeChange, currentSelection }) => {
  const timeframes = [
    { value: 'DAILY', label: 'Daily' },
    { value: 'MONDAY_WEEKLY', label: 'Monday Weekly' },
    { value: 'EXPIRY_WEEKLY', label: 'Expiry Weekly' },
    { value: 'MONTHLY', label: 'Monthly' },
    { value: 'YEARLY', label: 'Yearly' }
  ];

  return (
    <Select
      options={timeframes}
      value={currentSelection}
      onChange={onTimeframeChange}
      placeholder="Select Timeframe"
    />
  );
};
```

## Performance Considerations

### Database Optimization
1. **Partitioning**: Consider table partitioning by timeframe for large datasets
2. **Indexing**: Composite indexes on (tickerId, timeframe, date)
3. **Caching**: Implement Redis caching for frequently accessed data
4. **Query Optimization**: Use timeframe-specific queries to reduce data scanning

### Application Optimization
1. **Lazy Loading**: Load data by timeframe on demand
2. **Pagination**: Implement pagination for large datasets
3. **Caching**: Cache analysis results for repeated queries
4. **Background Processing**: Use background jobs for heavy calculations

## Benefits of Recommended Approach

### 1. **Data Integrity**
- Clear separation of timeframes
- Prevents data mixing between different granularities
- Proper constraints and validation

### 2. **Performance**
- Optimized queries with timeframe filtering
- Proper indexing for common access patterns
- Reduced data scanning for timeframe-specific queries

### 3. **Maintainability**
- Single table reduces complexity
- Clear schema design with enum types
- Easy to extend with new timeframes

### 4. **User Experience**
- Clear timeframe selection in UI
- Fast queries for specific timeframes
- Consistent API design across all timeframes

This optimized schema design provides the best balance of performance, maintainability, and user experience while properly handling the 5 different timeframe data structure from your old software.