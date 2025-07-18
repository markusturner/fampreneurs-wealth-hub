import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { Plus, Upload, Link, Video, Play, Trash2, Edit, Calendar, Clock } from 'lucide-react'
import { format } from 'date-fns'

interface CoachingRecording {
  id: string
  title: string
  description: string | null
  recording_url: string
  recording_type: 'upload' | 'url'
  platform: string | null
  duration_minutes: number | null
  recorded_at: string
  created_at: string
  created_by: string
  category: string | null
}

export const CoachingRecordings = () => {
  const { user } = useAuth()
  const { toast } = useToast()
  const [recordings, setRecordings] = useState<CoachingRecording[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [uploadType, setUploadType] = useState<'upload' | 'url'>('url')
  
  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [recordingUrl, setRecordingUrl] = useState('')
  const [recordingFile, setRecordingFile] = useState<File | null>(null)
  const [platform, setPlatform] = useState('')
  const [durationMinutes, setDurationMinutes] = useState('')
  const [recordedAt, setRecordedAt] = useState('')
  const [category, setCategory] = useState('')

  useEffect(() => {
    fetchRecordings()
  }, [])

  const fetchRecordings = async () => {
    try {
      const { data, error } = await supabase
        .from('coaching_call_recordings')
        .select('*')
        .order('recorded_at', { ascending: false })

      if (error) throw error
      setRecordings(data || [])
    } catch (error) {
      console.error('Error fetching recordings:', error)
    }
  }

  const uploadRecordingFile = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}.${fileExt}`
      const filePath = `recordings/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('coaching-recordings')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('coaching-recordings')
        .getPublicUrl(filePath)

      return publicUrl
    } catch (error) {
      console.error('Error uploading file:', error)
      return null
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !title.trim()) return

    setLoading(true)
    try {
      let finalRecordingUrl = recordingUrl

      if (uploadType === 'upload' && recordingFile) {
        const uploadedUrl = await uploadRecordingFile(recordingFile)
        if (!uploadedUrl) {
          throw new Error('Failed to upload recording file')
        }
        finalRecordingUrl = uploadedUrl
      }

      const { error } = await supabase
        .from('coaching_call_recordings')
        .insert({
          title: title.trim(),
          description: description.trim() || null,
          recording_url: finalRecordingUrl,
          recording_type: uploadType,
          platform: platform || null,
          duration_minutes: durationMinutes ? parseInt(durationMinutes) : null,
          recorded_at: recordedAt || new Date().toISOString(),
          created_by: user.id,
          category: category || null
        })

      if (error) throw error

      // Also create a course video entry
      const { error: courseError } = await supabase
        .from('course_videos')
        .insert({
          title: title.trim(),
          description: description.trim() || null,
          video_url: finalRecordingUrl,
          video_type: 'url',
          duration_seconds: durationMinutes ? parseInt(durationMinutes) * 60 : null,
          created_by: user.id,
          course_id: null // Will be categorized separately for coaching recordings
        })

      if (courseError) {
        console.warn('Failed to create course video entry:', courseError)
      }

      resetForm()
      fetchRecordings()
      setIsDialogOpen(false)
      
      toast({
        title: "Success",
        description: "Coaching recording added successfully!"
      })
    } catch (error) {
      console.error('Error adding recording:', error)
      toast({
        title: "Error",
        description: "Failed to add coaching recording",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('coaching_call_recordings')
        .delete()
        .eq('id', id)

      if (error) throw error

      fetchRecordings()
      toast({
        title: "Success",
        description: "Recording deleted successfully!"
      })
    } catch (error) {
      console.error('Error deleting recording:', error)
      toast({
        title: "Error",
        description: "Failed to delete recording",
        variant: "destructive"
      })
    }
  }

  const resetForm = () => {
    setTitle('')
    setDescription('')
    setRecordingUrl('')
    setRecordingFile(null)
    setPlatform('')
    setDurationMinutes('')
    setRecordedAt('')
    setCategory('')
    setUploadType('url')
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setRecordingFile(file)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Video className="h-5 w-5" />
              Coaching Call Recordings
            </CardTitle>
            <CardDescription>
              Manage coaching call recordings and sessions
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add Recording
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add Coaching Recording</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Recording title"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Recording description"
                    rows={3}
                  />
                </div>

                <div>
                  <Label>Recording Source</Label>
                  <Select value={uploadType} onValueChange={(value: 'upload' | 'url') => setUploadType(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select source type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="url">URL (Zoom, Fathom, etc.)</SelectItem>
                      <SelectItem value="upload">Upload File</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {uploadType === 'url' ? (
                  <div>
                    <Label htmlFor="recordingUrl">Recording URL *</Label>
                    <Input
                      id="recordingUrl"
                      value={recordingUrl}
                      onChange={(e) => setRecordingUrl(e.target.value)}
                      placeholder="https://..."
                      required
                    />
                  </div>
                ) : (
                  <div>
                    <Label htmlFor="recordingFile">Recording File *</Label>
                    <Input
                      id="recordingFile"
                      type="file"
                      accept="video/*,audio/*"
                      onChange={handleFileChange}
                      required
                    />
                  </div>
                )}

                <div>
                  <Label htmlFor="platform">Platform</Label>
                  <Input
                    id="platform"
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value)}
                    placeholder="Zoom, Fathom, etc."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="duration">Duration (minutes)</Label>
                    <Input
                      id="duration"
                      type="number"
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(e.target.value)}
                      placeholder="60"
                    />
                  </div>
                  <div>
                    <Label htmlFor="recordedAt">Recorded Date</Label>
                    <Input
                      id="recordedAt"
                      type="datetime-local"
                      value={recordedAt}
                      onChange={(e) => setRecordedAt(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Group Call, 1-on-1, etc."
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button type="submit" disabled={loading} className="flex-1">
                    {loading ? 'Adding...' : 'Add Recording'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recordings.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No recordings found. Add your first coaching recording!
            </div>
          ) : (
            recordings.map((recording) => (
              <Card key={recording.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium">{recording.title}</h4>
                    {recording.description && (
                      <p className="text-sm text-muted-foreground mt-1">{recording.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      {recording.platform && (
                        <span className="flex items-center gap-1">
                          <Link className="h-3 w-3" />
                          {recording.platform}
                        </span>
                      )}
                      {recording.duration_minutes && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {recording.duration_minutes} min
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(recording.recorded_at), 'MMM d, yyyy')}
                      </span>
                      {recording.category && (
                        <span className="bg-muted px-2 py-1 rounded text-xs">
                          {recording.category}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(recording.recording_url, '_blank')}
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(recording.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}