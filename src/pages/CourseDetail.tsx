import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  ChevronDown,
  ChevronLeft,
  CheckCircle2,
  Circle,
  Pencil,
  FileText,
  Link as LinkIcon,
  ExternalLink,
  Download,
  Play,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { AddModuleDialog } from '@/components/classroom/AddModuleDialog'
import { AddLessonDialog } from '@/components/classroom/AddLessonDialog'
import { AddResourceDialog } from '@/components/classroom/AddResourceDialog'
import { EditCourseDialog } from '@/components/classroom/EditCourseDialog'

interface Module {
  id: string
  title: string
  description: string | null
  order_index: number
  lessons: Lesson[]
}

interface Lesson {
  id: string
  title: string
  description: string | null
  content: string | null
  video_url: string | null
  video_type: string
  order_index: number | null
  module_id: string | null
  duration_seconds: number | null
  completed: boolean
}

interface Resource {
  id: string
  title: string
  resource_type: string
  url: string | null
  file_path: string | null
}

interface Course {
  id: string
  title: string
  description: string | null
  image_url: string | null
  status: string
}

export default function CourseDetail() {
  const { courseId } = useParams<{ courseId: string }>()
  const { user } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [course, setCourse] = useState<Course | null>(null)
  const [modules, setModules] = useState<Module[]>([])
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null)
  const [resources, setResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)
  const [openModules, setOpenModules] = useState<Set<string>>(new Set())
  const [progressPercent, setProgressPercent] = useState(0)

  // Admin dialogs
  const [showAddModule, setShowAddModule] = useState(false)
  const [showAddLesson, setShowAddLesson] = useState<string | null>(null)
  const [showAddResource, setShowAddResource] = useState(false)
  const [showEditCourse, setShowEditCourse] = useState(false)

  const fetchData = useCallback(async () => {
    if (!courseId) return
    setLoading(true)

    const [courseRes, modulesRes, lessonsRes, completionsRes] = await Promise.all([
      supabase.from('courses').select('*').eq('id', courseId).single(),
      supabase.from('course_modules').select('*').eq('course_id', courseId).order('order_index'),
      supabase.from('course_videos').select('*').eq('course_id', courseId).order('order_index'),
      user?.id
        ? supabase.from('lesson_completions').select('lesson_id').eq('course_id', courseId).eq('user_id', user.id)
        : Promise.resolve({ data: [] }),
    ])

    if (courseRes.error) {
      toast({ title: 'Error', description: 'Course not found', variant: 'destructive' })
      navigate('/classroom')
      return
    }

    setCourse(courseRes.data)

    const completedIds = new Set((completionsRes.data || []).map((c: any) => c.lesson_id))
    const allLessons: Lesson[] = (lessonsRes.data || []).map((l: any) => ({
      ...l,
      completed: completedIds.has(l.id),
    }))

    const mods: Module[] = (modulesRes.data || []).map((m: any) => ({
      ...m,
      lessons: allLessons.filter(l => l.module_id === m.id).sort((a, b) => (a.order_index || 0) - (b.order_index || 0)),
    }))

    // Lessons without a module
    const orphanLessons = allLessons.filter(l => !l.module_id)
    if (orphanLessons.length) {
      mods.unshift({ id: '__uncategorized', title: 'START HERE', description: null, order_index: -1, lessons: orphanLessons })
    }

    setModules(mods)

    // Auto-select first lesson
    const totalLessons = allLessons.length
    const completedCount = allLessons.filter(l => l.completed).length
    setProgressPercent(totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0)

    if (!selectedLesson && allLessons.length > 0) {
      setSelectedLesson(allLessons[0])
      if (mods.length > 0) setOpenModules(new Set([mods[0].id]))
    }

    setLoading(false)
  }, [courseId, user?.id])

  useEffect(() => { fetchData() }, [fetchData])

  // Fetch resources when lesson changes
  useEffect(() => {
    if (!selectedLesson) return
    supabase
      .from('course_resources')
      .select('*')
      .eq('lesson_id', selectedLesson.id)
      .order('order_index')
      .then(({ data }) => setResources(data || []))
  }, [selectedLesson?.id])

  const toggleModule = (id: string) => {
    setOpenModules(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleCompletion = async (lesson: Lesson) => {
    if (!user?.id || !courseId) return
    if (lesson.completed) {
      await supabase.from('lesson_completions').delete().eq('user_id', user.id).eq('lesson_id', lesson.id)
    } else {
      await supabase.from('lesson_completions').insert({ user_id: user.id, lesson_id: lesson.id, course_id: courseId })
    }
    fetchData()
  }

  const getEmbedUrl = (url: string | null) => {
    if (!url) return null
    // YouTube
    const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`
    // Vimeo
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/)
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`
    // Loom
    const loomMatch = url.match(/loom\.com\/share\/([a-zA-Z0-9]+)/)
    if (loomMatch) return `https://www.loom.com/embed/${loomMatch[1]}`
    // Already an embed or direct video
    return url
  }

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)]">
        <div className="w-80 border-r p-4 space-y-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
        <div className="flex-1 p-8">
          <Skeleton className="h-8 w-64 mb-4" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Left Sidebar */}
      <div className="w-80 border-r border-border bg-card flex flex-col shrink-0">
        <div className="p-4 border-b border-border space-y-3">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('/classroom')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="font-semibold text-sm line-clamp-1 flex-1">{course?.title}</h2>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowEditCourse(true)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="space-y-1">
            <Progress value={progressPercent} className="h-2" />
            <span className="text-xs text-muted-foreground">{progressPercent}%</span>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="py-2">
            {modules.map(mod => (
              <Collapsible key={mod.id} open={openModules.has(mod.id)} onOpenChange={() => toggleModule(mod.id)}>
                <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-2.5 text-sm font-semibold hover:bg-accent/50 transition-colors text-left">
                  <span className="line-clamp-1 text-amber-400">{mod.title}</span>
                  <ChevronDown className={cn('h-4 w-4 shrink-0 transition-transform text-muted-foreground', openModules.has(mod.id) && 'rotate-180')} />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  {mod.lessons.map(lesson => (
                    <button
                      key={lesson.id}
                      onClick={() => setSelectedLesson(lesson)}
                      className={cn(
                        'flex items-center gap-2 w-full px-6 py-2 text-sm text-left hover:bg-accent/50 transition-colors',
                        selectedLesson?.id === lesson.id && 'bg-amber-500/20 text-amber-400 font-medium border-l-2 border-amber-400'
                      )}
                    >
                      {lesson.completed ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                      ) : (
                        <Circle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      )}
                      <span className="line-clamp-1">{lesson.title}</span>
                    </button>
                  ))}
                  {mod.id !== '__uncategorized' && (
                    <button
                      onClick={() => setShowAddLesson(mod.id)}
                      className="px-6 py-1.5 text-xs text-muted-foreground hover:text-foreground w-full text-left"
                    >
                      + Add lesson
                    </button>
                  )}
                </CollapsibleContent>
              </Collapsible>
            ))}
            <button
              onClick={() => setShowAddModule(true)}
              className="px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground w-full text-left"
            >
              + Add module
            </button>
          </div>
        </ScrollArea>
      </div>

      {/* Right Content */}
      <div className="flex-1 overflow-y-auto">
        {selectedLesson ? (
          <div className="max-w-4xl mx-auto p-6 space-y-6">
            {/* Lesson Header */}
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold">{selectedLesson.title}</h1>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => toggleCompletion(selectedLesson)}
                  title={selectedLesson.completed ? 'Mark incomplete' : 'Mark complete'}
                >
                  {selectedLesson.completed ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground" />
                  )}
                </Button>
                <Button variant="ghost" size="icon">
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Video Player */}
            {selectedLesson.video_url && (
              <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
                {getEmbedUrl(selectedLesson.video_url)?.includes('embed') || getEmbedUrl(selectedLesson.video_url)?.includes('player') ? (
                  <iframe
                    src={getEmbedUrl(selectedLesson.video_url)!}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <video src={selectedLesson.video_url} controls className="w-full h-full" />
                )}
              </div>
            )}

            {/* Duration */}
            {selectedLesson.duration_seconds && (
              <p className="text-sm text-muted-foreground">
                {Math.floor(selectedLesson.duration_seconds / 60)} min
              </p>
            )}

            {/* Lesson Description / Content */}
            {selectedLesson.description && (
              <div className="space-y-2">
                <p className="font-semibold">Goal:</p>
                <p className="text-muted-foreground">{selectedLesson.description}</p>
              </div>
            )}

            {selectedLesson.content && (
              <div className="prose prose-invert max-w-none text-foreground" dangerouslySetInnerHTML={{ __html: selectedLesson.content.replace(/\n/g, '<br/>') }} />
            )}

            {/* Resources */}
            {resources.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold">Resources</h3>
                <div className="space-y-2">
                  {resources.map(res => (
                    <a
                      key={res.id}
                      href={res.url || res.file_path || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors"
                    >
                      {res.resource_type === 'pdf' ? (
                        <FileText className="h-5 w-5 text-red-500 shrink-0" />
                      ) : res.resource_type === 'file' ? (
                        <Download className="h-5 w-5 text-blue-500 shrink-0" />
                      ) : (
                        <LinkIcon className="h-5 w-5 text-primary shrink-0" />
                      )}
                      <span className="text-sm font-medium text-primary">{res.title}</span>
                      <ExternalLink className="h-3 w-3 text-muted-foreground ml-auto" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            <Button variant="outline" size="sm" onClick={() => setShowAddResource(true)}>
              + Add Resource
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center space-y-2">
              <Play className="h-12 w-12 mx-auto opacity-30" />
              <p>Select a lesson to get started</p>
            </div>
          </div>
        )}
      </div>

      {/* Dialogs */}
      {courseId && (
        <>
          <AddModuleDialog
            courseId={courseId}
            open={showAddModule}
            onOpenChange={setShowAddModule}
            onCreated={fetchData}
          />
          <AddLessonDialog
            courseId={courseId}
            moduleId={showAddLesson}
            open={!!showAddLesson}
            onOpenChange={(open) => !open && setShowAddLesson(null)}
            onCreated={fetchData}
          />
          <AddResourceDialog
            courseId={courseId}
            lessonId={selectedLesson?.id || null}
            open={showAddResource}
            onOpenChange={setShowAddResource}
            onCreated={() => {
              fetchData()
              // Re-fetch resources
              if (selectedLesson) {
                supabase.from('course_resources').select('*').eq('lesson_id', selectedLesson.id).order('order_index')
                  .then(({ data }) => setResources(data || []))
              }
            }}
          />
          <EditCourseDialog
            course={course}
            open={showEditCourse}
            onOpenChange={setShowEditCourse}
            onUpdated={fetchData}
          />
        </>
      )}
    </div>
  )
}
