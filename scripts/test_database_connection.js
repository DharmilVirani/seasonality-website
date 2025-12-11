const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function testDatabaseConnection() {
    console.log('🔄 Testing database connection...')

    try {
        // Test basic connection
        await prisma.$connect()
        console.log('✅ Database connection established')

        // Test query execution
        await prisma.$queryRaw`SELECT 1`
        console.log('✅ Database query successful')

        // Test table access
        const tickerCount = await prisma.ticker.count()
        const dataCount = await prisma.seasonalityData.count()

        console.log('📊 Database statistics:')
        console.log(`   Tickers: ${tickerCount}`)
        console.log(`   Seasonality Data: ${dataCount}`)

        // Test sample data insertion (if tables are empty)
        if (tickerCount === 0) {
            console.log('📝 Inserting test data...')
            const testTicker = await prisma.ticker.create({
                data: {
                    symbol: 'TEST',
                },
            })

            const testData = await prisma.seasonalityData.create({
                data: {
                    date: new Date(),
                    open: 100.0,
                    high: 105.0,
                    low: 95.0,
                    close: 102.5,
                    volume: 1000000,
                    openInterest: 5000,
                    tickerId: testTicker.id,
                },
            })

            console.log('✅ Test data inserted successfully')
        }

        console.log('🎉 Database connection test completed successfully!')
        return true
    } catch (error) {
        console.error('❌ Database connection test failed:', error.message)
        console.log('🔍 Troubleshooting tips:')
        console.log('   1. Check if PostgreSQL service is running')
        console.log('   2. Verify database credentials in .env file')
        console.log('   3. Ensure database user has proper permissions')
        console.log('   4. Check network connectivity if using remote database')
        return false
    } finally {
        await prisma.$disconnect()
        console.log('🔌 Database connection closed')
    }
}

// Run the test
testDatabaseConnection()
    .then((success) => process.exit(success ? 0 : 1))
    .catch(() => process.exit(1))
