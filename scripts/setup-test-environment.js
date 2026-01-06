#!/usr/bin/env node

/**
 * Test Environment Setup Script
 * 
 * Sets up the complete testing environment for the backend
 * Handles database setup, sample data creation, and environment validation
 * 
 * Usage:
 *   node scripts/setup-test-environment.js [options]
 * 
 * Options:
 *   --reset         Reset database and start fresh
 *   --sample-data   Create sample data for testing
 *   --validate      Validate environment setup
 *   --help          Show help
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs').promises;
const path = require('path');

class TestEnvironmentSetup {
    constructor() {
        this.prisma = new PrismaClient();
    }

    /**
     * Main setup function
     */
    async setup(options = {}) {
        console.log('🔧 Setting up test environment...');
        console.log('='.repeat(50));

        try {
            if (options.validate) {
                await this.validateEnvironment();
            }

            if (options.reset) {
                await this.resetDatabase();
            }

            await this.setupDatabase();

            if (options.sampleData) {
                await this.createSampleData();
            }

            await this.validateSetup();

            console.log('\n✅ Test environment setup completed successfully!');
            console.log('\n🚀 You can now run tests with:');
            console.log('   node scripts/test-backend.js');

        } catch (error) {
            console.error('❌ Setup failed:', error.message);
            process.exit(1);
        } finally {
            await this.prisma.$disconnect();
        }
    }

    /**
     * Validate environment prerequisites
     */
    async validateEnvironment() {
        console.log('\n🔍 Validating environment...');

        // Check Node.js version
        const nodeVersion = process.version;
        console.log(`Node.js version: ${nodeVersion}`);

        // Check environment variables
        const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET'];
        const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

        if (missingVars.length > 0) {
            throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
        }

        console.log('✅ Environment variables validated');

        // Check database connection
        try {
            await this.prisma.$connect();
            console.log('✅ Database connection successful');
        } catch (error) {
            throw new Error(`Database connection failed: ${error.message}`);
        }

        // Check if test data directory exists
        const testDataDir = path.join(__dirname, '..', 'test-data');
        try {
            await fs.access(testDataDir);
            console.log('✅ Test data directory exists');
        } catch (error) {
            console.log('⚠️  Test data directory not found, will create it');
            await fs.mkdir(testDataDir, { recursive: true });
        }
    }

    /**
     * Reset database
     */
    async resetDatabase() {
        console.log('\n🗑️  Resetting database...');

        try {
            // Delete all data in reverse dependency order
            await this.prisma.calculationResult.deleteMany({});
            await this.prisma.calculationRun.deleteMany({});
            await this.prisma.uploadedFile.deleteMany({});
            await this.prisma.uploadBatch.deleteMany({});
            await this.prisma.watchlistItem.deleteMany({});
            await this.prisma.watchlist.deleteMany({});
            await this.prisma.basketItem.deleteMany({});
            await this.prisma.basket.deleteMany({});
            await this.prisma.specialDay.deleteMany({});
            await this.prisma.electionDate.deleteMany({});
            await this.prisma.yearlyData.deleteMany({});
            await this.prisma.monthlyData.deleteMany({});
            await this.prisma.weeklyData.deleteMany({});
            await this.prisma.dailyData.deleteMany({});
            await this.prisma.seasonalityData.deleteMany({});
            await this.prisma.ticker.deleteMany({});
            await this.prisma.user.deleteMany({});

            console.log('✅ Database reset completed');
        } catch (error) {
            console.warn('⚠️  Database reset warning:', error.message);
        }
    }

    /**
     * Setup database schema
     */
    async setupDatabase() {
        console.log('\n🏗️  Setting up database schema...');

        try {
            // The schema should already be applied via Prisma migrations
            // Just verify that key tables exist by running simple queries

            await this.prisma.user.findMany({ take: 1 });
            await this.prisma.ticker.findMany({ take: 1 });

            console.log('✅ Database schema is ready');
        } catch (error) {
            throw new Error(`Database schema setup failed: ${error.message}`);
        }
    }

    /**
     * Create sample data for testing
     */
    async createSampleData() {
        console.log('\n📊 Creating sample data...');

        try {
            // Create test users
            await this.createTestUsers();

            // Create test tickers
            await this.createTestTickers();

            // Create sample market data
            await this.createSampleMarketData();

            // Create special days
            await this.createSpecialDays();

            console.log('✅ Sample data created successfully');
        } catch (error) {
            console.warn('⚠️  Sample data creation warning:', error.message);
        }
    }

    /**
     * Create test users
     */
    async createTestUsers() {
        const testUsers = [
            {
                name: 'Admin User',
                email: 'admin@test.com',
                password: '$2b$10$rQZ9QmjlhZZvQmjlhZZvQOeH8B8B8B8B8B8B8B8B8B8B8B8B8B8B8', // password123
                role: 'ADMIN',
                status: 'ACTIVE'
            },
            {
                name: 'Research User',
                email: 'research@test.com',
                password: '$2b$10$rQZ9QmjlhZZvQmjlhZZvQOeH8B8B8B8B8B8B8B8B8B8B8B8B8B8B8', // password123
                role: 'RESEARCH_TEAM',
                status: 'ACTIVE'
            },
            {
                name: 'Regular User',
                email: 'user@test.com',
                password: '$2b$10$rQZ9QmjlhZZvQmjlhZZvQOeH8B8B8B8B8B8B8B8B8B8B8B8B8B8B8', // password123
                role: 'USER',
                status: 'ACTIVE'
            }
        ];

        for (const user of testUsers) {
            try {
                await this.prisma.user.upsert({
                    where: { email: user.email },
                    update: user,
                    create: user
                });
                console.log(`  ✅ Created user: ${user.email}`);
            } catch (error) {
                console.log(`  ⚠️  User creation warning for ${user.email}:`, error.message);
            }
        }
    }

    /**
     * Create test tickers
     */
    async createTestTickers() {
        const testTickers = [
            {
                symbol: 'NIFTY',
                name: 'Nifty 50',
                sector: 'Index',
                exchange: 'NSE',
                isActive: true
            },
            {
                symbol: 'BANKNIFTY',
                name: 'Bank Nifty',
                sector: 'Banking',
                exchange: 'NSE',
                isActive: true
            },
            {
                symbol: 'RELIANCE',
                name: 'Reliance Industries Limited',
                sector: 'Oil & Gas',
                exchange: 'NSE',
                isActive: true
            },
            {
                symbol: 'TCS',
                name: 'Tata Consultancy Services',
                sector: 'IT',
                exchange: 'NSE',
                isActive: true
            },
            {
                symbol: 'INFY',
                name: 'Infosys Limited',
                sector: 'IT',
                exchange: 'NSE',
                isActive: true
            }
        ];

        for (const ticker of testTickers) {
            try {
                await this.prisma.ticker.upsert({
                    where: { symbol: ticker.symbol },
                    update: ticker,
                    create: ticker
                });
                console.log(`  ✅ Created ticker: ${ticker.symbol}`);
            } catch (error) {
                console.log(`  ⚠️  Ticker creation warning for ${ticker.symbol}:`, error.message);
            }
        }
    }

    /**
     * Create sample market data
     */
    async createSampleMarketData() {
        const tickers = await this.prisma.ticker.findMany();

        if (tickers.length === 0) {
            console.log('  ⚠️  No tickers found, skipping market data creation');
            return;
        }

        // Create sample daily data for the last 30 days
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);

        for (const ticker of tickers.slice(0, 2)) { // Limit to first 2 tickers for testing
            const basePrice = ticker.symbol === 'NIFTY' ? 21000 :
                ticker.symbol === 'BANKNIFTY' ? 45000 : 2500;

            for (let i = 0; i < 30; i++) {
                const date = new Date(startDate);
                date.setDate(date.getDate() + i);

                // Skip weekends
                if (date.getDay() === 0 || date.getDay() === 6) continue;

                const randomFactor = 0.98 + Math.random() * 0.04; // ±2% variation
                const open = basePrice * randomFactor;
                const close = open * (0.99 + Math.random() * 0.02); // ±1% from open
                const high = Math.max(open, close) * (1 + Math.random() * 0.01);
                const low = Math.min(open, close) * (1 - Math.random() * 0.01);
                const volume = Math.floor(1000000 + Math.random() * 500000);

                try {
                    await this.prisma.dailyData.upsert({
                        where: {
                            date_tickerId: {
                                date: date,
                                tickerId: ticker.id
                            }
                        },
                        update: {
                            open: parseFloat(open.toFixed(2)),
                            high: parseFloat(high.toFixed(2)),
                            low: parseFloat(low.toFixed(2)),
                            close: parseFloat(close.toFixed(2)),
                            volume: volume,
                            openInterest: 0
                        },
                        create: {
                            date: date,
                            tickerId: ticker.id,
                            open: parseFloat(open.toFixed(2)),
                            high: parseFloat(high.toFixed(2)),
                            low: parseFloat(low.toFixed(2)),
                            close: parseFloat(close.toFixed(2)),
                            volume: volume,
                            openInterest: 0
                        }
                    });
                } catch (error) {
                    // Skip duplicate entries
                    continue;
                }
            }

            console.log(`  ✅ Created daily data for: ${ticker.symbol}`);
        }
    }

    /**
     * Create special days data
     */
    async createSpecialDays() {
        const specialDays = [
            {
                date: new Date('2024-01-26'),
                name: 'Republic Day',
                type: 'NATIONAL_HOLIDAY',
                description: 'Republic Day of India',
                isMarketHoliday: true
            },
            {
                date: new Date('2024-03-08'),
                name: 'Holi',
                type: 'FESTIVAL',
                description: 'Festival of Colors',
                isMarketHoliday: true
            },
            {
                date: new Date('2024-08-15'),
                name: 'Independence Day',
                type: 'NATIONAL_HOLIDAY',
                description: 'Independence Day of India',
                isMarketHoliday: true
            }
        ];

        for (const day of specialDays) {
            try {
                await this.prisma.specialDay.upsert({
                    where: {
                        date_name: {
                            date: day.date,
                            name: day.name
                        }
                    },
                    update: day,
                    create: day
                });
                console.log(`  ✅ Created special day: ${day.name}`);
            } catch (error) {
                console.log(`  ⚠️  Special day creation warning for ${day.name}:`, error.message);
            }
        }

        // Create election dates
        const electionDates = [
            {
                date: new Date('2024-04-15'),
                type: 'GENERAL',
                description: 'General Election 2024 - Phase 1',
                isNational: true
            },
            {
                date: new Date('2024-04-22'),
                type: 'GENERAL',
                description: 'General Election 2024 - Phase 2',
                isNational: true
            }
        ];

        for (const election of electionDates) {
            try {
                await this.prisma.electionDate.upsert({
                    where: {
                        date_type: {
                            date: election.date,
                            type: election.type
                        }
                    },
                    update: election,
                    create: election
                });
                console.log(`  ✅ Created election date: ${election.description}`);
            } catch (error) {
                console.log(`  ⚠️  Election date creation warning:`, error.message);
            }
        }
    }

    /**
     * Validate setup
     */
    async validateSetup() {
        console.log('\n✅ Validating setup...');

        try {
            // Check user count
            const userCount = await this.prisma.user.count();
            console.log(`  Users: ${userCount}`);

            // Check ticker count
            const tickerCount = await this.prisma.ticker.count();
            console.log(`  Tickers: ${tickerCount}`);

            // Check daily data count
            const dailyDataCount = await this.prisma.dailyData.count();
            console.log(`  Daily data records: ${dailyDataCount}`);

            // Check special days count
            const specialDaysCount = await this.prisma.specialDay.count();
            console.log(`  Special days: ${specialDaysCount}`);

            if (userCount === 0 || tickerCount === 0) {
                throw new Error('Setup validation failed: Missing essential data');
            }

            console.log('✅ Setup validation passed');
        } catch (error) {
            throw new Error(`Setup validation failed: ${error.message}`);
        }
    }

    /**
     * Show help
     */
    static showHelp() {
        console.log(`
Test Environment Setup Script

Usage:
  node scripts/setup-test-environment.js [options]

Options:
  --reset         Reset database and start fresh
  --sample-data   Create sample data for testing
  --validate      Validate environment setup
  --help          Show this help message

Examples:
  node scripts/setup-test-environment.js --reset --sample-data
  node scripts/setup-test-environment.js --validate
        `);
    }
}

// Main execution
async function main() {
    const args = process.argv.slice(2);

    if (args.includes('--help') || args.includes('-h')) {
        TestEnvironmentSetup.showHelp();
        return;
    }

    const options = {
        reset: args.includes('--reset'),
        sampleData: args.includes('--sample-data'),
        validate: args.includes('--validate') || args.length === 0
    };

    const setup = new TestEnvironmentSetup();
    await setup.setup(options);
}

// Run if this file is executed directly
if (require.main === module) {
    main().catch(error => {
        console.error('❌ Setup script failed:', error);
        process.exit(1);
    });
}

module.exports = TestEnvironmentSetup;