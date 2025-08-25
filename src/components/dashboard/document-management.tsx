import { useState, useCallback } from 'react'
import { Upload, Download, FileText, Trash2, Eye, Search, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'

interface Document {
  id: string
  original_filename: string
  mime_type: string
  file_size: number
  classification_level: string
  created_at: string
  last_accessed: string
  access_count: number
}

export function DocumentManagement() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const { user } = useAuth()

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !user) return

    setUploading(true)
    try {
      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}/${Date.now()}.${fileExt}`
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('family-documents')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      // Save document metadata
      const { error: insertError } = await supabase
        .from('family_office_secure_documents')
        .insert({
          user_id: user.id,
          original_filename: file.name,
          encrypted_filename: uploadData.path,
          mime_type: file.type,
          file_size: file.size,
          classification_level: 'confidential'
        })

      if (insertError) throw insertError

      toast({
        title: "Document uploaded successfully",
        description: `${file.name} has been securely stored.`,
      })

      loadDocuments()
    } catch (error) {
      console.error('Upload error:', error)
      toast({
        title: "Upload failed",
        description: "There was an error uploading your document.",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }, [user, toast])

  const handleDownload = useCallback(async (doc: Document) => {
    try {
      const { data, error } = await supabase.storage
        .from('family-documents')
        .download(doc.encrypted_filename)

      if (error) throw error

      // Create download link
      const url = URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url
      a.download = doc.original_filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      // Update access count
      await supabase
        .from('family_office_secure_documents')
        .update({ 
          access_count: doc.access_count + 1,
          last_accessed: new Date().toISOString()
        })
        .eq('id', doc.id)

      toast({
        title: "Download started",
        description: `${doc.original_filename} is downloading.`,
      })
    } catch (error) {
      console.error('Download error:', error)
      toast({
        title: "Download failed",
        description: "There was an error downloading the document.",
        variant: "destructive",
      })
    }
  }, [toast])

  const loadDocuments = useCallback(async () => {
    if (!user) return
    
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('family_office_secure_documents')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setDocuments(data || [])
    } catch (error) {
      console.error('Load documents error:', error)
    } finally {
      setLoading(false)
    }
  }, [user])

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.original_filename.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filterCategory === 'all' || doc.classification_level === filterCategory
    return matchesSearch && matchesFilter
  })

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Document Management
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Upload Section */}
        <div className="border-2 border-dashed border-muted rounded-lg p-6 text-center">
          <Upload className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Upload secure family documents
            </p>
            <div>
              <input
                type="file"
                id="file-upload"
                className="hidden"
                onChange={handleFileUpload}
                disabled={uploading}
              />
              <Button
                asChild
                disabled={uploading}
                className="cursor-pointer"
              >
                <label htmlFor="file-upload">
                  {uploading ? 'Uploading...' : 'Choose File'}
                </label>
              </Button>
            </div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-48">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="confidential">Confidential</SelectItem>
              <SelectItem value="restricted">Restricted</SelectItem>
              <SelectItem value="internal">Internal</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Documents List */}
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading documents...
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? 'No documents match your search.' : 'No documents uploaded yet.'}
            </div>
          ) : (
            filteredDocuments.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{doc.original_filename}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{formatFileSize(doc.file_size)}</span>
                      <span>•</span>
                      <Badge variant="outline" className="text-xs">
                        {doc.classification_level}
                      </Badge>
                      <span>•</span>
                      <span>Accessed {doc.access_count} times</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDownload(doc)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Document Details</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-3">
                        <div>
                          <label className="text-sm font-medium">Filename</label>
                          <p className="text-sm text-muted-foreground">{doc.original_filename}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium">File Size</label>
                          <p className="text-sm text-muted-foreground">{formatFileSize(doc.file_size)}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium">Classification</label>
                          <p className="text-sm text-muted-foreground">{doc.classification_level}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium">Uploaded</label>
                          <p className="text-sm text-muted-foreground">
                            {new Date(doc.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium">Last Accessed</label>
                          <p className="text-sm text-muted-foreground">
                            {doc.last_accessed ? new Date(doc.last_accessed).toLocaleDateString() : 'Never'}
                          </p>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}