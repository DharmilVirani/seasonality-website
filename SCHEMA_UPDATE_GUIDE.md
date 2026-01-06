# Prisma Schema Update Guide

## Overview

This guide covers updating the Prisma schema from the basic version to the complete multi-timeframe schema that supports:

- **Multi-timeframe data models** (Daily, Weekly, Monthly, Yearly)
- **Enhanced user management** with roles and permissions
- **Statistical calculation tracking** and results storage
- **Special data models** (Elections, Special Days, Baskets, Watchlists)
- **Bulk CSV processing** with detailed tracking

## 🚨 Important Warnings

**⚠️ BREAKING CHANGES**: This schema update includes breaking changes that may require data migration.

**⚠️ DATA LOSS RISK**: Some operations may result in data loss. Always backup your database first.

## Schema Changes Summary

### New Models Added

#### Core Data Models
- `DailyData` - Daily OHLCV data with calculated fields
- `WeeklyData` - Weekly data (Monday Weekly + Expiry Weekly)
- `MonthlyData` - Monthly OHLCV data
- `YearlyData` - Yearly OHLCV data

#### User Management
- Enhanced `User` model with roles and status
- `Role` enum: SUPER_ADMIN, ADMIN, RESEARCH_TEAM, USER
- `UserStatus` enum: ACTIVE, INACTIVE, SUSPENDED

#### Calculation & Analysis
- `CalculationRun` - Tracks statistical analysis runs
- `CalculationResult` - Stores analysis results
- `AnalysisType` enum for different analysis types

#### Special Data
- `ElectionDate` - Election dates and classifications
- `SpecialDay` - Market holidays and special events
- `Basket` & `BasketItem` - Basket configurations
- `Watchlist` & `WatchlistItem` - User watchlists

#### Enhanced Upload Processing
- Enhanced `UploadBatch` with user tracking
- Enhanced `UploadedFile` with detailed metadata

### Modified Models
- `Ticker` - Added metadata fields (name, sector, exchange)
- `User` - Enhanced with profile information and relationships

### New Enums
- `WeekType`, `Timeframe`, `AnalysisType`, `CalculationStatus`
- `ElectionType`, `SpecialDayType`

## Migration Options

### Option 1: Fresh Database (Recommended for Development)

If you're in development and can afford to lose existing data:

```bash
# Reset database and apply new schema
npm run schema:reset

# Or using the script directly
node scripts/update-schema.js --reset
```

### Option 2: Gradual Migration (Recommended for Production)

For production environments with existing data:

```bash
# 1. Backup your database first
pg_dump your_database > backup_before_schema_update.sql

# 2. Generate Prisma client with new schema
npm run schema:generate

# 3. Create a proper migration (instead of db push)
cd apps/backend
npx prisma migrate dev --name update_to_multi_timeframe_schema

# 4. Apply the migration
npx prisma migrate deploy
```

### Option 3: Force Update (⚠️ DANGEROUS)

Only use if you understand the risks:

```bash
# This will force the update and may delete data
npm run schema:force
```

## Step-by-Step Migration Process

### Step 1: Backup Your Database

```bash
# PostgreSQL backup
pg_dump -h localhost -U your_user -d your_database > backup_$(date +%Y%m%d_%H%M%S).sql

# Or using Docker
docker exec your_postgres_container pg_dump -U your_user your_database > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Step 2: Review Schema Changes

```bash
# Dry run to see what would happen
npm run schema:dry-run
```

### Step 3: Update Schema

Choose one of the migration options above based on your environment.

### Step 4: Verify Update

```bash
# Test that Prisma client works
cd apps/backend
node -e "const { PrismaClient } = require('@prisma/client'); console.log('✅ Success');"

# Check database tables
psql -d your_database -c "\dt"
```

### Step 5: Update Application Code

Update your application code to use the new models:

```javascript
// Old way
const data = await prisma.seasonalityData.findMany();

// New way - use specific timeframe models
const dailyData = await prisma.dailyData.findMany();
const weeklyData = await prisma.weeklyData.findMany();
const monthlyData = await prisma.monthlyData.findMany();
```

## Data Migration Considerations

### Existing SeasonalityData

The old `SeasonalityData` model is kept for backward compatibility during migration. You'll need to:

1. **Migrate existing data** to appropriate timeframe tables
2. **Update application code** to use new models
3. **Remove legacy model** after migration is complete

### Migration Script

A data migration script will be needed to move data from `SeasonalityData` to the new timeframe-specific tables:

```javascript
// Example migration logic
const migrateSeasonalityData = async () => {
  const oldData = await prisma.seasonalityData.findMany();
  
  for (const record of oldData) {
    // Determine timeframe based on data frequency
    // Move to appropriate table (dailyData, weeklyData, etc.)
  }
};
```

## New Features Available

### 1. Multi-Timeframe Data Storage

```javascript
// Store different timeframes separately
await prisma.dailyData.create({ data: dailyRecord });
await prisma.weeklyData.create({ data: { ...weeklyRecord, weekType: 'MONDAY_WEEKLY' } });
await prisma.monthlyData.create({ data: monthlyRecord });
```

### 2. Statistical Analysis Tracking

```javascript
// Create calculation run
const run = await prisma.calculationRun.create({
  data: {
    name: "Monthly Seasonality Analysis",
    timeframe: "MONTHLY",
    analysisType: "SEASONAL_PATTERNS",
    userId: userId,
    // ... other fields
  }
});

// Store results
await prisma.calculationResult.create({
  data: {
    runId: run.id,
    tickerId: tickerId,
    statistics: { /* JSON results */ }
  }
});
```

### 3. Enhanced User Management

```javascript
// Create research team user
await prisma.user.create({
  data: {
    email: "researcher@company.com",
    role: "RESEARCH_TEAM",
    status: "ACTIVE",
    department: "Research"
  }
});
```

### 4. Special Data Management

```javascript
// Add election dates
await prisma.electionDate.create({
  data: {
    date: new Date("2024-05-15"),
    type: "GENERAL",
    description: "General Election 2024",
    isNational: true
  }
});
```

## Troubleshooting

### Common Issues

#### 1. "Data loss detected" Error

```
Error: Prisma schema changes will result in data loss
```

**Solution**: Use proper migrations instead of `db push`:

```bash
cd apps/backend
npx prisma migrate dev --name your_migration_name
```

#### 2. "Column does not exist" Error

This happens when application code tries to use new columns before migration.

**Solution**: 
1. Run schema update first
2. Then update application code

#### 3. "Relation does not exist" Error

**Solution**: Ensure all foreign key relationships are properly created:

```bash
# Check if all tables exist
psql -d your_database -c "\dt"

# Check specific table structure
psql -d your_database -c "\d+ DailyData"
```

### Recovery Procedures

#### If Migration Fails

1. **Restore from backup**:
   ```bash
   psql -d your_database < backup_file.sql
   ```

2. **Reset to previous state**:
   ```bash
   git checkout HEAD~1 -- apps/backend/prisma/schema.prisma
   npm run schema:generate
   ```

#### If Data is Lost

1. **Restore from backup**
2. **Use gradual migration approach**
3. **Contact support if needed**

## Testing the New Schema

### 1. Basic Functionality Test

```javascript
// Test script: test-new-schema.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testNewSchema() {
  try {
    // Test ticker creation
    const ticker = await prisma.ticker.create({
      data: {
        symbol: "TEST",
        name: "Test Company",
        sector: "Technology"
      }
    });

    // Test daily data
    await prisma.dailyData.create({
      data: {
        date: new Date(),
        open: 100,
        high: 105,
        low: 98,
        close: 103,
        volume: 1000,
        tickerId: ticker.id
      }
    });

    console.log("✅ New schema test passed");
  } catch (error) {
    console.error("❌ New schema test failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testNewSchema();
```

### 2. Run the Test

```bash
cd apps/backend
node test-new-schema.js
```

## Performance Considerations

### Indexes

The new schema includes optimized indexes for:
- Time-series queries (`date`, `tickerId`)
- User lookups (`email`, `role`, `status`)
- Analysis queries (`runId`, `analysisType`)

### Query Optimization

```javascript
// Efficient time-series queries
const recentData = await prisma.dailyData.findMany({
  where: {
    tickerId: tickerId,
    date: {
      gte: new Date('2024-01-01'),
      lte: new Date('2024-12-31')
    }
  },
  orderBy: { date: 'desc' },
  take: 100
});
```

## Next Steps After Migration

1. **Update application code** to use new models
2. **Migrate existing data** from legacy tables
3. **Test all functionality** with new schema
4. **Update API endpoints** to work with new models
5. **Update frontend** to handle new data structures
6. **Remove legacy models** after successful migration

## Support

If you encounter issues during migration:

1. Check this guide for common solutions
2. Review Prisma documentation
3. Check application logs for specific errors
4. Create a backup before trying fixes
5. Contact the development team if needed

## Schema Update Commands Reference

```bash
# Basic commands
npm run schema:update          # Generate + push
npm run schema:generate        # Only generate client
npm run schema:push           # Only push to DB
npm run schema:dry-run        # Preview changes

# Advanced commands  
npm run schema:reset          # Reset DB (⚠️ DELETES DATA)
npm run schema:force          # Force update (⚠️ RISK OF DATA LOSS)

# Direct script usage
node scripts/update-schema.js --help    # Show all options
```

Remember: Always backup your database before making schema changes!