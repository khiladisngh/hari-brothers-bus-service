// middleware/memoryCache.js
// In-memory cache for Firestore data with TTL and auto-refresh

const { log, LogSeverity } = require('./logger');

/**
 * Simple in-memory cache with TTL
 */
class MemoryCache {
    constructor() {
        this.cache = new Map();
        this.stats = {
            hits: 0,
            misses: 0,
            sets: 0,
            evictions: 0
        };
    }

    /**
     * Get value from cache
     * @param {string} key - Cache key
     * @returns {*} Cached value or null if expired/missing
     */
    get(key) {
        const entry = this.cache.get(key);
        
        if (!entry) {
            this.stats.misses++;
            return null;
        }

        // Check if expired
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            this.stats.misses++;
            this.stats.evictions++;
            return null;
        }

        this.stats.hits++;
        return entry.value;
    }

    /**
     * Set value in cache with TTL
     * @param {string} key - Cache key
     * @param {*} value - Value to cache
     * @param {number} ttlSeconds - Time to live in seconds
     */
    set(key, value, ttlSeconds = 300) {
        const expiresAt = Date.now() + (ttlSeconds * 1000);
        
        this.cache.set(key, {
            value,
            expiresAt,
            createdAt: Date.now()
        });
        
        this.stats.sets++;
    }

    /**
     * Delete value from cache
     * @param {string} key - Cache key
     */
    delete(key) {
        const deleted = this.cache.delete(key);
        if (deleted) {
            this.stats.evictions++;
        }
        return deleted;
    }

    /**
     * Clear all cache entries
     */
    clear() {
        const size = this.cache.size;
        this.cache.clear();
        this.stats.evictions += size;
        
        log(
            LogSeverity.INFO,
            'Cache cleared',
            { entriesCleared: size }
        );
    }

    /**
     * Get cache statistics
     * @returns {Object} Cache stats
     */
    getStats() {
        const total = this.stats.hits + this.stats.misses;
        const hitRate = total > 0 ? (this.stats.hits / total * 100).toFixed(2) : 0;
        
        return {
            ...this.stats,
            size: this.cache.size,
            hitRate: `${hitRate}%`
        };
    }

    /**
     * Get or set pattern - fetch if not cached
     * @param {string} key - Cache key
     * @param {Function} fetchFn - Async function to fetch data
     * @param {number} ttlSeconds - Time to live in seconds
     * @param {string} correlationId - Request correlation ID
     * @returns {Promise<*>} Cached or fetched value
     */
    async getOrSet(key, fetchFn, ttlSeconds = 300, correlationId = null) {
        // Try to get from cache
        const cached = this.get(key);
        if (cached !== null) {
            log(
                LogSeverity.DEBUG,
                `Cache hit: ${key}`,
                { key, ttlSeconds },
                correlationId
            );
            return cached;
        }

        // Cache miss - fetch data
        log(
            LogSeverity.DEBUG,
            `Cache miss: ${key}`,
            { key },
            correlationId
        );

        const value = await fetchFn();
        this.set(key, value, ttlSeconds);

        return value;
    }

    /**
     * Cleanup expired entries
     */
    cleanup() {
        const now = Date.now();
        let cleaned = 0;

        for (const [key, entry] of this.cache.entries()) {
            if (now > entry.expiresAt) {
                this.cache.delete(key);
                cleaned++;
            }
        }

        if (cleaned > 0) {
            this.stats.evictions += cleaned;
            log(
                LogSeverity.INFO,
                'Cache cleanup completed',
                { entriesRemoved: cleaned, remainingEntries: this.cache.size }
            );
        }
    }
}

// Global cache instance
const cache = new MemoryCache();

// Periodic cleanup every 5 minutes
setInterval(() => {
    cache.cleanup();
}, 5 * 60 * 1000);

module.exports = { cache, MemoryCache };
