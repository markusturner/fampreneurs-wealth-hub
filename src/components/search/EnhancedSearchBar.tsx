import { useState, useCallback, useEffect, useRef } from 'react'
import { Search, X, Clock, Filter, Command, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Command as CommandPrimitive, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useDebounce } from '@/hooks/useDebounce'
import { useSearchHistory } from '@/hooks/useSearchHistory'
import { useSearchCache } from '@/hooks/useSearchCache'
import { supabase } from '@/integrations/supabase/client'
import type { SearchSuggestion, SearchFilters } from '@/types/search'

interface EnhancedSearchBarProps {
  value: string
  onChange: (value: string) => void
  onSearch: (query: string) => void
  onFiltersChange?: (filters: SearchFilters) => void
  filters?: SearchFilters
  placeholder?: string
  showHistory?: boolean
  showSuggestions?: boolean
  className?: string
}

export function EnhancedSearchBar({
  value,
  onChange,
  onSearch,
  onFiltersChange,
  filters,
  placeholder = "Search posts, courses, members...",
  showHistory = true,
  showSuggestions = true,
  className
}: EnhancedSearchBarProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  
  const debouncedValue = useDebounce(value, 300)
  const { searchHistory, addToHistory, removeFromHistory } = useSearchHistory()
  const { getCachedResult, setCachedResult } = useSearchCache()

  // Fetch search suggestions
  const fetchSuggestions = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSuggestions([])
      return
    }

    // Check cache first
    const cacheKey = `suggestions_${query.toLowerCase()}`
    const cached = getCachedResult(cacheKey)
    if (cached) {
      setSuggestions(cached)
      return
    }

    setLoading(true)
    try {
      const suggestions: SearchSuggestion[] = []
      const searchTerm = query.toLowerCase()

      // Get suggestions from different content types
      const [coursesRes, postsRes, profilesRes] = await Promise.all([
        supabase
          .from('courses')
          .select('title')
          .ilike('title', `%${searchTerm}%`)
          .limit(3),
        supabase
          .from('community_posts')
          .select('content')
          .ilike('content', `%${searchTerm}%`)
          .limit(3),
        supabase
          .from('profiles')
          .select('display_name')
          .ilike('display_name', `%${searchTerm}%`)
          .limit(3)
      ])

      // Add course suggestions
      coursesRes.data?.forEach(course => {
        if (course.title.toLowerCase().includes(searchTerm)) {
          suggestions.push({
            text: course.title,
            type: 'query'
          })
        }
      })

      // Add profile suggestions
      profilesRes.data?.forEach(profile => {
        if (profile.display_name?.toLowerCase().includes(searchTerm)) {
          suggestions.push({
            text: profile.display_name,
            type: 'query'
          })
        }
      })

      // Extract keywords from posts for query suggestions
      postsRes.data?.forEach(post => {
        const words = post.content.toLowerCase().split(/\s+/)
        words.forEach(word => {
          if (word.includes(searchTerm) && word.length > 3 && word.length < 20) {
            const existing = suggestions.find(s => s.text === word)
            if (!existing) {
              suggestions.push({
                text: word,
                type: 'query'
              })
            }
          }
        })
      })

      // Limit and deduplicate
      const uniqueSuggestions = suggestions
        .filter((suggestion, index, self) => 
          index === self.findIndex(s => s.text.toLowerCase() === suggestion.text.toLowerCase())
        )
        .slice(0, 6)

      setSuggestions(uniqueSuggestions)
      setCachedResult(cacheKey, uniqueSuggestions)
    } catch (error) {
      console.error('Error fetching suggestions:', error)
    } finally {
      setLoading(false)
    }
  }, [getCachedResult, setCachedResult])

  // Fetch suggestions when debounced value changes
  useEffect(() => {
    if (showSuggestions && isOpen) {
      fetchSuggestions(debouncedValue)
    }
  }, [debouncedValue, fetchSuggestions, showSuggestions, isOpen])

  const handleSearch = (query: string) => {
    if (query.trim()) {
      addToHistory(query.trim())
      onSearch(query.trim())
      setIsOpen(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSearch(value)
    } else if (e.key === 'Escape') {
      setIsOpen(false)
      inputRef.current?.blur()
    }
  }

  // Show search history and suggestions
  const showHistorySuggestions = showHistory && searchHistory.length > 0 && !debouncedValue.trim()
  const showQuerySuggestions = showSuggestions && suggestions.length > 0 && debouncedValue.trim()

  const hasActiveFilters = !!(
    filters?.type?.length ||
    filters?.dateRange ||
    filters?.category ||
    (filters?.sortBy && filters?.sortBy !== 'relevance')
  )

  return (
    <div className={`relative ${className}`}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              type="search"
              placeholder={placeholder}
              className="pl-10 pr-20 bg-muted/50 border-none focus:bg-background"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onFocus={() => setIsOpen(true)}
              onKeyDown={handleKeyDown}
            />
            
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
              {hasActiveFilters && (
                <Badge variant="secondary" className="text-xs">
                  <Filter className="h-3 w-3 mr-1" />
                  {(filters?.type?.length || 0) + (filters?.dateRange ? 1 : 0)}
                </Badge>
              )}
              
              {value && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => onChange('')}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
              
              <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded border bg-muted/50 text-xs text-muted-foreground">
                <Command className="h-3 w-3" />
                <span>K</span>
              </div>
            </div>
          </div>
        </PopoverTrigger>
        
        <PopoverContent 
          className="w-[--radix-popover-trigger-width] p-0" 
          align="start"
          side="bottom"
        >
          <CommandPrimitive className="rounded-lg border shadow-md">
            <CommandList className="max-h-80">
              {loading && (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  <span className="text-sm text-muted-foreground">Loading suggestions...</span>
                </div>
              )}
              
              {showHistorySuggestions && (
                <CommandGroup heading="Recent searches">
                  {searchHistory.slice(0, 5).map((item, index) => (
                    <CommandItem
                      key={index}
                      onSelect={() => {
                        onChange(item)
                        handleSearch(item)
                      }}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span>{item}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 opacity-0 group-hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation()
                          removeFromHistory(item)
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              
              {showQuerySuggestions && (
                <CommandGroup heading="Suggestions">
                  {suggestions.map((suggestion, index) => (
                    <CommandItem
                      key={index}
                      onSelect={() => {
                        onChange(suggestion.text)
                        handleSearch(suggestion.text)
                      }}
                    >
                      <Search className="h-3 w-3 text-muted-foreground mr-2" />
                      <span>{suggestion.text}</span>
                      {suggestion.count && (
                        <Badge variant="outline" className="ml-auto text-xs">
                          {suggestion.count}
                        </Badge>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              
              {!loading && !showHistorySuggestions && !showQuerySuggestions && (
                <CommandEmpty>
                  Start typing to see suggestions...
                </CommandEmpty>
              )}
            </CommandList>
          </CommandPrimitive>
        </PopoverContent>
      </Popover>
    </div>
  )
}