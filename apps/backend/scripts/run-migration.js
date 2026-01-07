#!/usr/bin/env node

/**
 * Migration Script Runner
 * 
 * Provides a command-line interface for running the data migration
 * with various options and configurations
 * 
 * Usage:
 *   node scripts/run-migration.js [options]
 * 
 * Options:
 *   --full              Run complete migration (default)
 *   --validate-only     Only validate data without migrating
 *   --rollback          Rollback previous migration
 *   --resume <file>     Resume from checkpoint file
 *   --dry-run           Simulate migration without database changes
 *   --parallel <n>      Number of parallel ticker processes (default: 5)
 *   --batch-size <n>    Batch size for database operations (default: 1000)
 *   --help              Show this help message
 * 
 * @author Seasonality SaaS Team
 * @version 1.0.0
 */

const { DataMigrator, CONFIG } = require('./migrate_old_software_data');
const { PerformanceMonitor, MemoryManager } = require('./migration-utils/performanceOptimizer');
const path = require('path');

// Parse command line arguments
function parseArguments() {
    const args = process.argv.slice(2);
    const options = {
        mode: 'full',
        validateOnly: false,
        rollback: false,
        resume: null,
        dryRun: false,
        parallelTickers: 5,
        batchSize: 1000,
        help: false
    };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];

        switch (arg) {
            case '--full':
                options.mode = 'full';
                break;
            case '--validate-only':
                options.validateOnly = true;
                break;
            case '--rollback':
                options.rollback = true;
                break;
            case '--resume':
                options.resume = args[++i];
                break;
            case '--dry-run':
                options.dryRun = true;
                break;
            case '--parallel':
                options.parallelTickers = parseInt(args[++i]) || 5;
                break;
            case '--batch-size':
                options.batchSize = parseInt(args[++i]) || 1000;
                break;
            case '--help':
            case '-h':
                options.help = true;
                break;
            default:
                console.warn(`Unknown option: ${arg}`);
        }
    }

    return options;
}

// Display help message
function showHelp() {
    console.log(`
Data Migration Tool for Seasonality SaaS

USAGE:
  node scripts/run-migration.js [options]

OPTIONS:
  --full              Run complete migration (default)
  --validate-only     Only validate data without migrating
  --rollback          Rollback previous migration
  --resume <file>     Resume from checkpoint file
  --dry-run           Simulate migration without database changes
  --parallel <n>      Number of parallel ticker processes (default: 5)
  --batch-size <n>    Batch size for database operations (default: 1000)
  --help, -h          Show this help message

EXAMPLES:
  # Run full migration
  node scripts/run-migration.js

  # Validate data only
  node scripts/run-migration.js --validate-only

  # Run with custom settings
  node scripts/run-migration.js --parallel 10 --batch-size 2000

  # Resume from checkpoint
  node scripts/run-migration.js --resume migration-checkpoint-1234567890.json

  # Rollback migration
  node scripts/run-migration.js --rollback

ENVIRONMENT VARIABLES:
  DATABASE_URL        PostgreSQL connection string
  OLD_SOFTWARE_PATH   Path to old software data (default: ./old-software)

For more information, see the migration documentation.
`);
}

// Validate environment
function validateEnvironment() {
    const issues = [];

    // Check database URL
    if (!process.env.DATABASE_URL) {
        issues.push('DATABASE_URL environment variable is required');
    }

    // Check old software path
    const oldSoftwarePath = process.env.OLD_SOFTWARE_PATH || path.join(__dirname, '..', 'old-software');
    const fs = require('fs');

    if (!fs.existsSync(oldSoftwarePath)) {
        issues.push(`Old software data directory not found: ${oldSoftwarePath}`);
    }

    // Check Node.js version
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

    if (majorVersion < 14) {
        issues.push(`Node.js version ${nodeVersion} is not supported. Please use Node.js 14 or higher.`);
    }

    return issues;
}

// Main execution function
async function main() {
    const options = parseArguments();

    if (options.help) {
        showHelp();
        return;
    }

    console.log('🚀 Seasonality Data Migration Tool');
    console.log('='.repeat(50));

    // Validate environment
    const envIssues = validateEnvironment();
    if (envIssues.length > 0) {
        console.error('❌ Environment validation failed:');
        envIssues.forEach(issue => console.error(`  - ${issue}`));
        process.exit(1);
    }

    // Update configuration based on options
    if (options.parallelTickers !== 5) {
        CONFIG.PARALLEL_TICKERS = options.parallelTickers;
    }
    if (options.batchSize !== 1000) {
        CONFIG.BATCH_SIZE = options.batchSize;
    }

    console.log('Configuration:');
    console.log(`  Parallel tickers: ${CONFIG.PARALLEL_TICKERS}`);
    console.log(`  Batch size: ${CONFIG.BATCH_SIZE}`);
    console.log(`  Mode: ${options.mode}`);
    if (options.dryRun) {
        console.log('  🔍 DRY RUN MODE - No database changes will be made');
    }
    console.log('');

    // Initialize monitoring
    const performanceMonitor = new PerformanceMonitor();
    const memoryManager = new MemoryManager(2048); // 2GB limit

    memoryManager.startMonitoring();
    performanceMonitor.startTimer('total_migration');

    try {
        const migrator = new DataMigrator();

        // Handle different modes
        if (options.rollback) {
            console.log('🔄 Starting rollback...');
            await migrator.rollbackMigration();

        } else if (options.resume) {
            console.log(`🔄 Resuming migration from: ${options.resume}`);
            await migrator.resumeMigration(options.resume);

        } else if (options.validateOnly) {
            console.log('🔍 Running validation only...');
            // Run inventory and validation without migration
            const inventory = await migrator.performInventoryAnalysis();
            console.log('\n✅ Validation completed');
            console.log(`Found ${inventory.tickers.length} tickers with ${inventory.totalFiles} files`);

        } else {
            console.log('🚀 Starting full migration...');

            if (options.dryRun) {
                console.log('🔍 DRY RUN: Simulating migration process...');
                // In dry run mode, you would simulate the migration without database writes
            }

            await migrator.migrateAllData();
        }

        performanceMonitor.endTimer('total_migration');

        console.log('\n🎉 Migration completed successfully!');

        // Display performance report
        performanceMonitor.displayReport();

        // Display memory usage
        const finalMemory = memoryManager.getMemoryUsage();
        console.log(`Final memory usage: ${finalMemory.heapUsedMB}MB`);

    } catch (error) {
        performanceMonitor.endTimer('total_migration');

        console.error('\n💥 Migration failed:', error.message);
        console.error('\nStack trace:', error.stack);

        // Display partial performance report
        console.log('\n📊 Partial Performance Report:');
        performanceMonitor.displayReport();

        process.exit(1);

    } finally {
        memoryManager.stopMonitoring();
    }
}

// Handle process signals
process.on('SIGINT', () => {
    console.log('\n⚠️  Migration interrupted by user');
    process.exit(130);
});

process.on('SIGTERM', () => {
    console.log('\n⚠️  Migration terminated');
    process.exit(143);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Run the migration
if (require.main === module) {
    main().catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}

module.exports = { main, parseArguments, validateEnvironment };