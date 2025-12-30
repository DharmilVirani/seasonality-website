const jwt = require('jsonwebtoken')

const authMiddleware = (requiredRole = null) => {
    return (req, res, next) => {
        try {
            // Get token from header
            const token = req.headers.authorization?.split(' ')[1]

            if (!token) {
                return res.status(401).json({
                    error: 'Unauthorized',
                    message: 'Authentication token required',
                })
            }

            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET)
            req.user = decoded

            // Check role if required
            if (requiredRole && decoded.role !== requiredRole) {
                return res.status(403).json({
                    error: 'Forbidden',
                    message: 'Insufficient permissions',
                })
            }

            next()
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({
                    error: 'Unauthorized',
                    message: 'Token expired',
                })
            }

            if (error.name === 'JsonWebTokenError') {
                return res.status(401).json({
                    error: 'Unauthorized',
                    message: 'Invalid token',
                })
            }

            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Authentication failed',
            })
        }
    }
}

module.exports = authMiddleware
