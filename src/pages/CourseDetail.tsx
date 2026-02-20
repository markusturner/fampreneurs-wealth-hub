import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
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
  Clock,
  BookOpen,
  Star,
  Users,
  Share2,
  Heart,
  MoreHorizontal,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { AddModuleDialog } from '@/components/classroom/AddModuleDialog'
import { AddLessonDialog } from '@/components/classroom/AddLessonDialog'
import { AddResourceDialog } from '@/components/classroom/AddResourceDialog'
import { EditCourseDialog } from '@/components/classroom/EditCourseDialog'
import { useIsAdminOrOwner } from '@/hooks/useIsAdminOrOwner'

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
  instructor?: string | null
  duration?: string | null
  level?: string | null
}

export default function CourseDetail() {
  const { courseId } = useParams<{ courseId: string }>()
  const { user } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const { isAdminOrOwner } = useIsAdminOrOwner()

  const [course, setCourse] = useState<Course | null>(null)
  const [modules, setModules] = useState<Module[]>([])
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null)
  const [resources, setResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)
  const [openModules, setOpenModules] = useState<Set<string>>(new Set())
  const [progressPercent, setProgressPercent] = useState(0)
  const [totalLessons, setTotalLessons] = useState(0)

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

    const orphanLessons = allLessons.filter(l => !l.module_id)
    if (orphanLessons.length) {
      mods.unshift({ id: '__uncategorized', title: 'START HERE', description: null, order_index: -1, lessons: orphanLessons })
    }

    setModules(mods)
    setTotalLessons(allLessons.length)

    const completedCount = allLessons.filter(l => l.completed).length
    setProgressPercent(allLessons.length > 0 ? Math.round((completedCount / allLessons.length) * 100) : 0)

    if (!selectedLesson && allLessons.length > 0) {
      setSelectedLesson(allLessons[0])
      if (mods.length > 0) setOpenModules(new Set([mods[0].id]))
    }

    setLoading(false)
  }, [courseId, user?.id])

  useEffect(() => { fetchData() }, [fetchData])

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
    const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/)
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`
    const loomMatch = url.match(/loom\.com\/share\/([a-zA-Z0-9]+)/)
    if (loomMatch) return `https://www.loom.com/embed/${loomMatch[1]}`
    return url
  }

  // Get flat lesson index for numbering
  const getAllLessons = () => modules.flatMap(m => m.lessons)

  const getLessonGlobalIndex = (lessonId: string) => {
    const all = getAllLessons()
    return all.findIndex(l => l.id === lessonId)
  }

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] gap-0">
        <div className="w-72 border-r p-4 space-y-4">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-3 w-full" />
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-8 w-full" />)}
        </div>
        <div className="flex-1 p-6 space-y-4">
          <Skeleton className="h-72 w-full rounded-xl" />
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
        <div className="w-72 border-l p-4 space-y-4">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
        </div>
      </div>
    )
  }

  const allLessons = getAllLessons()
  const completedCount = allLessons.filter(l => l.completed).length

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-background">

      {/* ── LEFT SIDEBAR ── */}
      <div className="w-72 border-r border-border bg-card flex flex-col shrink-0">
        {/* Back + Course title */}
        <div className="p-4 border-b border-border space-y-3">
          <button
            onClick={() => navigate('/classroom')}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Back to courses
          </button>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Course</p>
            <h2 className="font-bold text-sm leading-snug">{course?.title}</h2>
          </div>
          {isAdminOrOwner && (
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 -ml-2" onClick={() => setShowEditCourse(true)}>
              <Pencil className="h-3 w-3" /> Edit Course
            </Button>
          )}
          {/* Progress */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{completedCount}/{totalLessons} lessons</span>
              <span>{progressPercent}%</span>
            </div>
            <Progress value={progressPercent} className="h-1.5" />
          </div>
        </div>

        {/* Module / Lesson list */}
        <ScrollArea className="flex-1">
          <div className="py-2">
            {modules.map((mod) => {
              let lessonCounter = 0
              // compute offset for this module
              const modIndex = modules.indexOf(mod)
              for (let i = 0; i < modIndex; i++) lessonCounter += modules[i].lessons.length

              return (
                <Collapsible key={mod.id} open={openModules.has(mod.id)} onOpenChange={() => toggleModule(mod.id)}>
                  <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-3 text-xs font-semibold uppercase tracking-wider hover:bg-accent/40 transition-colors text-left">
                    <span style={{ color: '#290a52' }}>{mod.title}</span>
                    <ChevronDown className={cn('h-3.5 w-3.5 shrink-0 transition-transform text-muted-foreground', openModules.has(mod.id) && 'rotate-180')} />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    {mod.lessons.map((lesson, idx) => {
                      const globalIdx = lessonCounter + idx + 1
                      const isSelected = selectedLesson?.id === lesson.id
                      return (
                        <button
                          key={lesson.id}
                          onClick={() => setSelectedLesson(lesson)}
                          className={cn(
                            'flex items-start gap-3 w-full px-4 py-2.5 text-left transition-colors group',
                            isSelected
                              ? 'bg-secondary/10 border-l-2 border-secondary'
                              : 'hover:bg-accent/40 border-l-2 border-transparent'
                          )}
                        >
                          {/* Number badge or check */}
                          <div className={cn(
                            'flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold shrink-0 mt-0.5',
                            lesson.completed
                              ? 'bg-accent text-accent-foreground'
                              : isSelected
                                ? 'bg-secondary text-secondary-foreground'
                                : 'bg-muted text-muted-foreground'
                          )}>
                            {lesson.completed ? <CheckCircle2 className="h-3 w-3" /> : <span>{globalIdx}</span>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={cn('text-xs font-medium leading-snug line-clamp-2', isSelected ? 'text-secondary' : 'text-card-foreground')}>
                              {lesson.title}
                            </p>
                            {lesson.duration_seconds && (
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                {Math.floor(lesson.duration_seconds / 60)} min
                              </p>
                            )}
                          </div>
                        </button>
                      )
                    })}
                    {isAdminOrOwner && mod.id !== '__uncategorized' && (
                      <button
                        onClick={() => setShowAddLesson(mod.id)}
                        className="px-4 py-2 text-xs text-muted-foreground hover:text-foreground w-full text-left flex items-center gap-1"
                      >
                        <span className="text-base leading-none">+</span> Add lesson
                      </button>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              )
            })}
            {isAdminOrOwner && (
              <button
                onClick={() => setShowAddModule(true)}
                className="px-4 py-3 text-xs text-muted-foreground hover:text-foreground w-full text-left flex items-center gap-1"
              >
                <span className="text-base leading-none">+</span> Add module
              </button>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* ── CENTER CONTENT ── */}
      <div className="flex-1 overflow-y-auto">
        {selectedLesson ? (
          <div className="max-w-3xl mx-auto px-6 py-6 space-y-6">

            {/* Video Player */}
            {selectedLesson.video_url ? (
              <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-lg">
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
            ) : (
              <div className="relative w-full aspect-video bg-gradient-to-br from-muted/50 to-muted rounded-xl overflow-hidden flex items-center justify-center">
                <div className="text-center space-y-3">
                  <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
                    <Play className="h-7 w-7 text-primary ml-1" />
                  </div>
                  <p className="text-sm text-muted-foreground">No video for this lesson</p>
                </div>
              </div>
            )}

            {/* Instructor row */}
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                  {course?.instructor?.[0]?.toUpperCase() ?? 'T'}
                </div>
                <div>
                  <p className="text-sm font-semibold">{course?.instructor ?? 'TruHeirs'}</p>
                  <p className="text-xs text-muted-foreground">Publisher</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Heart className="h-4 w-4 text-muted-foreground" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Share2 className="h-4 w-4 text-muted-foreground" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            </div>

            {/* Lesson title + mark complete */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold">{selectedLesson.title}</h1>
                {selectedLesson.duration_seconds && (
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {Math.floor(selectedLesson.duration_seconds / 60)} min
                  </p>
                )}
              </div>
              <Button
                variant={selectedLesson.completed ? 'default' : 'outline'}
                size="sm"
                onClick={() => toggleCompletion(selectedLesson)}
                className={cn('shrink-0 gap-1.5 text-xs', selectedLesson.completed && 'bg-accent hover:bg-accent/90 text-accent-foreground border-0')}
              >
                {selectedLesson.completed ? (
                  <><CheckCircle2 className="h-3.5 w-3.5" /> Completed</>
                ) : (
                  <><Circle className="h-3.5 w-3.5" /> Mark Complete</>
                )}
              </Button>
            </div>

            {/* Description */}
            {selectedLesson.description && (
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">Description</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{selectedLesson.description}</p>
              </div>
            )}

            {/* Content */}
            {selectedLesson.content && (
              <div
                className="prose prose-sm max-w-none text-foreground prose-headings:text-foreground prose-p:text-muted-foreground"
                dangerouslySetInnerHTML={{ __html: selectedLesson.content.replace(/\n/g, '<br/>') }}
              />
            )}

            {/* Resources */}
            {resources.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-sm">Resources</h3>
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
                         <FileText className="h-4 w-4 text-destructive shrink-0" />
                       ) : res.resource_type === 'file' ? (
                         <Download className="h-4 w-4 text-secondary-foreground shrink-0" />
                      ) : (
                        <LinkIcon className="h-4 w-4 text-primary shrink-0" />
                      )}
                      <span className="text-sm font-medium text-primary flex-1">{res.title}</span>
                      <ExternalLink className="h-3 w-3 text-muted-foreground" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {isAdminOrOwner && (
              <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => setShowAddResource(true)}>
                + Add Resource
              </Button>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-4">
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto">
                <Play className="h-9 w-9 text-muted-foreground opacity-50 ml-1" />
              </div>
              <div>
                <p className="font-semibold">Ready to learn?</p>
                <p className="text-sm text-muted-foreground mt-1">Select a lesson from the sidebar to get started</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── RIGHT SIDEBAR ── */}
      <div className="w-72 border-l border-border bg-card flex flex-col shrink-0 overflow-y-auto">
        <div className="p-5 space-y-5">

          {/* Course thumbnail */}
          {course?.image_url ? (
            <img src={course.image_url} alt={course.title} className="w-full aspect-video object-cover rounded-xl" />
          ) : (
            <div className="w-full aspect-video rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center">
              <BookOpen className="h-10 w-10 text-primary/50" />
            </div>
          )}

          {/* Course includes */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Course includes</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2.5 text-sm">
                <Play className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>{totalLessons} lessons</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>{course?.duration ?? 'Self-paced'}</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm">
                <BookOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>{modules.length} modules</span>
              </div>
              {resources.length > 0 && (
                <div className="flex items-center gap-2.5 text-sm">
                  <Download className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>{resources.length} downloadable resources</span>
                </div>
              )}
            </div>
          </div>

          {/* Progress card */}
          <div className="rounded-xl border border-border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Your Progress</p>
              <Badge variant="secondary" className="text-xs">{progressPercent}%</Badge>
            </div>
            <Progress value={progressPercent} className="h-2" />
            <p className="text-xs text-muted-foreground">{completedCount} of {totalLessons} lessons completed</p>
          </div>

          {/* Rating */}
          <div className="rounded-xl border border-border p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                <Star className="h-4 w-4 text-primary fill-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold">Rating</p>
                <div className="flex items-center gap-0.5 mt-0.5">
                  {[1,2,3,4,5].map(i => (
                    <Star key={i} className="h-3 w-3 fill-primary text-primary" />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Publisher */}
          <div className="rounded-xl border border-border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Publisher</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                {course?.instructor?.[0]?.toUpperCase() ?? 'T'}
              </div>
              <div>
                <p className="text-sm font-medium">{course?.instructor ?? 'TruHeirs'}</p>
                <p className="text-xs text-muted-foreground">Course Creator</p>
              </div>
            </div>
            <div className="space-y-1.5 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                <span>{totalLessons} lessons published</span>
              </div>
              {course?.level && (
                <div className="flex items-center gap-1.5">
                  <BookOpen className="h-3.5 w-3.5" />
                  <span>{course.level} level</span>
                </div>
              )}
            </div>
          </div>

          {/* Admin edit */}
          {isAdminOrOwner && (
            <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs" onClick={() => setShowEditCourse(true)}>
              <Pencil className="h-3.5 w-3.5" /> Edit Course Details
            </Button>
          )}
        </div>
      </div>

      {/* Dialogs */}
      {courseId && (
        <>
          <AddModuleDialog courseId={courseId} open={showAddModule} onOpenChange={setShowAddModule} onCreated={fetchData} />
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
              if (selectedLesson) {
                supabase.from('course_resources').select('*').eq('lesson_id', selectedLesson.id).order('order_index')
                  .then(({ data }) => setResources(data || []))
              }
            }}
          />
          <EditCourseDialog course={course} open={showEditCourse} onOpenChange={setShowEditCourse} onUpdated={fetchData} />
        </>
      )}
    </div>
  )
}
