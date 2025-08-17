import { useState, useCallback, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Search, Filter, BarChart3, Settings, X } from 'lucide-react'
import { EnhancedSearchBar } from './EnhancedSearchBar'
import { SearchResults } from './SearchResults'
import { SearchFilters } from './SearchFilters'
import { useDebounce } from '@/hooks/useDebounce'
import { useSearchCache } from '@/hooks/useSearchCache'
import { supabase } from '@/integrations/supabase/client'
import type { SearchResult, SearchFilters as SearchFiltersType } from '@/types/search'

interface UnifiedSearchProps {
  initialQuery?: string
  className?: string
}

export function UnifiedSearch({ initialQuery = '', className }: UnifiedSearchProps) {
  const [query, setQuery] = useState(initialQuery)
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<SearchFiltersType>({})
  const [totalResults, setTotalResults] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)

  const debouncedQuery = useDebounce(query, 500)
  const { getCachedResult, setCachedResult, getCacheStats } = useSearchCache()

  // Execute search
  const executeSearch = useCallback(async (searchQuery: string, searchFilters: SearchFiltersType = {}, offset: number = 0) => {
    if (!searchQuery.trim()) {
      setResults([])
      setTotalResults(0)
      setHasMore(false)
      return
    }

    // Check cache for exact match
    const cacheKey = `search_${searchQuery}_${JSON.stringify(searchFilters)}_${offset}`
    const cached = getCachedResult(cacheKey)
    if (cached) {
      if (offset === 0) {
        setResults(cached.results)
        setTotalResults(cached.total)
        setHasMore(cached.hasMore)
      } else {
        setResults(prev => [...prev, ...cached.results])
        setHasMore(cached.hasMore)
      }
      return
    }

    setLoading(true)
    setError(null)

    try {
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

      if (offset === 0) {
        setResults(searchResults)
        setTotalResults(total)
      } else {
        setResults(prev => [...prev, ...searchResults])
      }
      setHasMore(more)

    } catch (error) {
      console.error('Search error:', error)
      setError('Search failed. Please try again.')
      if (offset === 0) {
        setResults([])
        setTotalResults(0)
        setHasMore(false)
      }
    } finally {
      setLoading(false)
    }
  }, [getCachedResult, setCachedResult])

  // Auto-search when query or filters change
  useEffect(() => {
    executeSearch(debouncedQuery, filters)
  }, [debouncedQuery, filters, executeSearch])

  const handleSearch = (searchQuery: string) => {
    setQuery(searchQuery)
  }

  const handleFiltersChange = (newFilters: SearchFiltersType) => {
    setFilters(newFilters)
  }

  const handleClearFilters = () => {
    setFilters({})
  }

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      executeSearch(query, filters, results.length)
    }
  }

  const handleResultClick = (result: SearchResult) => {
    // Track analytics (could be enhanced with proper analytics service)
    console.log('Search result clicked:', {
      query,
      resultId: result.id,
      resultType: result.type,
      position: results.findIndex(r => r.id === result.id)
    })
  }

  const hasActiveFilters = !!(
    filters.type?.length ||
    filters.dateRange ||
    filters.category ||
    filters.tags?.length ||
    (filters.sortBy && filters.sortBy !== 'relevance')
  )

  const cacheStats = getCacheStats()

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Search Header */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="text-xl flex items-center gap-2">
              <Search className="h-5 w-5" />
              Universal Search
            </CardTitle>
            
            <div className="flex items-center gap-2">
              {/* Cache Stats (dev mode) */}
              {process.env.NODE_ENV === 'development' && (
                <Badge variant="outline" className="text-xs">
                  Cache: {cacheStats.validEntries}/{cacheStats.totalEntries}
                </Badge>
              )}
              
              {/* Filters Toggle */}
              <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Filter className="h-4 w-4" />
                    Filters
                    {hasActiveFilters && (
                      <Badge variant="secondary" className="ml-1 text-xs h-5 w-5 p-0 flex items-center justify-center">
                        {(filters.type?.length || 0) + (filters.dateRange ? 1 : 0)}
                      </Badge>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-80">
                  <SheetHeader>
                    <SheetTitle>Search Filters</SheetTitle>
                  </SheetHeader>
                  <div className="mt-6">
                    <SearchFilters
                      filters={filters}
                      onFiltersChange={handleFiltersChange}
                      onClearFilters={handleClearFilters}
                    />
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <EnhancedSearchBar
            value={query}
            onChange={setQuery}
            onSearch={handleSearch}
            filters={filters}
            onFiltersChange={handleFiltersChange}
            placeholder="Search across all content types..."
            className="w-full"
          />
        </CardContent>
      </Card>

      {/* Search Results Summary */}
      {(query.trim() || hasActiveFilters) && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <p className="text-sm text-muted-foreground">
              {loading ? (
                'Searching...'
              ) : totalResults > 0 ? (
                `Found ${totalResults} result${totalResults === 1 ? '' : 's'}`
              ) : query.trim() ? (
                'No results found'
              ) : (
                'Enter a search term'
              )}
              {query.trim() && (
                <span className="font-medium"> for "{query}"</span>
              )}
            </p>
            
            {hasActiveFilters && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">with filters:</span>
                {filters.type?.map(type => (
                  <Badge key={type} variant="outline" className="text-xs">
                    {type.replace('_', ' ')}
                  </Badge>
                ))}
                {filters.dateRange && (
                  <Badge variant="outline" className="text-xs">
                    Date range
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearFilters}
                  className="text-xs h-6 px-2"
                >
                  <X className="h-3 w-3 mr-1" />
                  Clear
                </Button>
              </div>
            )}
          </div>
          
          {results.length > 0 && (
            <Button variant="outline" size="sm" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Export Results
            </Button>
          )}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="p-4">
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Search Results */}
      <SearchResults
        results={results}
        loading={loading && results.length === 0}
        onResultClick={handleResultClick}
      />

      {/* Load More */}
      {hasMore && !loading && (
        <div className="text-center">
          <Button
            variant="outline"
            onClick={handleLoadMore}
            className="gap-2"
          >
            Load More Results
          </Button>
        </div>
      )}

      {/* Loading More Indicator */}
      {loading && results.length > 0 && (
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground">Loading more results...</p>
        </div>
      )}
    </div>
  )
}