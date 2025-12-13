require('dotenv').config({ path: './.env' })
const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const morgan = require('morgan')
const rateLimit = require('express-rate-limit')
const prisma = require('./config/database')

// Create Express app
const app = express()

// Middleware setup
app.use(cors())
app.use(helmet())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))
app.use(morgan('dev'))

// Rate limiting for API protection
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later',
})
app.use(limiter)

// Import routes
const uploadRoutes = require('./routes/uploadRoutes')
const dataRoutes = require('./routes/dataRoutes')
const healthRoutes = require('./routes/healthRoutes')
const authRoutes = require('./routes/authRoutes')
const userRoutes = require('./routes/userRoutes')

// Route setup
app.use('/api/upload', uploadRoutes)
app.use('/api/data', dataRoutes)
app.use('/api/health', healthRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)

// Health check endpoint
app.get('/', (req, res) => {
    res.json({ status: 'healthy', service: 'seasonality-backend' })
})

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack)
    res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
    })
})

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Not Found', message: 'The requested resource does not exist' })
})

// Start server
const PORT = process.env.BACKEND_PORT || 3001
app.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`)
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`)
    console.log('JWT_SECRET loaded:', process.env.JWT_SECRET ? 'YES ✓' : 'NO ✗')
    console.log('JWT_SECRET value:', process.env.JWT_SECRET)
})

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully...')
    prisma
        .$disconnect()
        .then(() => {
            console.log('Prisma disconnected. Server shutting down.')
            process.exit(0)
        })
        .catch((err) => {
            console.error('Error during Prisma disconnection:', err)
            process.exit(1)
        })
})

module.exports = { app, prisma }
