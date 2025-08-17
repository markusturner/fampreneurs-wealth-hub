import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { 
  BookOpen, 
  MessageSquare, 
  User, 
  Video, 
  FileText, 
  Calendar,
  Megaphone,
  Clock,
  ExternalLink
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import type { SearchResult } from '@/types/search'
import { useNavigate } from 'react-router-dom'

interface SearchResultsProps {
  results: SearchResult[]
  loading?: boolean
  onResultClick?: (result: SearchResult) => void
  className?: string
}

const TYPE_ICONS = {
  course: BookOpen,
  community_post: MessageSquare,
  profile: User,
  coaching_recording: Video,
  family_document: FileText,
  video: Video,
  meeting: Calendar,
  announcement: Megaphone
}

const TYPE_COLORS = {
  course: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  community_post: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  profile: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  coaching_recording: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  family_document: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
  video: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  meeting: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
  announcement: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
}

export function SearchResults({ 
  results, 
  loading, 
  onResultClick, 
  className 
}: SearchResultsProps) {
  const navigate = useNavigate()

  const handleResultClick = (result: SearchResult) => {
    onResultClick?.(result)
    navigate(result.url)
  }

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
                <div className="h-3 bg-muted rounded w-full"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (results.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-8 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <MessageSquare className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="font-semibold mb-2">No results found</h3>
          <p className="text-sm text-muted-foreground">
            Try adjusting your search terms or filters
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {results.map((result) => {
        const Icon = TYPE_ICONS[result.type] || FileText
        const typeColor = TYPE_COLORS[result.type] || TYPE_COLORS.family_document
        
        return (
          <Card 
            key={result.id} 
            className="hover:shadow-md transition-shadow cursor-pointer group"
            onClick={() => handleResultClick(result)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <CardTitle className="text-lg truncate group-hover:text-primary transition-colors">
                        {result.title}
                      </CardTitle>
                      <Badge 
                        variant="secondary" 
                        className={`text-xs ${typeColor} flex-shrink-0`}
                      >
                        {result.type.replace('_', ' ')}
                      </Badge>
                    </div>
                    
                    {result.description && (
                      <CardDescription className="line-clamp-2">
                        {result.description}
                      </CardDescription>
                    )}
                    
                    {result.content && !result.description && (
                      <CardDescription className="line-clamp-2">
                        {result.content}
                      </CardDescription>
                    )}
                  </div>
                </div>
                
                <Button
                  variant="ghost"
                  size="icon"
                  className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            
            <CardContent className="pt-0">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <div className="flex items-center gap-4">
                  {result.metadata?.author && (
                    <div className="flex items-center gap-2">
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={result.metadata.author.avatar} />
                        <AvatarFallback className="text-xs">
                          {result.metadata.author.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate max-w-32">
                        {result.metadata.author.name}
                      </span>
                    </div>
                  )}
                  
                  {result.metadata?.duration && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{result.metadata.duration}</span>
                    </div>
                  )}
                  
                  {result.metadata?.category && (
                    <Badge variant="outline" className="text-xs">
                      {result.metadata.category}
                    </Badge>
                  )}
                </div>
                
                {result.createdAt && (
                  <span className="text-xs">
                    {formatDistanceToNow(new Date(result.createdAt), { addSuffix: true })}
                  </span>
                )}
              </div>
              
              {result.metadata?.tags && result.metadata.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {result.metadata.tags.slice(0, 3).map((tag, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {result.metadata.tags.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{result.metadata.tags.length - 3} more
                    </Badge>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}