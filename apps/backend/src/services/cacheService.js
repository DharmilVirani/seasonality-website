/**
 * Cache Service - Redis-based Caching Layer
 * 
 * Provides high-performance caching with Redis integration
 * Implements cache strategies, TTL management, and performance monitoring
 * 
 * @author Seasonality SaaS Team
 * @version 1.0.0
 */

const Redis = require('ioredis');

/**
 * CacheService Class
 * Redis-based caching with performance optimization
 */
class CacheService {
    constructor() {
        // Initialize Redis connection
        this.redis = new Redis({
            host: process.env.REDIS_HOST || 'localhost',
            port: process.env.REDIS_PORT || 6379,
            password: process.env.REDIS_PASSWORD || undefined,
            db: process.env.REDIS_DB || 0,
            retryDelayOnFailover: 100,
            maxRetriesPerRequest: 3,
            lazyConnect: true
        });

        // Cache performance metrics
        this.metrics = {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0,
            errors: 0,
            totalOperations: 0
        };

        // Default cache settings
        this.defaultTTL = 3600; // 1 hour
        this.keyPrefix = 'seasonality:';

        // Setup Redis event handlers
        this._setupEventHandlers();
    }

    /**
     * Get value from cache
     * 
     * @param {string} key - Cache key
     * @returns {*} Cached value or null
     */
    async get(key) {
        try {
            const fullKey = this._buildKey(key);
            const value = await this.redis.get(fullKey);

            this.metrics.totalOperations++;

            if (value === null) {
                this.metrics.misses++;
                return null;
            }

            this.metrics.hits++;

            // Try to parse JSON, return as-is if not JSON
            try {
                return JSON.parse(value);
            } catch {
                return value;
            }

        } catch (error) {
            this.metrics.errors++;
            console.error('Cache get error:', error);
            return null; // Fail gracefully
        }
    }

    /**
     * Set value in cache
     * 
     * @param {string} key - Cache key
     * @param {*} value - Value to cache
     * @param {number} ttl - Time to live in seconds
     * @returns {boolean} Success status
     */
    async set(key, value, ttl = this.defaultTTL) {
        try {
            const fullKey = this._buildKey(key);
            const serializedValue = typeof value === 'string' ? value : JSON.stringify(value);

            await this.redis.setex(fullKey, ttl, serializedValue);

            this.metrics.sets++;
            this.metrics.totalOperations++;

            return true;

        } catch (error) {
            this.metrics.errors++;
            console.error('Cache set error:', error);
            return false;
        }
    }

    /**
     * Delete value from cache
     * 
     * @param {string} key - Cache key
     * @returns {boolean} Success status
     */
    async delete(key) {
        try {
            const fullKey = this._buildKey(key);
            const result = await this.redis.del(fullKey);

            this.metrics.deletes++;
            this.metrics.totalOperations++;

            return result > 0;

        } catch (error) {
            this.metrics.errors++;
            console.error('Cache delete error:', error);
            return false;
        }
    }

    /**
     * Check if key exists in cache
     * 
     * @param {string} key - Cache key
     * @returns {boolean} Existence status
     */
    async exists(key) {
        try {
            const fullKey = this._buildKey(key);
            const result = await this.redis.exists(fullKey);

            this.metrics.totalOperations++;

            return result === 1;

        } catch (error) {
            this.metrics.errors++;
            console.error('Cache exists error:', error);
            return false;
        }
    }

    /**
     * Set multiple values at once
     * 
     * @param {Object} keyValuePairs - Object with key-value pairs
     * @param {number} ttl - Time to live in seconds
     * @returns {boolean} Success status
     */
    async setMultiple(keyValuePairs, ttl = this.defaultTTL) {
        try {
            const pipeline = this.redis.pipeline();

            Object.entries(keyValuePairs).forEach(([key, value]) => {
                const fullKey = this._buildKey(key);
                const serializedValue = typeof value === 'string' ? value : JSON.stringify(value);
                pipeline.setex(fullKey, ttl, serializedValue);
            });

            await pipeline.exec();

            this.metrics.sets += Object.keys(keyValuePairs).length;
            this.metrics.totalOperations += Object.keys(keyValuePairs).length;

            return true;

        } catch (error) {
            this.metrics.errors++;
            console.error('Cache setMultiple error:', error);
            return false;
        }
    }

    /**
     * Get multiple values at once
     * 
     * @param {Array<string>} keys - Array of cache keys
     * @returns {Object} Object with key-value pairs
     */
    async getMultiple(keys) {
        try {
            const fullKeys = keys.map(key => this._buildKey(key));
            const values = await this.redis.mget(...fullKeys);

            this.metrics.totalOperations += keys.length;

            const result = {};
            keys.forEach((key, index) => {
                const value = values[index];

                if (value === null) {
                    this.metrics.misses++;
                    result[key] = null;
                } else {
                    this.metrics.hits++;
                    try {
                        result[key] = JSON.parse(value);
                    } catch {
                        result[key] = value;
                    }
                }
            });

            return result;

        } catch (error) {
            this.metrics.errors++;
            console.error('Cache getMultiple error:', error);
            return {};
        }
    }

    /**
     * Delete multiple keys
     * 
     * @param {Array<string>} keys - Array of cache keys
     * @returns {number} Number of deleted keys
     */
    async deleteMultiple(keys) {
        try {
            const fullKeys = keys.map(key => this._buildKey(key));
            const result = await this.redis.del(...fullKeys);

            this.metrics.deletes += result;
            this.metrics.totalOperations += keys.length;

            return result;

        } catch (error) {
            this.metrics.errors++;
            console.error('Cache deleteMultiple error:', error);
            return 0;
        }
    }

    /**
     * Clear all cache entries with prefix
     * 
     * @param {string} pattern - Pattern to match (optional)
     * @returns {number} Number of deleted keys
     */
    async clear(pattern = '*') {
        try {
            const fullPattern = this._buildKey(pattern);
            const keys = await this.redis.keys(fullPattern);

            if (keys.length === 0) {
                return 0;
            }

            const result = await this.redis.del(...keys);

            this.metrics.deletes += result;
            this.metrics.totalOperations += keys.length;

            return result;

        } catch (error) {
            this.metrics.errors++;
            console.error('Cache clear error:', error);
            return 0;
        }
    }

    /**
     * Get cache statistics
     * 
     * @returns {Object} Cache statistics
     */
    async getStats() {
        try {
            const info = await this.redis.info('memory');
            const keyspace = await this.redis.info('keyspace');

            // Parse Redis info
            const memoryUsed = this._parseInfoValue(info, 'used_memory_human');
            const totalKeys = this._parseKeyspaceInfo(keyspace);

            return {
                performance: {
                    ...this.metrics,
                    hitRate: this.metrics.totalOperations > 0 ?
                        ((this.metrics.hits / (this.metrics.hits + this.metrics.misses)) * 100).toFixed(2) + '%' : '0%',
                    errorRate: this.metrics.totalOperations > 0 ?
                        ((this.metrics.errors / this.metrics.totalOperations) * 100).toFixed(2) + '%' : '0%'
                },
                redis: {
                    memoryUsed,
                    totalKeys,
                    connected: this.redis.status === 'ready'
                }
            };

        } catch (error) {
            console.error('Error getting cache stats:', error);
            return {
                performance: this.metrics,
                redis: {
                    connected: false,
                    error: error.message
                }
            };
        }
    }

    /**
     * Increment a numeric value in cache
     * 
     * @param {string} key - Cache key
     * @param {number} increment - Increment value (default: 1)
     * @returns {number} New value after increment
     */
    async increment(key, increment = 1) {
        try {
            const fullKey = this._buildKey(key);
            const result = await this.redis.incrby(fullKey, increment);

            this.metrics.totalOperations++;

            return result;

        } catch (error) {
            this.metrics.errors++;
            console.error('Cache increment error:', error);
            return null;
        }
    }

    /**
     * Set expiration time for a key
     * 
     * @param {string} key - Cache key
     * @param {number} ttl - Time to live in seconds
     * @returns {boolean} Success status
     */
    async expire(key, ttl) {
        try {
            const fullKey = this._buildKey(key);
            const result = await this.redis.expire(fullKey, ttl);

            this.metrics.totalOperations++;

            return result === 1;

        } catch (error) {
            this.metrics.errors++;
            console.error('Cache expire error:', error);
            return false;
        }
    }

    /**
     * Get remaining TTL for a key
     * 
     * @param {string} key - Cache key
     * @returns {number} TTL in seconds (-1 if no expiry, -2 if key doesn't exist)
     */
    async getTTL(key) {
        try {
            const fullKey = this._buildKey(key);
            const result = await this.redis.ttl(fullKey);

            this.metrics.totalOperations++;

            return result;

        } catch (error) {
            this.metrics.errors++;
            console.error('Cache getTTL error:', error);
            return -2;
        }
    }

    /**
     * Ping Redis server
     * 
     * @returns {boolean} Connection status
     */
    async ping() {
        try {
            const result = await this.redis.ping();
            return result === 'PONG';

        } catch (error) {
            console.error('Cache ping error:', error);
            return false;
        }
    }

    /**
     * Get cache performance metrics
     * 
     * @returns {Object} Performance metrics
     */
    getPerformanceMetrics() {
        return {
            ...this.metrics,
            hitRate: this.metrics.totalOperations > 0 ?
                ((this.metrics.hits / (this.metrics.hits + this.metrics.misses)) * 100).toFixed(2) + '%' : '0%',
            errorRate: this.metrics.totalOperations > 0 ?
                ((this.metrics.errors / this.metrics.totalOperations) * 100).toFixed(2) + '%' : '0%'
        };
    }

    /**
     * Reset performance metrics
     */
    resetMetrics() {
        this.metrics = {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0,
            errors: 0,
            totalOperations: 0
        };
    }

    // Private helper methods

    /**
     * Build full cache key with prefix
     */
    _buildKey(key) {
        return `${this.keyPrefix}${key}`;
    }

    /**
     * Setup Redis event handlers
     */
    _setupEventHandlers() {
        this.redis.on('connect', () => {
            console.log('✅ Redis connected');
        });

        this.redis.on('ready', () => {
            console.log('✅ Redis ready');
        });

        this.redis.on('error', (error) => {
            console.error('❌ Redis error:', error);
            this.metrics.errors++;
        });

        this.redis.on('close', () => {
            console.log('⚠️  Redis connection closed');
        });

        this.redis.on('reconnecting', () => {
            console.log('🔄 Redis reconnecting...');
        });
    }

    /**
     * Parse Redis INFO command value
     */
    _parseInfoValue(info, key) {
        const lines = info.split('\r\n');
        const line = lines.find(l => l.startsWith(`${key}:`));
        return line ? line.split(':')[1] : 'unknown';
    }

    /**
     * Parse Redis keyspace info
     */
    _parseKeyspaceInfo(keyspace) {
        const lines = keyspace.split('\r\n');
        const dbLine = lines.find(l => l.startsWith('db0:'));
        if (dbLine) {
            const match = dbLine.match(/keys=(\d+)/);
            return match ? parseInt(match[1]) : 0;
        }
        return 0;
    }

    /**
     * Cleanup resources
     */
    async cleanup() {
        try {
            await this.redis.quit();
            console.log('✅ CacheService cleanup completed');
        } catch (error) {
            console.error('❌ Error during CacheService cleanup:', error);
        }
    }
}

module.exports = CacheService;