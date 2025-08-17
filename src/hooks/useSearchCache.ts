import { useState, useCallback } from 'react'

interface CacheEntry {
  data: any
  timestamp: number
  expiresAt: number
}

/**
 * Custom hook for caching search results to improve performance
 * @param cacheTimeout - Cache timeout in milliseconds (default: 5 minutes)
 */
export function useSearchCache(cacheTimeout: number = 5 * 60 * 1000) {
  const [cache, setCache] = useState<Map<string, CacheEntry>>(new Map())

  const getCachedResult = useCallback((key: string) => {
    const entry = cache.get(key)
    if (!entry) return null
    
    if (Date.now() > entry.expiresAt) {
      cache.delete(key)
      setCache(new Map(cache))
      return null
    }
    
    return entry.data
  }, [cache])

  const setCachedResult = useCallback((key: string, data: any) => {
    const entry: CacheEntry = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + cacheTimeout
    }
    
    setCache(prev => new Map(prev.set(key, entry)))
  }, [cacheTimeout])

  const clearCache = useCallback(() => {
    setCache(new Map())
  }, [])

  const getCacheStats = useCallback(() => {
    const now = Date.now()
    const validEntries = Array.from(cache.values()).filter(entry => now < entry.expiresAt)
    return {
      totalEntries: cache.size,
      validEntries: validEntries.length,
      expiredEntries: cache.size - validEntries.length
    }
  }, [cache])

  return {
    getCachedResult,
    setCachedResult,
    clearCache,
    getCacheStats
  }
}