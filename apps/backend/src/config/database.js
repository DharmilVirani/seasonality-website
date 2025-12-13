const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: process.env.DATABASE_URL,
        },
    },
    log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
})

// Test connection on startup
prisma
    .$connect()
    .then(() => console.log('✅ Database connected successfully'))
    .catch((error) => {
        console.error('❌ Database connection failed:', error)
        process.exit(1)
    })

// Graceful shutdown
process.on('beforeExit', async () => {
    await prisma.$disconnect()
    console.log('🔌 Database disconnected')
})

module.exports = prisma
