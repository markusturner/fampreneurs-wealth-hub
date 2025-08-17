import { useState, useCallback, useEffect } from 'react'
import { useDebounce } from './useDebounce'
import { useSearchCache } from './useSearchCache'
import { useSearchHistory } from './useSearchHistory'
import { supabase } from '@/integrations/supabase/client'
import type { SearchResult, SearchFilters } from '@/types/search'

interface UseOptimizedSearchOptions {
  debounceMs?: number
  cacheTimeout?: number
  minQueryLength?: number
  enableAnalytics?: boolean
}

interface SearchState {
  results: SearchResult[]
  loading: boolean
  error: string | null
  totalResults: number
  hasMore: boolean
}

/**
 * Optimized search hook with debouncing, caching, and analytics
 */
export function useOptimizedSearch(options: UseOptimizedSearchOptions = {}) {
  const {
    debounceMs = 500,
    cacheTimeout = 5 * 60 * 1000, // 5 minutes
    minQueryLength = 2,
    enableAnalytics = true
  } = options

  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<SearchFilters>({})
  const [searchState, setSearchState] = useState<SearchState>({
    results: [],
    loading: false,
    error: null,
    totalResults: 0,
    hasMore: false
  })

  const debouncedQuery = useDebounce(query, debounceMs)
  const { getCachedResult, setCachedResult, getCacheStats } = useSearchCache(cacheTimeout)
  const { searchHistory, addToHistory } = useSearchHistory()

  // Execute search function
  const executeSearch = useCallback(async (
    searchQuery: string, 
    searchFilters: SearchFilters = {}, 
    offset: number = 0
  ) => {
    if (!searchQuery.trim() || searchQuery.length < minQueryLength) {
      setSearchState({
        results: [],
        loading: false,
        error: null,
        totalResults: 0,
        hasMore: false
      })
      return
    }

    // Check cache first
    const cacheKey = `search_${searchQuery}_${JSON.stringify(searchFilters)}_${offset}`
    const cached = getCachedResult(cacheKey)
    
    if (cached) {
      setSearchState(prev => ({
        ...prev,
        results: offset === 0 ? cached.results : [...prev.results, ...cached.results],
        totalResults: cached.total,
        hasMore: cached.hasMore,
        loading: false,
        error: null
      }))
      return
    }

    // Set loading state
    setSearchState(prev => ({
      ...prev,
      loading: true,
      error: null
    }))

    try {
      const startTime = Date.now()
      
      const { data, error } = await supabase.functions.invoke('unified-search', {
        body: {
          query: searchQuery,
          filters: searchFilters,
          limit: 20,
          offset
        }
      })

      if (error) throw error

      const searchResults = data.results || []
      const total = data.total || 0
      const more = data.hasMore || false

      // Cache the results
      setCachedResult(cacheKey, {
        results: searchResults,
        total,
        hasMore: more
      })

      // Update state
      setSearchState(prev => ({
        results: offset === 0 ? searchResults : [...prev.results, ...searchResults],
        loading: false,
        error: null,
        totalResults: total,
        hasMore: more
      }))

      // Add to search history if this is a new search
      if (offset === 0 && searchQuery.trim()) {
        addToHistory(searchQuery.trim())
      }

      // Track analytics
      if (enableAnalytics) {
        const duration = Date.now() - startTime
        console.log('Search analytics:', {
          query: searchQuery,
          filters: searchFilters,
          resultCount: total,
          duration,
          cached: false,
          timestamp: new Date().toISOString()
        })
      }

    } catch (error) {
      console.error('Search error:', error)
      setSearchState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Search failed. Please try again.',
        results: offset === 0 ? [] : prev.results,
        totalResults: offset === 0 ? 0 : prev.totalResults,
        hasMore: false
      }))
    }
  }, [minQueryLength, getCachedResult, setCachedResult, addToHistory, enableAnalytics])

  // Auto-execute search when debounced query or filters change
  useEffect(() => {
    executeSearch(debouncedQuery, filters)
  }, [debouncedQuery, filters, executeSearch])

  // Search function for manual triggering
  const search = useCallback((searchQuery: string, searchFilters?: SearchFilters) => {
    setQuery(searchQuery)
    if (searchFilters) {
      setFilters(searchFilters)
    }
  }, [])

  // Load more results
  const loadMore = useCallback(() => {
    if (!searchState.loading && searchState.hasMore && query.trim()) {
      executeSearch(query, filters, searchState.results.length)
    }
  }, [searchState.loading, searchState.hasMore, searchState.results.length, query, filters, executeSearch])

  // Clear search
  const clearSearch = useCallback(() => {
    setQuery('')
    setFilters({})
    setSearchState({
      results: [],
      loading: false,
      error: null,
      totalResults: 0,
      hasMore: false
    })
  }, [])

  // Update filters
  const updateFilters = useCallback((newFilters: SearchFilters) => {
    setFilters(newFilters)
  }, [])

  // Clear filters
  const clearFilters = useCallback(() => {
    setFilters({})
  }, [])

  // Track result click for analytics
  const trackResultClick = useCallback((result: SearchResult, position: number) => {
    if (enableAnalytics) {
      console.log('Search result clicked:', {
        query,
        resultId: result.id,
        resultType: result.type,
        position,
        timestamp: new Date().toISOString()
      })
    }
  }, [query, enableAnalytics])

  return {
    // Search state
    query,
    filters,
    ...searchState,
    
    // Search functions
    search,
    setQuery,
    loadMore,
    clearSearch,
    
    // Filter functions
    updateFilters,
    clearFilters,
    
    // Utility functions
    trackResultClick,
    
    // Additional data
    searchHistory,
    cacheStats: getCacheStats(),
    
    // Computed properties
    hasActiveFilters: !!(
      filters.type?.length ||
      filters.dateRange ||
      filters.category ||
      filters.tags?.length ||
      (filters.sortBy && filters.sortBy !== 'relevance')
    ),
    isSearching: !!query.trim() && query.length >= minQueryLength
  }
}