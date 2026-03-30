import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/integrations/supabase/client"
import { Upload, Trash2, FileText, Loader2, Image, File } from "lucide-react"

type UploadCategory = "schedule_b" | "proof_of_transfer"

interface AssetUpload {
  id: string
  file_name: string
  file_path: string
  file_size: number | null
  mime_type: string | null
  category: UploadCategory
  description: string | null
  created_at: string
}

const CATEGORY_INFO: Record<UploadCategory, { title: string; description: string; examples: string[] }> = {
  schedule_b: {
    title: "Schedule B — Assets in the Trust",
    description: "Upload photos or documents listing your assets held in the trust.",
    examples: ["Asset inventory sheets", "Property lists", "Account statements showing trust holdings"],
  },
  proof_of_transfer: {
    title: "Proof of Transfer",
    description: "Upload documents proving assets have been properly transferred into the trust.",
    examples: [
      "Filed & stamped ownership change (state records for LLC)",
      "Bank/brokerage statement showing trust as owner",
      "Updated operating agreement with trust listed",
      "Executed (signed & finalized) assignment docs",
      "Title/deed showing trust as legal owner",
    ],
  },
}

function formatSize(bytes: number | null) {
  if (!bytes) return ""
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

function FileIcon({ mime }: { mime: string | null }) {
  if (mime?.startsWith("image/")) return <Image className="h-4 w-4 text-accent flex-shrink-0" />
  return <File className="h-4 w-4 text-accent flex-shrink-0" />
}

interface CategorySectionProps {
  category: UploadCategory
  uploads: AssetUpload[]
  onUpload: (files: FileList, category: UploadCategory) => void
  onDelete: (upload: AssetUpload) => void
  uploading: boolean
}

function CategorySection({ category, uploads, onUpload, onDelete, uploading }: CategorySectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const info = CATEGORY_INFO[category]

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-5 w-5 text-accent" />
          {info.title}
        </CardTitle>
        <CardDescription className="text-xs">{info.description}</CardDescription>
        <div className="mt-2">
          <p className="text-xs text-muted-foreground font-medium mb-1">Examples:</p>
          <ul className="text-xs text-muted-foreground list-disc list-inside space-y-0.5">
            {info.examples.map((ex) => (
              <li key={ex}>{ex}</li>
            ))}
          </ul>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Upload button */}
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) {
                onUpload(e.target.files, category)
                e.target.value = ""
              }
            }}
          />
          <Button
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="gap-2"
            style={{ backgroundColor: "#ffb500", color: "hsl(var(--primary-foreground))" }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#2eb2ff")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#ffb500")}
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? "Uploading..." : "Upload Files"}
          </Button>
          <span className="text-xs text-muted-foreground">Select multiple photos or documents</span>
        </div>

        {/* File list */}
        {uploads.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-3 border border-dashed rounded-lg">
            No files uploaded yet.
          </p>
        ) : (
          <div className="space-y-2">
            {uploads.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <FileIcon mime={file.mime_type} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{file.file_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatSize(file.file_size)} • {new Date(file.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(file)}
                  title="Delete"
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface TrustAssetUploadsProps {
  onSubmitted?: () => void
}

export function TrustAssetUploads({ onSubmitted }: TrustAssetUploadsProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [uploads, setUploads] = useState<AssetUpload[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [submitterName, setSubmitterName] = useState("")

  useEffect(() => {
    fetchUploads()
  }, [])

  const fetchUploads = async () => {
    if (!user?.id) return
    const { data, error } = await supabase
      .from("trust_asset_uploads" as any)
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
    if (data) setUploads(data as any as AssetUpload[])
    if (error) console.error("Error fetching uploads:", error)
    setLoading(false)
  }

  const handleUpload = async (files: FileList, category: UploadCategory) => {
    if (!user?.id) return
    setUploading(true)

    try {
      for (const file of Array.from(files)) {
        const filePath = `${user.id}/${category}/${Date.now()}_${file.name.replace(/\s+/g, "_")}`

        const { error: storageError } = await supabase.storage
          .from("trust-asset-uploads")
          .upload(filePath, file)
        if (storageError) throw storageError

        const { error: dbError } = await supabase
          .from("trust_asset_uploads" as any)
          .insert({
            user_id: user.id,
            category,
            file_name: file.name,
            file_path: filePath,
            file_size: file.size,
            mime_type: file.type || null,
          } as any)
        if (dbError) throw dbError
      }

      toast({
        title: "Files uploaded",
        description: `${files.length} file(s) uploaded successfully.`,
      })
      fetchUploads()
    } catch (err: any) {
      console.error("Upload error:", err)
      toast({ title: "Upload failed", description: err.message, variant: "destructive" })
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (upload: AssetUpload) => {
    try {
      await supabase.storage.from("trust-asset-uploads").remove([upload.file_path])
      const { error } = await supabase
        .from("trust_asset_uploads" as any)
        .delete()
        .eq("id", upload.id)
      if (error) throw error
      toast({ title: "File deleted" })
      fetchUploads()
    } catch (err: any) {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" })
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const scheduleBUploads = uploads.filter((u) => u.category === "schedule_b")
  const proofUploads = uploads.filter((u) => u.category === "proof_of_transfer")

  return (
    <div className="space-y-4">
      <CategorySection
        category="schedule_b"
        uploads={scheduleBUploads}
        onUpload={handleUpload}
        onDelete={handleDelete}
        uploading={uploading}
      />
      <CategorySection
        category="proof_of_transfer"
        uploads={proofUploads}
        onUpload={handleUpload}
        onDelete={handleDelete}
        uploading={uploading}
      />
    </div>
  )
}
