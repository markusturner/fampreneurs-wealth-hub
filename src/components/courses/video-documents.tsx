import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FileText, Download, ExternalLink } from 'lucide-react'

interface VideoDocument {
  id: string
  document_name: string
  file_url: string
  file_size: number | null
  mime_type: string | null
  uploaded_by: string
  created_at: string
}

interface VideoDocumentsProps {
  videoId: string
}

export function VideoDocuments({ videoId }: VideoDocumentsProps) {
  const [documents, setDocuments] = useState<VideoDocument[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDocuments()
  }, [videoId])

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('video_documents')
        .select('*')
        .eq('video_id', videoId)
        .order('created_at', { ascending: true })

      if (error) throw error
      setDocuments(data || [])
    } catch (error) {
      console.error('Error fetching video documents:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatFileSize = (bytes: number | null): string => {
    if (!bytes) return 'Unknown size'
    const mb = bytes / (1024 * 1024)
    return mb < 1 ? `${(bytes / 1024).toFixed(1)} KB` : `${mb.toFixed(1)} MB`
  }

  const getFileIcon = (mimeType: string | null): React.ReactNode => {
    if (!mimeType) return <FileText className="h-4 w-4" />
    
    if (mimeType.includes('pdf')) return <FileText className="h-4 w-4 text-red-500" />
    if (mimeType.includes('word') || mimeType.includes('document')) return <FileText className="h-4 w-4 text-blue-500" />
    if (mimeType.includes('presentation')) return <FileText className="h-4 w-4 text-orange-500" />
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return <FileText className="h-4 w-4 text-green-500" />
    
    return <FileText className="h-4 w-4" />
  }

  const getFileTypeBadge = (mimeType: string | null, fileName: string): string => {
    if (!mimeType) {
      const ext = fileName.split('.').pop()?.toUpperCase()
      return ext || 'FILE'
    }
    
    if (mimeType.includes('pdf')) return 'PDF'
    if (mimeType.includes('word') || mimeType.includes('document')) return 'DOC'
    if (mimeType.includes('presentation')) return 'PPT'
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'XLS'
    if (mimeType.includes('text')) return 'TXT'
    
    const ext = fileName.split('.').pop()?.toUpperCase()
    return ext || 'FILE'
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Supporting Documents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-12 bg-muted rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (documents.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Supporting Documents ({documents.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {documents.map((doc) => (
          <div
            key={doc.id}
            className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {getFileIcon(doc.mime_type)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{doc.document_name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="text-xs">
                    {getFileTypeBadge(doc.mime_type, doc.document_name)}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatFileSize(doc.file_size)}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const link = document.createElement('a')
                  link.href = doc.file_url
                  link.download = doc.document_name
                  document.body.appendChild(link)
                  link.click()
                  document.body.removeChild(link)
                }}
                title="Download"
              >
                <Download className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open(doc.file_url, '_blank')}
                title="Open in new tab"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}