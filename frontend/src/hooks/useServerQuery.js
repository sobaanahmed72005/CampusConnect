import { useState, useEffect, useCallback } from 'react'

// Lightweight In-Memory Server State Cache with TTL
const queryCache = new Map()
const CACHE_TTL_MS = 30000 // 30-second stale window

export function invalidateCacheKey(keyPrefix) {
  for (const key of queryCache.keys()) {
    if (key.startsWith(keyPrefix)) {
      queryCache.delete(key)
    }
  }
}

export function useServerQuery(cacheKey, fetcherFn, options = {}) {
  const { enabled = true, initialData = null } = options
  const [data, setData] = useState(() => {
    const cached = queryCache.get(cacheKey)
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
      return cached.data
    }
    return initialData
  })
  const [loading, setLoading] = useState(!data && enabled)
  const [error, setError] = useState(null)

  const executeFetch = useCallback(async (isBackground = false) => {
    if (!enabled) return
    if (!isBackground) setLoading(true)
    setError(null)

    try {
      const result = await fetcherFn()
      queryCache.set(cacheKey, { data: result, timestamp: Date.now() })
      setData(result)
    } catch (err) {
      setError(err?.response?.data?.error?.message || err.message || 'Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }, [cacheKey, fetcherFn, enabled])

  useEffect(() => {
    const cached = queryCache.get(cacheKey)
    if (!cached || (Date.now() - cached.timestamp >= CACHE_TTL_MS)) {
      executeFetch(Boolean(cached))
    }
  }, [cacheKey, executeFetch])

  const mutateOptimistic = useCallback((optimisticData, mutationFn) => {
    const previousData = data
    setData(optimisticData)
    queryCache.set(cacheKey, { data: optimisticData, timestamp: Date.now() })

    return mutationFn()
      .then(result => {
        executeFetch(true)
        return result
      })
      .catch(err => {
        setData(previousData)
        queryCache.set(cacheKey, { data: previousData, timestamp: Date.now() })
        throw err
      })
  }, [data, cacheKey, executeFetch])

  return {
    data,
    loading,
    error,
    refetch: () => executeFetch(false),
    mutateOptimistic
  }
}
