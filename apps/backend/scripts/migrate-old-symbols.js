// #!/usr/bin/env node

// /**
//  * Fast Migration Script - Old Software Symbols to New Database
//  * 
//  * Migrates all daily CSV data from old-software/Symbols to the new database schema
//  * Processes all symbols in parallel for maximum speed
//  * 
//  * Usage: node scripts/migrate-old-symbols.js
//  * 
//  * Database: postgresql://admin:admin123@100.114.145.101:5432/youngturtle
//  */

// Check if required dependencies are available
try {
    require('@prisma/client');
    require('csv-parse');
} catch (error) {
    console.error('Missing dependencies. Please run:');
    console.error('   cd apps/backend && npm install');
    process.exit(1);
}

const { PrismaClient } = require('@prisma/client');
const fs = require('fs').promises;
const path = require('path');
const csv = require('csv-parse');

// Direct database configuration
const DATABASE_URL = "postgresql://admin:admin123@192.168.4.30:5432/youngturtle";

// console.log('Connecting to database:', DATABASE_URL.replace(/:[^:]*@/, ':****@'));

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: DATABASE_URL
        }
    }
});

class FastSymbolMigrator {
    constructor() {
        this.stats = {
            totalSymbols: 0,
            processedSymbols: 0,
            totalRecords: 0,
            errors: [],
            startTime: Date.now()
        };
        this.batchSize = 500; // Reduced from 1000 to prevent timeout
        this.concurrency = 5; // Reduced from 10 for better stability
    }

    /**
     * Main migration function
     */
    async migrate() {
        // console.log('Starting Fast Symbol Migration...');
        // console.log('='.repeat(60));

        try {
            // Test database connection first
            console.log('Testing database connection...');
            await prisma.$connect();
            await prisma.$queryRaw`SELECT 1`;
            console.log('Database connection successful');

            // Get all symbol directories
            const symbolsPath = path.join(__dirname, '..', '..', '..', 'old-software', 'Symbols');
            const symbolDirs = await this.getSymbolDirectories(symbolsPath);

            this.stats.totalSymbols = symbolDirs.length;
            // console.log(`Found ${symbolDirs.length} symbols to migrate`);

            // Process symbols in batches for controlled concurrency
            const batches = this.chunkArray(symbolDirs, this.concurrency);

            for (let i = 0; i < batches.length; i++) {
                const batch = batches[i];
                console.log(`\nProcessing batch ${i + 1}/${batches.length} (${batch.length} symbols)`);

                await Promise.all(
                    batch.map(symbolDir => this.processSymbol(symbolsPath, symbolDir))
                );

                const progress = ((i + 1) / batches.length * 100).toFixed(1);
                console.log(`Batch ${i + 1} completed. Progress: ${progress}%`);
            }

            await this.printSummary();

        } catch (error) {
            console.error('Migration failed:', error);
            throw error;
        } finally {
            await prisma.$disconnect();
        }
    }

    /**
     * Get all symbol directories
     */
    async getSymbolDirectories(symbolsPath) {
        try {
            const entries = await fs.readdir(symbolsPath, { withFileTypes: true });
            return entries
                .filter(entry => entry.isDirectory())
                .map(entry => entry.name)
                .sort();
        } catch (error) {
            throw new Error(`Failed to read symbols directory: ${error.message}`);
        }
    }

    /**
     * Process a single symbol
     */
    async processSymbol(symbolsPath, symbolName) {
        try {
            const symbolPath = path.join(symbolsPath, symbolName);
            const dailyFile = path.join(symbolPath, '1_Daily.csv');

            // Check if daily file exists
            try {
                await fs.access(dailyFile);
            } catch {
                // console.log(`No daily file for ${symbolName}, skipping`);
                return;
            }

            // Read and parse CSV
            const csvData = await fs.readFile(dailyFile, 'utf-8');
            const records = await this.parseCSV(csvData);

            if (records.length === 0) {
                // console.log(`No records in ${symbolName}, skipping`);
                return;
            }

            // Create or get ticker
            const ticker = await this.upsertTicker(symbolName);

            // Process records in batches
            await this.processRecordsInBatches(ticker.id, records, symbolName);

            this.stats.processedSymbols++;
            // console.log(`${symbolName}: ${records.length} records migrated`);

        } catch (error) {
            this.stats.errors.push({
                symbol: symbolName,
                error: error.message
            });
            // console.error(`Error processing ${symbolName}:`, error.message);
        }
    }

    /**
     * Parse CSV data
     */
    async parseCSV(csvData) {
        return new Promise((resolve, reject) => {
            const records = [];

            csv.parse(csvData, {
                columns: true,
                skip_empty_lines: true,
                trim: true
            })
                .on('data', (record) => {
                    // Parse and validate the record
                    const parsedRecord = this.parseRecord(record);
                    if (parsedRecord) {
                        records.push(parsedRecord);
                    }
                })
                .on('end', () => resolve(records))
                .on('error', reject);
        });
    }

    /**
     * Parse individual record
     */
    parseRecord(record) {
        try {
            // Parse date (handle different formats)
            const date = this.parseDate(record.Date);
            if (!date) return null;

            return {
                date: date,
                open: parseFloat(record.Open) || 0,
                high: parseFloat(record.High) || 0,
                low: parseFloat(record.Low) || 0,
                close: parseFloat(record.Close) || 0,
                volume: parseFloat(record.Volume) || 0,
                openInterest: parseFloat(record.OpenInterest) || 0,
                returnPercentage: record.ReturnPercentage ? parseFloat(record.ReturnPercentage) : null
            };
        } catch (error) {
            // console.warn(`Warning: Failed to parse record:`, error.message);
            return null;
        }
    }

    /**
     * Parse date from various formats
     */
    parseDate(dateStr) {
        if (!dateStr) return null;

        try {
            // Handle YYYY-MM-DD format
            if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
                return new Date(dateStr + 'T00:00:00.000Z');
            }

            // Handle DD-MM-YYYY format
            if (dateStr.match(/^\d{1,2}-\d{1,2}-\d{4}$/)) {
                const [day, month, year] = dateStr.split('-');
                return new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day)));
            }

            // Handle MM/DD/YYYY format
            if (dateStr.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
                const [month, day, year] = dateStr.split('/');
                return new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day)));
            }

            // Fallback to standard parsing
            const date = new Date(dateStr);
            return isNaN(date.getTime()) ? null : date;

        } catch (error) {
            console.warn(`Warning: Failed to parse date "${dateStr}":`, error.message);
            return null;
        }
    }

    /**
     * Create or get ticker
     */
    async upsertTicker(symbolName) {
        try {
            return await prisma.ticker.upsert({
                where: { symbol: symbolName },
                update: {
                    updatedAt: new Date()
                },
                create: {
                    symbol: symbolName
                }
            });
        } catch (error) {
            throw new Error(`Failed to upsert ticker ${symbolName}: ${error.message}`);
        }
    }

    /**
     * Process records in batches for better performance
     */
    async processRecordsInBatches(tickerId, records, symbolName) {
        const batches = this.chunkArray(records, this.batchSize);

        for (let i = 0; i < batches.length; i++) {
            const batch = batches[i];

            try {
                // Use transaction for each batch with increased timeout
                await prisma.$transaction(async (tx) => {
                    const upsertPromises = batch.map(record =>
                        tx.seasonalityData.upsert({
                            where: {
                                date_tickerId: {
                                    date: record.date,
                                    tickerId: tickerId
                                }
                            },
                            update: {
                                open: record.open,
                                high: record.high,
                                low: record.low,
                                close: record.close,
                                volume: record.volume,
                                openInterest: record.openInterest,
                                updatedAt: new Date()
                            },
                            create: {
                                tickerId: tickerId,
                                date: record.date,
                                open: record.open,
                                high: record.high,
                                low: record.low,
                                close: record.close,
                                volume: record.volume,
                                openInterest: record.openInterest
                            }
                        })
                    );

                    await Promise.all(upsertPromises);
                }, {
                    timeout: 30000, // 30 seconds timeout
                    maxWait: 35000, // 35 seconds max wait
                });

                this.stats.totalRecords += batch.length;

                // Progress indicator for large symbols
                if (batches.length > 10 && (i + 1) % 5 === 0) {
                    const progress = ((i + 1) / batches.length * 100).toFixed(1);
                    console.log(`  📈 ${symbolName}: ${progress}% (${i + 1}/${batches.length} batches)`);
                }

            } catch (error) {
                throw new Error(`Failed to process batch ${i + 1} for ${symbolName}: ${error.message}`);
            }
        }
    }

    /**
     * Utility function to chunk array
     */
    chunkArray(array, chunkSize) {
        const chunks = [];
        for (let i = 0; i < array.length; i += chunkSize) {
            chunks.push(array.slice(i, i + chunkSize));
        }
        return chunks;
    }

    /**
     * Print migration summary
     */
    async printSummary() {
        const executionTime = Date.now() - this.stats.startTime;
        const minutes = Math.floor(executionTime / 60000);
        const seconds = Math.floor((executionTime % 60000) / 1000);

        console.log('\n' + '='.repeat(60));
        console.log('MIGRATION SUMMARY');
        console.log('='.repeat(60));
        console.log(`Symbols processed: ${this.stats.processedSymbols}/${this.stats.totalSymbols}`);
        console.log(`Total records migrated: ${this.stats.totalRecords.toLocaleString()}`);
        console.log(`Execution time: ${minutes}m ${seconds}s`);
        console.log(`Average speed: ${Math.round(this.stats.totalRecords / (executionTime / 1000))} records/second`);

        if (this.stats.errors.length > 0) {
            console.log(`\nErrors (${this.stats.errors.length}):`);
            this.stats.errors.forEach(error => {
                console.log(`  • ${error.symbol}: ${error.error}`);
            });
        }

        // Database statistics
        try {
            const tickerCount = await prisma.ticker.count();
            const dataCount = await prisma.seasonalityData.count();

            // console.log('\nDATABASE STATISTICS:');
            // console.log(`• Total tickers: ${tickerCount}`);
            // console.log(`• Total data records: ${dataCount.toLocaleString()}`);

        } catch (error) {
            console.warn('Warning: Could not fetch database statistics');
        }

        console.log('\n Migration completed successfully!');
    }
}

// Main execution
async function main() {
    const migrator = new FastSymbolMigrator();

    try {
        await migrator.migrate();
        process.exit(0);
    } catch (error) {
        // console.error('Migration failed:', error);
        process.exit(1);
    }
}

// Run if this file is executed directly
if (require.main === module) {
    main();
}

module.exports = FastSymbolMigrator;





/* ============================================================== */
/* ============================================================== */
/*if any symbol fail use below script for recover that */
/* ============================================================== */
/* ============================================================== */



// #!/usr/bin/env node
/**
 * Fast Migration Script - Only Missing Symbols
 * 
 * Processes only symbols that don't have data in the database
 * Much faster for re-runs after partial migration
 * 
 * Usage: node apps/backend/scripts/migrate-remaining-symbols.js
 */

// Check if required dependencies are available
// try {
//     require('@prisma/client');
//     require('csv-parse');
// } catch (error) {
//     console.error('Missing dependencies. Please run:');
//     console.error('cd apps/backend && npm install');
//     process.exit(1);
// }

// const { PrismaClient } = require('@prisma/client');
// const fs = require('fs').promises;
// const path = require('path');
// const csv = require('csv-parse');

// // Direct database configuration
// const DATABASE_URL = "postgresql://admin:admin123@192.168.4.30:5432/youngturtle";

// console.log('Connecting to database:', DATABASE_URL.replace(/:[^:]*@/, ':****@'));

// const prisma = new PrismaClient({
//     datasources: {
//         db: {
//             url: DATABASE_URL
//         }
//     }
// });

// class FastRemainingMigrator {
//     constructor() {
//         this.stats = {
//             totalSymbols: 0,
//             processedSymbols: 0,
//             skippedSymbols: 0,
//             totalRecords: 0,
//             errors: [],
//             startTime: Date.now()
//         };
//         this.batchSize = 500;
//         this.concurrency = 3; // Lower concurrency for stability
//     }

//     /**
//      * Main migration function
//      */
//     async migrate() {
//         console.log('Starting Remaining Symbol Migration...');
//         console.log('='.repeat(60));

//         try {
//             // Test database connection first
//             console.log('Testing database connection...');
//             await prisma.$connect();
//             await prisma.$queryRaw`SELECT 1`;
//             console.log('Database connection successful');

//             // Get existing symbols in database
//             const existingTickers = await prisma.ticker.findMany({
//                 select: { symbol: true, id: true }
//             });
//             const existingSymbols = new Set(existingTickers.map(t => t.symbol));
//             console.log(`Found ${existingSymbols.size} existing tickers in database`);

//             // Get symbols with data
//             const symbolsWithData = await this.getSymbolsWithData();
//             console.log(`Found ${symbolsWithData.size} symbols with data`);

//             // Get all symbol directories
//             const symbolsPath = path.join(__dirname, '..', '..', '..', 'old-software', 'Symbols');
//             const symbolDirs = await this.getSymbolDirectories(symbolsPath);

//             this.stats.totalSymbols = symbolDirs.length;
//             console.log(`Found ${symbolDirs.length} symbol directories`);

//             // Filter to only missing symbols
//             const missingSymbols = symbolDirs.filter(symbol => !symbolsWithData.has(symbol));
//             console.log(`Need to process ${missingSymbols.length} symbols`);

//             if (missingSymbols.length === 0) {
//                 console.log('All symbols already have data! Migration complete.');
//                 return;
//             }

//             // Process missing symbols in batches
//             const batches = this.chunkArray(missingSymbols, this.concurrency);

//             for (let i = 0; i < batches.length; i++) {
//                 const batch = batches[i];
//                 console.log(`\nProcessing batch ${i + 1}/${batches.length} (${batch.length} symbols)`);

//                 await Promise.all(
//                     batch.map(symbolDir => this.processSymbol(symbolsPath, symbolDir))
//                 );

//                 const progress = ((i + 1) / batches.length * 100).toFixed(1);
//                 console.log(`Batch ${i + 1} completed. Progress: ${progress}%`);
//             }

//             await this.printSummary();

//         } catch (error) {
//             console.error('Migration failed:', error);
//             throw error;
//         } finally {
//             await prisma.$disconnect();
//         }
//     }

//     /**
//      * Get symbols that already have data
//      */
//     async getSymbolsWithData() {
//         const tickersWithData = await prisma.ticker.findMany({
//             where: {
//                 seasonalityData: {
//                     some: {} // Has at least one record
//                 }
//             },
//             select: { symbol: true }
//         });

//         return new Set(tickersWithData.map(t => t.symbol));
//     }

//     /**
//      * Get all symbol directories
//      */
//     async getSymbolDirectories(symbolsPath) {
//         try {
//             const entries = await fs.readdir(symbolsPath, { withFileTypes: true });
//             return entries
//                 .filter(entry => entry.isDirectory())
//                 .map(entry => entry.name)
//                 .sort();
//         } catch (error) {
//             throw new Error(`Failed to read symbols directory: ${error.message}`);
//         }
//     }

//     /**
//      * Process a single symbol
//      */
//     async processSymbol(symbolsPath, symbolName) {
//         try {
//             const symbolPath = path.join(symbolsPath, symbolName);
//             const dailyFile = path.join(symbolPath, '1_Daily.csv');

//             // Check if daily file exists
//             try {
//                 await fs.access(dailyFile);
//             } catch {
//                 console.log(`No daily file for ${symbolName}, skipping`);
//                 this.stats.skippedSymbols++;
//                 return;
//             }

//             // Read and parse CSV
//             const csvData = await fs.readFile(dailyFile, 'utf-8');
//             const records = await this.parseCSV(csvData);

//             if (records.length === 0) {
//                 console.log(`No records in ${symbolName}, skipping`);
//                 this.stats.skippedSymbols++;
//                 return;
//             }

//             // Create or get ticker
//             const ticker = await this.upsertTicker(symbolName);

//             // Process records with fast insert
//             await this.processRecordsWithFastInsert(ticker.id, records, symbolName);

//             this.stats.processedSymbols++;
//             console.log(`${symbolName}: ${records.length} records migrated`);

//         } catch (error) {
//             this.stats.errors.push({
//                 symbol: symbolName,
//                 error: error.message
//             });
//             console.error(`Error processing ${symbolName}:`, error.message);
//         }
//     }

//     /**
//      * Parse CSV data
//      */
//     async parseCSV(csvData) {
//         return new Promise((resolve, reject) => {
//             const records = [];

//             csv.parse(csvData, {
//                 columns: true,
//                 skip_empty_lines: true,
//                 trim: true
//             })
//                 .on('data', (record) => {
//                     const parsedRecord = this.parseRecord(record);
//                     if (parsedRecord) {
//                         records.push(parsedRecord);
//                     }
//                 })
//                 .on('end', () => resolve(records))
//                 .on('error', reject);
//         });
//     }

//     /**
//      * Parse individual record
//      */
//     parseRecord(record) {
//         try {
//             const date = this.parseDate(record.Date);
//             if (!date) return null;

//             return {
//                 date: date,
//                 open: parseFloat(record.Open) || 0,
//                 high: parseFloat(record.High) || 0,
//                 low: parseFloat(record.Low) || 0,
//                 close: parseFloat(record.Close) || 0,
//                 volume: parseFloat(record.Volume) || 0,
//                 openInterest: parseFloat(record.OpenInterest) || 0
//             };
//         } catch (error) {
//             console.warn(`Warning: Failed to parse record:`, error.message);
//             return null;
//         }
//     }

//     /**
//      * Parse date from various formats
//      */
//     parseDate(dateStr) {
//         if (!dateStr) return null;

//         try {
//             // Handle YYYY-MM-DD format
//             if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
//                 return new Date(dateStr + 'T00:00:00.000Z');
//             }

//             // Handle DD-MM-YYYY format
//             if (dateStr.match(/^\d{1,2}-\d{1,2}-\d{4}$/)) {
//                 const [day, month, year] = dateStr.split('-');
//                 return new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day)));
//             }

//             // Handle MM/DD/YYYY format
//             if (dateStr.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
//                 const [month, day, year] = dateStr.split('/');
//                 return new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day)));
//             }

//             const date = new Date(dateStr);
//             return isNaN(date.getTime()) ? null : date;

//         } catch (error) {
//             console.warn(`Warning: Failed to parse date "${dateStr}":`, error.message);
//             return null;
//         }
//     }

//     /**
//      * Create or get ticker
//      */
//     async upsertTicker(symbolName) {
//         try {
//             return await prisma.ticker.upsert({
//                 where: { symbol: symbolName },
//                 update: {
//                     updatedAt: new Date()
//                 },
//                 create: {
//                     symbol: symbolName
//                 }
//             });
//         } catch (error) {
//             throw new Error(`Failed to upsert ticker ${symbolName}: ${error.message}`);
//         }
//     }

//     /**
//      * Process records with fast insert (createMany)
//      */
//     async processRecordsWithFastInsert(tickerId, records, symbolName) {
//         const batches = this.chunkArray(records, this.batchSize);

//         for (let i = 0; i < batches.length; i++) {
//             const batch = batches[i];

//             try {
//                 // Use createMany for much faster inserts
//                 await prisma.seasonalityData.createMany({
//                     data: batch.map(record => ({
//                         tickerId: tickerId,
//                         date: record.date,
//                         open: record.open,
//                         high: record.high,
//                         low: record.low,
//                         close: record.close,
//                         volume: record.volume,
//                         openInterest: record.openInterest
//                     })),
//                     skipDuplicates: true // Skip if duplicate exists
//                 });

//                 this.stats.totalRecords += batch.length;

//                 // Progress indicator for large symbols
//                 if (batches.length > 5 && (i + 1) % 3 === 0) {
//                     const progress = ((i + 1) / batches.length * 100).toFixed(1);
//                     console.log(`    📈 ${symbolName}: ${progress}% (${i + 1}/${batches.length} batches)`);
//                 }

//             } catch (error) {
//                 throw new Error(`Failed to process batch ${i + 1} for ${symbolName}: ${error.message}`);
//             }
//         }
//     }

//     /**
//      * Utility function to chunk array
//      */
//     chunkArray(array, chunkSize) {
//         const chunks = [];
//         for (let i = 0; i < array.length; i += chunkSize) {
//             chunks.push(array.slice(i, i + chunkSize));
//         }
//         return chunks;
//     }

//     /**
//      * Print migration summary
//      */
//     async printSummary() {
//         const executionTime = Date.now() - this.stats.startTime;
//         const minutes = Math.floor(executionTime / 60000);
//         const seconds = Math.floor((executionTime % 60000) / 1000);

//         console.log('\n' + '='.repeat(60));
//         console.log('REMAINING MIGRATION SUMMARY');
//         console.log('='.repeat(60));
//         console.log(`Symbols processed: ${this.stats.processedSymbols}`);
//         console.log(`Symbols skipped (already have data): ${this.stats.skippedSymbols}`);
//         console.log(`New records migrated: ${this.stats.totalRecords.toLocaleString()}`);
//         console.log(`Execution time: ${minutes}m ${seconds}s`);

//         if (this.stats.totalRecords > 0) {
//             console.log(`Average speed: ${Math.round(this.stats.totalRecords / (executionTime / 1000))} records/second`);
//         }

//         if (this.stats.errors.length > 0) {
//             console.log(`\nErrors (${this.stats.errors.length}):`);
//             this.stats.errors.forEach(error => {
//                 console.log(`  • ${error.symbol}: ${error.error}`);
//             });
//         }

//         // Database statistics
//         try {
//             const tickerCount = await prisma.ticker.count();
//             const dataCount = await prisma.seasonalityData.count();

//             console.log('\nFINAL DATABASE STATISTICS:');
//             console.log(`  • Total tickers: ${tickerCount}`);
//             console.log(`  • Total data records: ${dataCount.toLocaleString()}`);

//         } catch (error) {
//             console.warn('Warning: Could not fetch database statistics');
//         }

//         console.log('\n🎉 Remaining migration completed!');
//     }
// }

// // Main execution
// async function main() {
//     const migrator = new FastRemainingMigrator();

//     try {
//         await migrator.migrate();
//         process.exit(0);
//     } catch (error) {
//         console.error(' Migration failed:', error);
//         process.exit(1);
//     }
// }

// // Run if this file is executed directly
// if (require.main === module) {
//     main();
// }

// module.exports = FastRemainingMigrator;