import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon, Filter, X } from 'lucide-react'
import { format } from 'date-fns'
import type { SearchFilters as SearchFiltersType, SearchResultType } from '@/types/search'

interface SearchFiltersProps {
  filters: SearchFiltersType
  onFiltersChange: (filters: SearchFiltersType) => void
  onClearFilters: () => void
  className?: string
}

const CONTENT_TYPES: { value: SearchResultType; label: string }[] = [
  { value: 'course', label: 'Courses' },
  { value: 'community_post', label: 'Community Posts' },
  { value: 'profile', label: 'Members' },
  { value: 'coaching_recording', label: 'Recordings' },
  { value: 'video', label: 'Videos' },
  { value: 'family_document', label: 'Documents' },
  { value: 'meeting', label: 'Meetings' },
  { value: 'announcement', label: 'Announcements' }
]

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'date', label: 'Date' },
  { value: 'title', label: 'Title' },
  { value: 'popularity', label: 'Popularity' }
]

export function SearchFilters({ 
  filters, 
  onFiltersChange, 
  onClearFilters, 
  className 
}: SearchFiltersProps) {
  const [datePickerOpen, setDatePickerOpen] = useState(false)

  const toggleContentType = (type: SearchResultType) => {
    const currentTypes = filters.type || []
    const newTypes = currentTypes.includes(type)
      ? currentTypes.filter(t => t !== type)
      : [...currentTypes, type]
    
    onFiltersChange({ ...filters, type: newTypes.length > 0 ? newTypes : undefined })
  }

  const handleDateRangeChange = (range: { start?: Date; end?: Date }) => {
    if (range.start && range.end) {
      onFiltersChange({
        ...filters,
        dateRange: { start: range.start, end: range.end }
      })
    } else {
      onFiltersChange({
        ...filters,
        dateRange: undefined
      })
    }
  }

  const handleSortChange = (sortBy: string) => {
    onFiltersChange({
      ...filters,
      sortBy: sortBy as any
    })
  }

  const handleSortOrderChange = (sortOrder: string) => {
    onFiltersChange({
      ...filters,
      sortOrder: sortOrder as 'asc' | 'desc'
    })
  }

  const hasActiveFilters = !!(
    filters.type?.length ||
    filters.dateRange ||
    filters.category ||
    filters.tags?.length ||
    (filters.sortBy && filters.sortBy !== 'relevance')
  )

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Search Filters
          </CardTitle>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearFilters}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4 mr-1" />
              Clear All
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Content Types */}
        <div>
          <h4 className="text-sm font-medium mb-2">Content Type</h4>
          <div className="flex flex-wrap gap-2">
            {CONTENT_TYPES.map(type => (
              <Badge
                key={type.value}
                variant={filters.type?.includes(type.value) ? "default" : "outline"}
                className="cursor-pointer transition-colors"
                onClick={() => toggleContentType(type.value)}
              >
                {type.label}
              </Badge>
            ))}
          </div>
        </div>

        {/* Date Range */}
        <div>
          <h4 className="text-sm font-medium mb-2">Date Range</h4>
          <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filters.dateRange ? (
                  `${format(filters.dateRange.start, 'MMM dd, yyyy')} - ${format(filters.dateRange.end, 'MMM dd, yyyy')}`
                ) : (
                  <span>Pick a date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={{
                  from: filters.dateRange?.start,
                  to: filters.dateRange?.end
                }}
                onSelect={(range) => {
                  handleDateRangeChange({
                    start: range?.from,
                    end: range?.to
                  })
                  if (range?.from && range?.to) {
                    setDatePickerOpen(false)
                  }
                }}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Sort Options */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm font-medium mb-2">Sort By</h4>
            <Select
              value={filters.sortBy || 'relevance'}
              onValueChange={handleSortChange}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <h4 className="text-sm font-medium mb-2">Order</h4>
            <Select
              value={filters.sortOrder || 'desc'}
              onValueChange={handleSortOrderChange}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Descending</SelectItem>
                <SelectItem value="asc">Ascending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}