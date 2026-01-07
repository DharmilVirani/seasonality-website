#!/usr/bin/env node

/**
 * Schema Update Script
 * 
 * This script helps update the Prisma schema and push changes to the database
 * Handles the transition from basic schema to complete multi-timeframe schema
 * 
 * Usage:
 *   node scripts/update-schema.js [options]
 * 
 * Options:
 *   --generate-only    Only generate Prisma client, don't push to DB
 *   --push-only       Only push to DB, don't generate client
 *   --force           Force push even if data loss is detected
 *   --reset           Reset database and apply fresh schema
 *   --dry-run         Show what would be done without executing
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

class SchemaUpdater {
    constructor() {
        this.backendPath = path.join(__dirname, '..', 'apps', 'backend');
        this.schemaPath = path.join(this.backendPath, 'prisma', 'schema.prisma');
    }

    /**
     * Main execution function
     */
    async updateSchema() {
        console.log('🔄 Starting Prisma Schema Update...\n');

        try {
            const args = process.argv.slice(2);

            // Parse command line arguments
            const options = {
                generateOnly: args.includes('--generate-only'),
                pushOnly: args.includes('--push-only'),
                force: args.includes('--force'),
                reset: args.includes('--reset'),
                dryRun: args.includes('--dry-run')
            };

            // Validate schema file exists
            await this.validateSchema();

            if (options.reset) {
                await this.resetDatabase(options.dryRun);
            }

            if (!options.pushOnly) {
                await this.generatePrismaClient(options.dryRun);
            }

            if (!options.generateOnly) {
                await this.pushToDatabase(options.force, options.dryRun);
            }

            await this.verifySchema(options.dryRun);

            console.log('\n✅ Schema update completed successfully!');
            console.log('\n📋 Next Steps:');
            console.log('1. Review the generated migration files');
            console.log('2. Test your application with the new schema');
            console.log('3. Update your application code to use new models');
            console.log('4. Run data migration if needed: npm run migrate');

        } catch (error) {
            console.error('\n❌ Schema update failed:', error.message);
            process.exit(1);
        }
    }

    /**
     * Validate schema file
     */
    async validateSchema() {
        console.log('📋 Validating schema file...');

        try {
            const schemaExists = await fs.access(this.schemaPath).then(() => true).catch(() => false);

            if (!schemaExists) {
                throw new Error(`Schema file not found: ${this.schemaPath}`);
            }

            const schemaContent = await fs.readFile(this.schemaPath, 'utf8');

            // Basic validation checks
            if (!schemaContent.includes('generator client')) {
                throw new Error('Schema missing generator client configuration');
            }

            if (!schemaContent.includes('datasource db')) {
                throw new Error('Schema missing datasource configuration');
            }

            // Check for new models
            const newModels = [
                'DailyData', 'WeeklyData', 'MonthlyData', 'YearlyData',
                'CalculationRun', 'CalculationResult', 'ElectionDate', 'SpecialDay'
            ];

            const missingModels = newModels.filter(model => !schemaContent.includes(`model ${model}`));

            if (missingModels.length > 0) {
                console.warn(`⚠️  Missing models: ${missingModels.join(', ')}`);
            }

            console.log('  ✅ Schema file validation passed');

        } catch (error) {
            throw new Error(`Schema validation failed: ${error.message}`);
        }
    }

    /**
     * Generate Prisma client
     */
    async generatePrismaClient(dryRun = false) {
        console.log('🔧 Generating Prisma client...');

        if (dryRun) {
            console.log('  🔍 DRY RUN: Would run: prisma generate');
            return;
        }

        try {
            const command = 'npx prisma generate';
            console.log(`  📦 Running: ${command}`);

            execSync(command, {
                cwd: this.backendPath,
                stdio: 'inherit'
            });

            console.log('  ✅ Prisma client generated successfully');

        } catch (error) {
            throw new Error(`Prisma client generation failed: ${error.message}`);
        }
    }

    /**
     * Push schema to database
     */
    async pushToDatabase(force = false, dryRun = false) {
        console.log('🚀 Pushing schema to database...');

        if (dryRun) {
            console.log('  🔍 DRY RUN: Would run: prisma db push');
            return;
        }

        try {
            let command = 'npx prisma db push';

            if (force) {
                command += ' --force-reset';
                console.log('  ⚠️  Using --force-reset (this will delete all data!)');
            }

            console.log(`  📤 Running: ${command}`);

            execSync(command, {
                cwd: this.backendPath,
                stdio: 'inherit'
            });

            console.log('  ✅ Schema pushed to database successfully');

        } catch (error) {
            if (error.message.includes('data loss')) {
                console.error('\n⚠️  Database push failed due to potential data loss.');
                console.error('This is expected when adding new required fields or changing data types.');
                console.error('\nOptions:');
                console.error('1. Use --force to force the update (⚠️  WILL DELETE DATA)');
                console.error('2. Create a proper migration instead of using db push');
                console.error('3. Backup your data first, then use --force');
                console.error('\nTo create a migration instead:');
                console.error('  npx prisma migrate dev --name update_schema');
            }
            throw new Error(`Database push failed: ${error.message}`);
        }
    }

    /**
     * Reset database
     */
    async resetDatabase(dryRun = false) {
        console.log('🔄 Resetting database...');

        if (dryRun) {
            console.log('  🔍 DRY RUN: Would run: prisma db push --force-reset');
            return;
        }

        try {
            const command = 'npx prisma db push --force-reset';
            console.log(`  🗑️  Running: ${command}`);

            execSync(command, {
                cwd: this.backendPath,
                stdio: 'inherit'
            });

            console.log('  ✅ Database reset completed');

        } catch (error) {
            throw new Error(`Database reset failed: ${error.message}`);
        }
    }

    /**
     * Verify schema after update
     */
    async verifySchema(dryRun = false) {
        console.log('🔍 Verifying schema update...');

        if (dryRun) {
            console.log('  🔍 DRY RUN: Would run verification checks');
            return;
        }

        try {
            // Check if Prisma client can be imported
            const command = 'node -e "const { PrismaClient } = require(\'@prisma/client\'); console.log(\'✅ Prisma client import successful\')"';

            execSync(command, {
                cwd: this.backendPath,
                stdio: 'inherit'
            });

            console.log('  ✅ Schema verification completed');

        } catch (error) {
            console.warn('  ⚠️  Schema verification warning:', error.message);
        }
    }

    /**
     * Show help information
     */
    static showHelp() {
        console.log(`
Prisma Schema Update Script

Usage:
  node scripts/update-schema.js [options]

Options:
  --generate-only    Only generate Prisma client, don't push to DB
  --push-only       Only push to DB, don't generate client  
  --force           Force push even if data loss is detected (⚠️  DANGEROUS)
  --reset           Reset database and apply fresh schema (⚠️  DELETES ALL DATA)
  --dry-run         Show what would be done without executing
  --help            Show this help message

Examples:
  # Standard update (generate + push)
  node scripts/update-schema.js

  # Only generate client
  node scripts/update-schema.js --generate-only

  # Force update (ignoring data loss warnings)
  node scripts/update-schema.js --force

  # Reset database and apply fresh schema
  node scripts/update-schema.js --reset

  # Dry run to see what would happen
  node scripts/update-schema.js --dry-run

⚠️  WARNING: --force and --reset options will delete existing data!
Always backup your database before using these options.
        `);
    }
}

// Main execution
async function main() {
    const args = process.argv.slice(2);

    if (args.includes('--help') || args.includes('-h')) {
        SchemaUpdater.showHelp();
        return;
    }

    const updater = new SchemaUpdater();
    await updater.updateSchema();
}

// Run if this file is executed directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = SchemaUpdater;