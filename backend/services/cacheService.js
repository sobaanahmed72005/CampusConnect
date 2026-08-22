/**
 * In-Memory TTL Cache Manager for High-Performance API Responses
 */

class CacheService {
  constructor() {
    this.cache = new Map()
    this.hits = 0
    this.misses = 0
  }

  set(key, value, ttlSeconds = 60) {
    const expiresAt = Date.now() + (ttlSeconds * 1000)
    this.cache.set(key, { value, expiresAt })
  }

  get(key) {
    const entry = this.cache.get(key)
    if (!entry) {
      this.misses++
      return null
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      this.misses++
      return null
    }

    this.hits++
    return entry.value
  }

  del(pattern) {
    if (!pattern) return
    if (this.cache.has(pattern)) {
      this.cache.delete(pattern)
      return
    }

    // Pattern prefix deletion
    const prefix = pattern.replace('*', '')
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key)
      }
    }
  }

  flush() {
    this.cache.clear()
    this.hits = 0
    this.misses = 0
  }

  getStats() {
    const total = this.hits + this.misses
    const hitRate = total > 0 ? (this.hits / total) * 100 : 0
    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRateRatio: `${hitRate.toFixed(1)}%`
    }
  }
}

const cacheInstance = new CacheService()

module.exports = cacheInstance
