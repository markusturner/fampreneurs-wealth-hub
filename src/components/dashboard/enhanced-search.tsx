import { useState, useEffect, useCallback } from 'react'
import { Search, Filter, Calendar, Users, FileText, DollarSign, Clock } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useDebounce } from '@/hooks/useDebounce'

interface SearchResult {
  id: string
  type: 'document' | 'family_member' | 'transaction' | 'meeting' | 'message' | 'investment'
  title: string
  content: string
  metadata: Record<string, any>
  created_at: string
  relevance_score?: number
}

interface SearchFilters {
  type: string
  dateRange: string
  category: string
  status: string
}

export function EnhancedSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState<SearchFilters>({
    type: 'all',
    dateRange: 'all',
    category: 'all',
    status: 'all'
  })
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const { user } = useAuth()
  const debouncedQuery = useDebounce(query, 300)

  useEffect(() => {
    if (debouncedQuery.trim()) {
      performSearch()
    } else {
      setResults([])
    }
  }, [debouncedQuery, filters])

  useEffect(() => {
    // Load recent searches from localStorage
    const saved = localStorage.getItem('recent-searches')
    if (saved) {
      setRecentSearches(JSON.parse(saved))
    }
  }, [])

  const performSearch = useCallback(async () => {
    if (!user || !debouncedQuery.trim()) return
    
    setLoading(true)
    const searchResults: SearchResult[] = []
    
    try {
      // Search across multiple tables based on filters
      const promises = []
      
      // Document search - use mock data for now
      if (filters.type === 'all' || filters.type === 'document') {
        const mockDocuments = [
          {
            id: '1',
            type: 'document' as const,
            title: 'Family Constitution.pdf',
            content: 'Document: Family Constitution.pdf (confidential)',
            metadata: { 
              file_size: 2048576, 
              classification: 'confidential',
              access_count: 3
            },
            created_at: new Date().toISOString()
          }
        ].filter(doc => doc.title.toLowerCase().includes(debouncedQuery.toLowerCase()))
        
        promises.push(Promise.resolve(mockDocuments))
      }

      // Family member search
      if (filters.type === 'all' || filters.type === 'family_member') {
        promises.push(
          supabase
            .from('family_members')
            .select('*')
            .eq('added_by', user.id)
            .or(`full_name.ilike.%${debouncedQuery}%,email.ilike.%${debouncedQuery}%,family_position.ilike.%${debouncedQuery}%`)
            .then(({ data }) => 
              data?.map(member => ({
                id: member.id,
                type: 'family_member' as const,
                title: member.full_name,
                content: `${member.family_position} - ${member.email || 'No email'}`,
                metadata: { 
                  position: member.family_position, 
                  status: member.status,
                  relationship: member.relationship_to_family
                },
                created_at: member.created_at
              })) || []
            )
        )
      }

      // Transaction search
      if (filters.type === 'all' || filters.type === 'transaction') {
        promises.push(
          supabase
            .from('account_transactions')
            .select('*')
            .eq('user_id', user.id)
            .or(`description.ilike.%${debouncedQuery}%,merchant_name.ilike.%${debouncedQuery}%,category.ilike.%${debouncedQuery}%`)
            .limit(20)
            .then(({ data }) => 
              data?.map(transaction => ({
                id: transaction.id,
                type: 'transaction' as const,
                title: transaction.description || 'Transaction',
                content: `${transaction.merchant_name || 'Unknown merchant'} - $${transaction.amount}`,
                metadata: { 
                  amount: transaction.amount, 
                  category: transaction.category,
                  date: transaction.transaction_date
                },
                created_at: transaction.created_at
              })) || []
            )
        )
      }

      // Investment portfolio search
      if (filters.type === 'all' || filters.type === 'investment') {
        promises.push(
          supabase
            .from('investment_portfolios')
            .select('*')
            .eq('user_id', user.id)
            .ilike('platform_id', `%${debouncedQuery}%`)
            .then(({ data }) => 
              data?.map(portfolio => ({
                id: portfolio.id,
                type: 'investment' as const,
                title: `${portfolio.platform_id} Portfolio`,
                content: `Total Value: $${portfolio.total_value?.toLocaleString() || '0'}`,
                metadata: { 
                  total_value: portfolio.total_value, 
                  day_change: portfolio.day_change,
                  platform: portfolio.platform_id
                },
                created_at: portfolio.created_at
              })) || []
            )
        )
      }

      const results = await Promise.all(promises)
      const flatResults = results.flat()
      
      // Apply additional filters
      let filteredResults = flatResults
      
      if (filters.dateRange !== 'all') {
        const now = new Date()
        let cutoffDate = new Date()
        
        switch (filters.dateRange) {
          case 'today':
            cutoffDate.setHours(0, 0, 0, 0)
            break
          case 'week':
            cutoffDate.setDate(now.getDate() - 7)
            break
          case 'month':
            cutoffDate.setMonth(now.getMonth() - 1)
            break
          case 'year':
            cutoffDate.setFullYear(now.getFullYear() - 1)
            break
        }
        
        filteredResults = filteredResults.filter(result => 
          new Date(result.created_at) >= cutoffDate
        )
      }
      
      // Sort by relevance (type match priority, then by date)
      filteredResults.sort((a, b) => {
        if (filters.type !== 'all') {
          if (a.type === filters.type && b.type !== filters.type) return -1
          if (b.type === filters.type && a.type !== filters.type) return 1
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })
      
      setResults(filteredResults.slice(0, 50)) // Limit to 50 results
      
      // Save to recent searches
      if (debouncedQuery.trim()) {
        const newRecentSearches = [
          debouncedQuery,
          ...recentSearches.filter(s => s !== debouncedQuery)
        ].slice(0, 10)
        setRecentSearches(newRecentSearches)
        localStorage.setItem('recent-searches', JSON.stringify(newRecentSearches))
      }
      
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setLoading(false)
    }
  }, [user, debouncedQuery, filters, recentSearches])

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'document':
        return <FileText className="h-4 w-4" />
      case 'family_member':
        return <Users className="h-4 w-4" />
      case 'transaction':
        return <DollarSign className="h-4 w-4" />
      case 'investment':
        return <DollarSign className="h-4 w-4" />
      case 'meeting':
        return <Calendar className="h-4 w-4" />
      default:
        return <Search className="h-4 w-4" />
    }
  }

  const getResultTypeColor = (type: string) => {
    switch (type) {
      case 'document':
        return 'bg-blue-100 text-blue-800'
      case 'family_member':
        return 'bg-green-100 text-green-800'
      case 'transaction':
        return 'bg-yellow-100 text-yellow-800'
      case 'investment':
        return 'bg-purple-100 text-purple-800'
      case 'meeting':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const clearFilters = () => {
    setFilters({
      type: 'all',
      dateRange: 'all',
      category: 'all',
      status: 'all'
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Enhanced Search
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search across all family data..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Recent Searches */}
        {!query && recentSearches.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">Recent Searches</h4>
            <div className="flex flex-wrap gap-2">
              {recentSearches.slice(0, 5).map((search, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => setQuery(search)}
                  className="text-xs"
                >
                  <Clock className="h-3 w-3 mr-1" />
                  {search}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          <Select value={filters.type} onValueChange={(value) => setFilters({...filters, type: value})}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Content Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="document">Documents</SelectItem>
              <SelectItem value="family_member">Family Members</SelectItem>
              <SelectItem value="transaction">Transactions</SelectItem>
              <SelectItem value="investment">Investments</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.dateRange} onValueChange={(value) => setFilters({...filters, dateRange: value})}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Date Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">Past Week</SelectItem>
              <SelectItem value="month">Past Month</SelectItem>
              <SelectItem value="year">Past Year</SelectItem>
            </SelectContent>
          </Select>

          {(filters.type !== 'all' || filters.dateRange !== 'all') && (
            <Button variant="outline" size="sm" onClick={clearFilters}>
              <Filter className="h-4 w-4 mr-1" />
              Clear Filters
            </Button>
          )}
        </div>

        {/* Search Results */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Searching...
            </div>
          ) : results.length === 0 && query ? (
            <div className="text-center py-8 text-muted-foreground">
              No results found for "{query}"
            </div>
          ) : (
            <div className="space-y-3">
              {results.map((result) => (
                <Card key={`${result.type}-${result.id}`} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {getResultIcon(result.type)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium">{result.title}</h4>
                          <Badge className={`text-xs ${getResultTypeColor(result.type)}`}>
                            {result.type.replace('_', ' ')}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {result.content}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>{new Date(result.created_at).toLocaleDateString()}</span>
                          {result.metadata && Object.entries(result.metadata).slice(0, 2).map(([key, value]) => (
                            <span key={key} className="flex items-center gap-1">
                              {key}: {String(value)}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}