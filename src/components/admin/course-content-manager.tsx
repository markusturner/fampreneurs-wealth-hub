import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { 
  Plus, 
  Upload, 
  Link, 
  FileText, 
  Trash2, 
  Edit, 
  FolderPlus,
  Video,
  Move,
  Save
} from 'lucide-react'

interface Module {
  id: string
  title: string
  description: string | null
  order_index: number
}

interface Video {
  id: string
  title: string
  description: string | null
  video_url: string
  video_type: string
  module_id: string | null
  order_index: number
}

interface Document {
  id?: string
  file?: File
  name: string
  type: 'pdf' | 'link'
  url?: string
}

interface CourseContentManagerProps {
  courseId: string
  onComplete: () => void
}

export function CourseContentManager({ courseId, onComplete }: CourseContentManagerProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  
  // State
  const [modules, setModules] = useState<Module[]>([])
  const [videos, setVideos] = useState<Video[]>([])
  const [activeTab, setActiveTab] = useState<'videos' | 'modules'>('videos')
  const [loading, setLoading] = useState(false)
  
  // Video form state
  const [showVideoForm, setShowVideoForm] = useState(false)
  const [editingVideo, setEditingVideo] = useState<Video | null>(null)
  const [videoFormData, setVideoFormData] = useState({
    title: '',
    description: '',
    video_url: '',
    video_type: 'youtube',
    module_id: 'none'
  })
  const [videoTab, setVideoTab] = useState<'url' | 'upload'>('url')
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  
  // Module form state
  const [showModuleForm, setShowModuleForm] = useState(false)
  const [editingModule, setEditingModule] = useState<Module | null>(null)
  const [moduleFormData, setModuleFormData] = useState({
    title: '',
    description: ''
  })

  useEffect(() => {
    loadCourseContent()
  }, [courseId])

  const loadCourseContent = async () => {
    try {
      setLoading(true)
      
      // Load modules
      const { data: modulesData, error: modulesError } = await supabase
        .from('course_modules')
        .select('*')
        .eq('course_id', courseId)
        .order('order_index', { ascending: true })

      if (modulesError) throw modulesError
      setModules(modulesData || [])
      
      // Load videos
      const { data: videosData, error: videosError } = await supabase
        .from('course_videos')
        .select('*')
        .eq('course_id', courseId)
        .order('order_index', { ascending: true })

      if (videosError) throw videosError
      setVideos(videosData || [])
    } catch (error: any) {
      toast({
        title: "Error loading content",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const extractVideoId = (url: string, type: string): string | null => {
    try {
      if (type === 'youtube') {
        const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/)
        return match ? match[1] : null
      } else if (type === 'vimeo') {
        const match = url.match(/vimeo\.com\/(\d+)/)
        return match ? match[1] : null
      } else if (type === 'loom') {
        const match = url.match(/loom\.com\/share\/([a-zA-Z0-9]+)/)
        return match ? match[1] : null
      }
      return null
    } catch {
      return null
    }
  }

  const getEmbedUrl = (url: string, type: string): string => {
    const videoId = extractVideoId(url, type)
    if (!videoId) return url

    switch (type) {
      case 'youtube':
        return `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&controls=1&showinfo=0`
      case 'vimeo':
        return `https://player.vimeo.com/video/${videoId}?title=0&byline=0&portrait=0`
      case 'loom':
        return `https://www.loom.com/embed/${videoId}`
      default:
        return url
    }
  }

  const uploadVideoFile = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}.${fileExt}`
      const filePath = `videos/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('course-videos')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('course-videos')
        .getPublicUrl(filePath)

      return publicUrl
    } catch (error) {
      console.error('Error uploading video:', error)
      return null
    }
  }

  const uploadDocument = async (doc: Document, videoId: string): Promise<boolean> => {
    try {
      if (doc.type === 'pdf' && doc.file) {
        const fileExt = doc.file.name.split('.').pop()
        const fileName = `${Date.now()}.${fileExt}`
        const filePath = `documents/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('video-documents')
          .upload(filePath, doc.file)

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('video-documents')
          .getPublicUrl(filePath)

        const { error: dbError } = await supabase
          .from('video_documents')
          .insert({
            video_id: videoId,
            document_name: doc.name,
            file_url: publicUrl,
            uploaded_by: user?.id
          })

        if (dbError) throw dbError
      } else if (doc.type === 'link') {
        const { error: dbError } = await supabase
          .from('video_documents')
          .insert({
            video_id: videoId,
            document_name: doc.name,
            file_url: doc.url,
            uploaded_by: user?.id
          })

        if (dbError) throw dbError
      }
      return true
    } catch (error) {
      console.error('Error uploading document:', error)
      return false
    }
  }

  const handleVideoSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !videoFormData.title.trim()) return

    setLoading(true)
    try {
      let finalVideoUrl = videoFormData.video_url

      // Handle video upload
      if (videoTab === 'upload' && videoFile) {
        const uploadedUrl = await uploadVideoFile(videoFile)
        if (!uploadedUrl) {
          throw new Error('Failed to upload video file')
        }
        finalVideoUrl = uploadedUrl
      } else if (videoTab === 'url' && videoFormData.video_url) {
        finalVideoUrl = getEmbedUrl(videoFormData.video_url, videoFormData.video_type)
      }

      if (!finalVideoUrl) {
        throw new Error('Please provide a video file or URL')
      }

      const videoData = {
        course_id: courseId,
        title: videoFormData.title.trim(),
        description: videoFormData.description.trim() || null,
        video_url: finalVideoUrl,
        video_type: videoTab === 'upload' ? 'upload' : videoFormData.video_type,
        module_id: videoFormData.module_id === 'none' ? null : videoFormData.module_id || null,
        created_by: user.id,
        order_index: videos.length
      }

      let result
      if (editingVideo) {
        const { data, error } = await supabase
          .from('course_videos')
          .update(videoData)
          .eq('id', editingVideo.id)
          .select()
          .single()
        
        if (error) throw error
        result = { data }
      } else {
        const { data, error } = await supabase
          .from('course_videos')
          .insert(videoData)
          .select()
          .single()
        
        if (error) throw error
        result = { data }
      }

      // Upload documents if any
      if (documents.length > 0 && result.data) {
        for (const doc of documents) {
          await uploadDocument(doc, result.data.id)
        }
      }

      resetVideoForm()
      loadCourseContent()
      
      toast({
        title: "Success",
        description: editingVideo ? "Video updated successfully!" : "Video added successfully!"
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save video",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleModuleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !moduleFormData.title.trim()) return

    setLoading(true)
    try {
      const moduleData = {
        course_id: courseId,
        title: moduleFormData.title.trim(),
        description: moduleFormData.description.trim() || null,
        order_index: modules.length,
        created_by: user.id
      }

      if (editingModule) {
        const { error } = await supabase
          .from('course_modules')
          .update(moduleData)
          .eq('id', editingModule.id)
        
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('course_modules')
          .insert(moduleData)
        
        if (error) throw error
      }

      resetModuleForm()
      loadCourseContent()
      
      toast({
        title: "Success",
        description: editingModule ? "Module updated successfully!" : "Module created successfully!"
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save module",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const deleteVideo = async (videoId: string) => {
    if (!confirm('Are you sure you want to delete this video?')) return

    try {
      const { error } = await supabase
        .from('course_videos')
        .delete()
        .eq('id', videoId)

      if (error) throw error
      
      loadCourseContent()
      toast({
        title: "Video deleted",
        description: "The video has been removed from the course."
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      })
    }
  }

  const deleteModule = async (moduleId: string) => {
    if (!confirm('Are you sure you want to delete this module? All videos in this module will be moved to unassigned.')) return

    try {
      // First, move all videos in this module to unassigned
      await supabase
        .from('course_videos')
        .update({ module_id: null })
        .eq('module_id', moduleId)

      // Then delete the module
      const { error } = await supabase
        .from('course_modules')
        .delete()
        .eq('id', moduleId)

      if (error) throw error
      
      loadCourseContent()
      toast({
        title: "Module deleted",
        description: "The module has been deleted and its videos moved to unassigned."
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      })
    }
  }

  const editVideo = (video: Video) => {
    setEditingVideo(video)
    setVideoFormData({
      title: video.title,
      description: video.description || '',
      video_url: video.video_url,
      video_type: video.video_type,
      module_id: video.module_id || 'none'
    })
    setShowVideoForm(true)
  }

  const editModule = (module: Module) => {
    setEditingModule(module)
    setModuleFormData({
      title: module.title,
      description: module.description || ''
    })
    setShowModuleForm(true)
  }

  const resetVideoForm = () => {
    setVideoFormData({
      title: '',
      description: '',
      video_url: '',
      video_type: 'youtube',
      module_id: 'none'
    })
    setVideoFile(null)
    setDocuments([])
    setShowVideoForm(false)
    setEditingVideo(null)
    setVideoTab('url')
  }

  const resetModuleForm = () => {
    setModuleFormData({
      title: '',
      description: ''
    })
    setShowModuleForm(false)
    setEditingModule(null)
  }

  const addDocument = (type: 'pdf' | 'link') => {
    if (type === 'link') {
      const url = prompt('Enter document URL:')
      const name = prompt('Enter document name:')
      if (url && name) {
        setDocuments(prev => [...prev, { name, type: 'link', url }])
      }
    }
  }

  const handleDocumentFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setDocuments(prev => [...prev, {
        file,
        name: file.name,
        type: 'pdf'
      }])
    }
  }

  const removeDocument = (index: number) => {
    setDocuments(prev => prev.filter((_, i) => i !== index))
  }

  const getModuleVideos = (moduleId: string | null) => {
    return videos.filter(video => video.module_id === moduleId)
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={(value: 'videos' | 'modules') => setActiveTab(value)}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="videos">Videos ({videos.length})</TabsTrigger>
          <TabsTrigger value="modules">Modules ({modules.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="videos" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Course Videos</h3>
            <Button onClick={() => setShowVideoForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Video
            </Button>
          </div>

          {/* Video Form */}
          {showVideoForm && (
            <Card>
              <CardHeader>
                <CardTitle>
                  {editingVideo ? 'Edit Video' : 'Add New Video'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleVideoSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="video-title">Title *</Label>
                      <Input
                        id="video-title"
                        value={videoFormData.title}
                        onChange={(e) => setVideoFormData(prev => ({ ...prev, title: e.target.value }))}
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="video-module">Module</Label>
                      <Select 
                        value={videoFormData.module_id} 
                        onValueChange={(value) => setVideoFormData(prev => ({ ...prev, module_id: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select module" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No Module (Unassigned)</SelectItem>
                          {modules.map((module) => (
                            <SelectItem key={module.id} value={module.id}>
                              {module.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="video-description">Description</Label>
                    <Textarea
                      id="video-description"
                      value={videoFormData.description}
                      onChange={(e) => setVideoFormData(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                    />
                  </div>

                  {/* Video Source */}
                  <div>
                    <Label>Video Source</Label>
                    <Tabs value={videoTab} onValueChange={(value: 'url' | 'upload') => setVideoTab(value)} className="mt-2">
                      <TabsList>
                        <TabsTrigger value="url">URL (YouTube/Vimeo/Loom)</TabsTrigger>
                        <TabsTrigger value="upload">Upload File</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="url" className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Platform</Label>
                            <Select 
                              value={videoFormData.video_type} 
                              onValueChange={(value) => setVideoFormData(prev => ({ ...prev, video_type: value }))}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="youtube">YouTube</SelectItem>
                                <SelectItem value="vimeo">Vimeo</SelectItem>
                                <SelectItem value="loom">Loom</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div>
                            <Label>Video URL *</Label>
                            <Input
                              value={videoFormData.video_url}
                              onChange={(e) => setVideoFormData(prev => ({ ...prev, video_url: e.target.value }))}
                              placeholder="https://..."
                              required={videoTab === 'url'}
                            />
                          </div>
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="upload">
                        <div>
                          <Label>Video File *</Label>
                          <Input
                            type="file"
                            accept="video/*"
                            onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                            required={videoTab === 'upload'}
                          />
                          {videoFile && (
                            <p className="text-sm text-muted-foreground mt-1">
                              Selected: {videoFile.name}
                            </p>
                          )}
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>

                  {/* Documents */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label>Supporting Documents</Label>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addDocument('link')}
                        >
                          <Link className="h-4 w-4 mr-1" />
                          Add Link
                        </Button>
                        <label className="cursor-pointer">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            asChild
                          >
                            <span>
                              <Upload className="h-4 w-4 mr-1" />
                              Upload File
                            </span>
                          </Button>
                          <input
                            type="file"
                            accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx"
                            onChange={handleDocumentFileChange}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>
                    
                    {documents.length > 0 && (
                      <div className="space-y-2">
                        {documents.map((doc, index) => (
                          <div key={index} className="flex items-center justify-between p-2 border rounded">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4" />
                              <span className="text-sm">{doc.name}</span>
                              <Badge variant="secondary" className="text-xs">
                                {doc.type === 'pdf' ? 'File' : 'Link'}
                              </Badge>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeDocument(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={resetVideoForm}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={loading}>
                      {loading ? 'Saving...' : (editingVideo ? 'Update Video' : 'Add Video')}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Videos List */}
          <div className="space-y-4">
            {/* Unassigned Videos */}
            {getModuleVideos(null).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Unassigned Videos</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {getModuleVideos(null).map((video) => (
                    <div key={video.id} className="flex items-center justify-between p-3 border rounded">
                      <div className="flex items-center gap-3">
                        <Video className="h-4 w-4" />
                        <div>
                          <div className="font-medium">{video.title}</div>
                          {video.description && (
                            <div className="text-sm text-muted-foreground">{video.description}</div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => editVideo(video)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => deleteVideo(video.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Videos by Module */}
            {modules.map((module) => {
              const moduleVideos = getModuleVideos(module.id)
              if (moduleVideos.length === 0) return null

              return (
                <Card key={module.id}>
                  <CardHeader>
                    <CardTitle className="text-sm">Module: {module.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {moduleVideos.map((video) => (
                      <div key={video.id} className="flex items-center justify-between p-3 border rounded">
                        <div className="flex items-center gap-3">
                          <Video className="h-4 w-4" />
                          <div>
                            <div className="font-medium">{video.title}</div>
                            {video.description && (
                              <div className="text-sm text-muted-foreground">{video.description}</div>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" onClick={() => editVideo(video)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => deleteVideo(video.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )
            })}

            {videos.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No videos added yet. Click "Add Video" to get started.
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="modules" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Course Modules</h3>
            <Button onClick={() => setShowModuleForm(true)}>
              <FolderPlus className="h-4 w-4 mr-2" />
              Add Module
            </Button>
          </div>

          {/* Module Form */}
          {showModuleForm && (
            <Card>
              <CardHeader>
                <CardTitle>
                  {editingModule ? 'Edit Module' : 'Add New Module'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleModuleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="module-title">Module Title *</Label>
                    <Input
                      id="module-title"
                      value={moduleFormData.title}
                      onChange={(e) => setModuleFormData(prev => ({ ...prev, title: e.target.value }))}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="module-description">Description</Label>
                    <Textarea
                      id="module-description"
                      value={moduleFormData.description}
                      onChange={(e) => setModuleFormData(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={resetModuleForm}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={loading}>
                      {loading ? 'Saving...' : (editingModule ? 'Update Module' : 'Add Module')}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Modules List */}
          <div className="space-y-2">
            {modules.map((module) => (
              <Card key={module.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{module.title}</div>
                      {module.description && (
                        <div className="text-sm text-muted-foreground">{module.description}</div>
                      )}
                      <Badge variant="outline" className="mt-1">
                        {getModuleVideos(module.id).length} videos
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => editModule(module)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => deleteModule(module.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {modules.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No modules created yet. Click "Add Module" to organize your videos.
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}