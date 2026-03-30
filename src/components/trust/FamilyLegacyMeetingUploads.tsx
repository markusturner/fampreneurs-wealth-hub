import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/integrations/supabase/client"
import { Upload, Trash2, FileText, Loader2, Image, File, Users } from "lucide-react"

type UploadCategory =
  | "meeting_notes"
  | "attendance_confirmation"
  | "action_items"
  | "meeting_recording"
  | "signed_agreement"
  | "family_structure"
  | "family_constitution"

interface LegacyMeetingUpload {
  id: string
  file_name: string
  file_path: string
  file_size: number | null
  mime_type: string | null
  category: UploadCategory
  created_at: string
}

const CATEGORY_INFO: Record<UploadCategory, { title: string; description: string }> = {
  meeting_notes: {
    title: "Meeting Notes",
    description: "Upload notes, minutes, or summaries from your family legacy meeting.",
  },
  attendance_confirmation: {
    title: "Attendance Confirmation",
    description: "Upload sign-in sheets, screenshots, or documents confirming meeting attendance.",
  },
  action_items: {
    title: "Action Items Logged",
    description: "Upload documented action items, tasks, and follow-ups assigned during the meeting.",
  },
  meeting_recording: {
    title: "Meeting Recording",
    description: "Upload audio or video recordings of the family legacy meeting.",
  },
  signed_agreement: {
    title: "Signed Family Agreement or Summary Doc",
    description: "Upload signed family agreements, memorandums of understanding, or meeting summary documents.",
  },
  family_structure: {
    title: "Updated Family Structure / Roles Doc",
    description: "Upload documents outlining updated family roles, responsibilities, and organizational structure.",
  },
  family_constitution: {
    title: "Family Constitution Document",
    description: "Upload your family constitution or governing document.",
  },
}

const CATEGORIES: UploadCategory[] = [
  "meeting_notes",
  "attendance_confirmation",
  "action_items",
  "meeting_recording",
  "signed_agreement",
  "family_structure",
  "family_constitution",
]

function formatSize(bytes: number | null) {
  if (!bytes) return ""
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

function FileIcon({ mime }: { mime: string | null }) {
  if (mime?.startsWith("image/")) return <Image className="h-4 w-4 text-accent flex-shrink-0" />
  if (mime?.startsWith("video/") || mime?.startsWith("audio/")) return <File className="h-4 w-4 text-primary flex-shrink-0" />
  return <File className="h-4 w-4 text-accent flex-shrink-0" />
}

interface CategorySectionProps {
  category: UploadCategory
  uploads: LegacyMeetingUpload[]
  onUpload: (files: FileList, category: UploadCategory) => void
  onDelete: (upload: LegacyMeetingUpload) => void
  uploading: boolean
  uploadingCategory: UploadCategory | null
}

function CategorySection({ category, uploads, onUpload, onDelete, uploading, uploadingCategory }: CategorySectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const info = CATEGORY_INFO[category]
  const isThisCategoryUploading = uploading && uploadingCategory === category

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <FileText className="h-4 w-4 text-accent" />
          {info.title}
        </CardTitle>
        <CardDescription className="text-xs">{info.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.mp4,.mp3,.wav,.m4a"
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
            {isThisCategoryUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {isThisCategoryUploading ? "Uploading..." : "Upload Files"}
          </Button>
          <span className="text-xs text-muted-foreground">Photos, documents, recordings</span>
        </div>

        {uploads.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-2 border border-dashed rounded-lg">
            No files uploaded yet.
          </p>
        ) : (
          <div className="space-y-1.5">
            {uploads.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-2 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <FileIcon mime={file.mime_type} />
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{file.file_name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {formatSize(file.file_size)} • {new Date(file.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(file)}
                  title="Delete"
                  className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface FamilyLegacyMeetingUploadsProps {
  onSubmitted?: () => void
}

export function FamilyLegacyMeetingUploads({ onSubmitted }: FamilyLegacyMeetingUploadsProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [uploads, setUploads] = useState<LegacyMeetingUpload[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadingCategory, setUploadingCategory] = useState<UploadCategory | null>(null)
  const [submitterName, setSubmitterName] = useState("")

  useEffect(() => {
    fetchUploads()
  }, [])

  const fetchUploads = async () => {
    if (!user?.id) return
    const { data, error } = await supabase
      .from("legacy_meeting_uploads" as any)
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
    if (data) setUploads(data as any as LegacyMeetingUpload[])
    if (error) console.error("Error fetching uploads:", error)
    setLoading(false)
  }

  const handleUpload = async (files: FileList, category: UploadCategory) => {
    if (!user?.id) return
    setUploading(true)
    setUploadingCategory(category)

    try {
      for (const file of Array.from(files)) {
        const filePath = `${user.id}/${category}/${Date.now()}_${file.name.replace(/\s+/g, "_")}`

        const { error: storageError } = await supabase.storage
          .from("legacy-meeting-uploads")
          .upload(filePath, file)
        if (storageError) throw storageError

        const { error: dbError } = await supabase
          .from("legacy_meeting_uploads" as any)
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
      setUploadingCategory(null)
    }
  }

  const handleDelete = async (upload: LegacyMeetingUpload) => {
    try {
      await supabase.storage.from("legacy-meeting-uploads").remove([upload.file_path])
      const { error } = await supabase
        .from("legacy_meeting_uploads" as any)
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

  return (
    <div className="space-y-4">
      <div className="p-3 rounded-lg border border-accent/30 bg-accent/5">
        <p className="text-sm font-medium text-foreground flex items-center gap-2">
          <Users className="h-4 w-4 text-accent" />
          First Family Legacy Meeting
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Upload all documentation from your first family legacy meeting. This includes meeting notes, attendance records, action items, recordings, signed agreements, family structure documents, and your family constitution.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {CATEGORIES.map((cat) => (
          <CategorySection
            key={cat}
            category={cat}
            uploads={uploads.filter((u) => u.category === cat)}
            onUpload={handleUpload}
            onDelete={handleDelete}
            uploading={uploading}
            uploadingCategory={uploadingCategory}
          />
        ))}
      </div>
    </div>
  )
}
