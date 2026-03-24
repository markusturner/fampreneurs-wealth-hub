import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/AuthContext"
import { useIsAdminOrOwner } from "@/hooks/useIsAdminOrOwner"
import { supabase } from "@/integrations/supabase/client"
import { Upload, Download, Trash2, FileText, Loader2 } from "lucide-react"

interface TrustDocument {
  id: string
  file_name: string
  file_path: string
  file_size: number | null
  mime_type: string | null
  trust_type: string | null
  description: string | null
  created_at: string
}

export function TrustDocumentsSection() {
  const { user } = useAuth()
  const { isAdminOrOwner } = useIsAdminOrOwner()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [documents, setDocuments] = useState<TrustDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [description, setDescription] = useState("")
  const [trustType, setTrustType] = useState<string>("general")

  useEffect(() => {
    fetchDocuments()
  }, [])

  const fetchDocuments = async () => {
    const { data, error } = await supabase
      .from('trust_documents')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setDocuments(data as TrustDocument[])
    if (error) console.error("Error fetching trust documents:", error)
    setLoading(false)
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user?.id) return

    setUploading(true)
    try {
      const filePath = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`
      const { error: uploadError } = await supabase.storage
        .from('trust-documents')
        .upload(filePath, file)
      if (uploadError) throw uploadError

      const { error: dbError } = await supabase
        .from('trust_documents')
        .insert({
          uploaded_by: user.id,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          mime_type: file.type,
          trust_type: trustType === 'general' ? null : trustType,
          description: description || null,
        } as any)
      if (dbError) throw dbError

      toast({ title: "Document uploaded", description: "The document is now available for download." })
      setDescription("")
      setTrustType("general")
      if (fileInputRef.current) fileInputRef.current.value = ""
      fetchDocuments()
    } catch (err: any) {
      console.error("Upload error:", err)
      toast({ title: "Upload failed", description: err.message, variant: "destructive" })
    } finally {
      setUploading(false)
    }
  }

  const handleDownload = async (doc: TrustDocument) => {
    const { data } = supabase.storage.from('trust-documents').getPublicUrl(doc.file_path)
    if (data?.publicUrl) {
      const link = document.createElement('a')
      link.href = data.publicUrl
      link.download = doc.file_name
      link.target = '_blank'
      link.click()
    }
  }

  const handleDelete = async (doc: TrustDocument) => {
    try {
      await supabase.storage.from('trust-documents').remove([doc.file_path])
      const { error } = await supabase.from('trust_documents').delete().eq('id', doc.id)
      if (error) throw error
      toast({ title: "Document deleted" })
      fetchDocuments()
    } catch (err: any) {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" })
    }
  }

  const formatSize = (bytes: number | null) => {
    if (!bytes) return ""
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1048576).toFixed(1)} MB`
  }

  const getTypeLabel = (type: string | null) => {
    if (!type) return "General"
    const labels: Record<string, string> = { family: "Family Trust", ministry: "Ministry Trust", business: "Business Trust" }
    return labels[type] || "General"
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileText className="h-5 w-5 text-accent" />
          Trust Documents
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Admin upload section */}
        {isAdminOrOwner && (
          <div className="p-4 rounded-lg border border-dashed border-accent/40 bg-accent/5 space-y-3">
            <p className="text-sm font-medium text-foreground">Upload Document for Users</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="trust-type" className="text-xs">Trust Type</Label>
                <Select value={trustType} onValueChange={setTrustType}>
                  <SelectTrigger id="trust-type" className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="family">Family Trust</SelectItem>
                    <SelectItem value="ministry">Ministry Trust</SelectItem>
                    <SelectItem value="business">Business Trust</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="doc-desc" className="text-xs">Description (optional)</Label>
                <Input id="doc-desc" value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief description" className="h-9" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input ref={fileInputRef} type="file" className="hidden" onChange={handleUpload} />
              <Button size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="gap-2">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {uploading ? "Uploading..." : "Choose & Upload File"}
              </Button>
            </div>
          </div>
        )}

        {/* Documents list */}
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : documents.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No documents uploaded yet.</p>
        ) : (
          <div className="space-y-2">
            {documents.map(doc => (
              <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <FileText className="h-4 w-4 text-accent flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{doc.file_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {getTypeLabel(doc.trust_type)} • {formatSize(doc.file_size)}
                      {doc.description && ` • ${doc.description}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={() => handleDownload(doc)} title="Download" className="h-8 w-8 p-0">
                    <Download className="h-4 w-4" />
                  </Button>
                  {isAdminOrOwner && (
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(doc)} title="Delete" className="h-8 w-8 p-0 text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
