export interface SearchResult {
  id: string
  title: string
  description?: string
  content?: string
  type: SearchResultType
  relevance: number
  url: string
  metadata?: SearchMetadata
  createdAt?: string
  updatedAt?: string
}

export type SearchResultType = 
  | 'course'
  | 'community_post'
  | 'profile'
  | 'coaching_recording'
  | 'family_document'
  | 'video'
  | 'meeting'
  | 'announcement'

export interface SearchMetadata {
  author?: {
    id: string
    name: string
    avatar?: string
  }
  category?: string
  tags?: string[]
  duration?: string
  fileType?: string
  views?: number
  likes?: number
  comments?: number
}

export interface SearchFilters {
  type?: SearchResultType[]
  dateRange?: {
    start: Date
    end: Date
  }
  author?: string
  category?: string
  tags?: string[]
  sortBy?: 'relevance' | 'date' | 'title' | 'popularity'
  sortOrder?: 'asc' | 'desc'
}

export interface SearchSuggestion {
  text: string
  type: 'query' | 'filter' | 'history'
  count?: number
}

export interface SearchAnalytics {
  query: string
  timestamp: number
  resultCount: number
  clickedResult?: string
  timeToClick?: number
  userId?: string
}