# Upload Service Schema Fixes

## Issue Summary

The upload service was still using the old schema table `seasonalityData` instead of the new schema table `processedData`, causing CSV upload failures with "Invalid Date" errors.

## Root Cause

The upload service contained 18 references to the old `seasonalityData` table that needed to be updated to use the new `processedData` table.

## Fixes Applied

### 1. Batch Insert Operations
- **Line 82**: `tx.seasonalityData.createMany` → `tx.processedData.createMany`

### 2. Record Counting Operations
- **Line 147**: `tx.seasonalityData.count` → `tx.processedData.count` (before count)
- **Line 167**: `tx.seasonalityData.count` → `tx.processedData.count` (after count)

### 3. Statistics Operations
- **Line 227**: `prisma.seasonalityData.count` → `prisma.processedData.count` (total data count)
- **Line 240**: `seasonalityData: true` → `processedData: true` (count select)
- **Line 253**: `ticker._count.seasonalityData` → `ticker._count.processedData` (data entries)

### 4. Data Retrieval Operations
- **Line 277**: `seasonalityData: { take: 1, ... }` → `processedData: { take: 1, ... }` (latest data)
- **Line 277**: `_count.select.seasonalityData` → `_count.select.processedData` (count select)
- **Line 295-304**: `prisma.seasonalityData.findFirst` → `prisma.processedData.findFirst` (date range)
- **Line 309**: `ticker._count.seasonalityData` → `ticker._count.processedData` (total entries)
- **Line 315**: `ticker.seasonalityData[0]` → `ticker.processedData[0]` (latest data)

### 5. Data Management Operations
- **Line 337**: `_count.select.seasonalityData` → `_count.select.processedData` (count select)
- **Line 349**: `ticker._count.seasonalityData` → `ticker._count.processedData` (data count)
- **Line 352**: `tx.seasonalityData.deleteMany` → `tx.processedData.deleteMany` (delete data)
- **Line 377**: `tx.seasonalityData.count` → `tx.processedData.count` (count for deletion)
- **Line 380**: `tx.seasonalityData.deleteMany` → `tx.processedData.deleteMany` (delete all data)

### 6. Data Update Operations
- **Line 418**: `tx.seasonalityData.upsert` → `tx.processedData.upsert` (upsert operation)
- **Line 446**: `tx.seasonalityData.findFirst` → `tx.processedData.findFirst` (existing check)

## Impact

These fixes resolve:

1. **CSV Upload Failures**: The "Invalid Date" error was caused by the upload service trying to use the wrong table structure
2. **Database Consistency**: Ensures all upload operations use the correct schema table
3. **Data Integrity**: Prevents data from being inserted into non-existent tables

## Verification

After these fixes, the upload service should:
- ✅ Successfully parse CSV files
- ✅ Insert data into the correct `processedData` table
- ✅ Handle date validation correctly
- ✅ Provide accurate statistics and counts
- ✅ Support all data management operations (delete, update, etc.)

## Next Steps

1. **Run Schema Push**: Ensure the database schema is updated with the new tables
2. **Test CSV Upload**: Verify that CSV files can be uploaded without errors
3. **Verify Data**: Check that data is correctly inserted into the `processedData` table
4. **Test Statistics**: Confirm that upload statistics are accurate

## Files Modified

- `apps/backend/src/services/uploadService.js` - Updated all schema table references