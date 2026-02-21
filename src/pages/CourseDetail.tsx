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
  Heart,
  ArrowLeft,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { AddModuleDialog } from '@/components/classroom/AddModuleDialog'
import { AddLessonDialog } from '@/components/classroom/AddLessonDialog'
import { AddResourceDialog } from '@/components/classroom/AddResourceDialog'
import { EditCourseDialog } from '@/components/classroom/EditCourseDialog'
import { EditLessonDialog } from '@/components/classroom/EditLessonDialog'
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
  community_ids: string[]
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
  const [userRating, setUserRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)

  // Mobile: null = module list view, lesson = lesson detail view
  const [mobileView, setMobileView] = useState<'modules' | 'lesson'>('modules')

  const [showAddModule, setShowAddModule] = useState(false)
  const [showAddLesson, setShowAddLesson] = useState<string | null>(null)
  const [showAddResource, setShowAddResource] = useState(false)
  const [showEditCourse, setShowEditCourse] = useState(false)
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null)

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
    } else if (selectedLesson) {
      // Refresh selectedLesson with latest data
      const updated = allLessons.find(l => l.id === selectedLesson.id)
      if (updated) setSelectedLesson(updated)
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

  const handleSelectLesson = (lesson: Lesson) => {
    setSelectedLesson(lesson)
    setMobileView('lesson')
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

  const getAllLessons = () => modules.flatMap(m => m.lessons)

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] gap-0">
        <div className="hidden md:flex w-72 border-r p-4 space-y-4 flex-col">
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
        <div className="hidden lg:flex w-72 border-l p-4 space-y-4 flex-col">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
        </div>
      </div>
    )
  }

  const allLessons = getAllLessons()
  const completedCount = allLessons.filter(l => l.completed).length

  // ── LEFT SIDEBAR (shared between desktop & mobile module list)
  const ModuleList = () => (
    <div className="flex flex-col h-full">
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
          <h2 className="font-bold text-sm leading-snug" style={{ color: '#290a52' }}>{course?.title}</h2>
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
                        onClick={() => handleSelectLesson(lesson)}
                        style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', width: '100%', padding: '10px 16px', textAlign: 'left' as const }}
                        className={cn(
                          'transition-colors group border-l-2',
                          isSelected
                            ? 'bg-secondary/10 border-secondary'
                            : 'hover:bg-accent/40 border-transparent'
                        )}
                      >
                        {/* Number badge or check */}
                        <div style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          width: '20px', height: '20px', borderRadius: '50%',
                          fontSize: '10px', fontWeight: 'bold', flexShrink: 0, marginTop: '2px',
                          backgroundColor: lesson.completed ? '#FFB500' : isSelected ? '#290a52' : '#e5e7eb',
                          color: lesson.completed ? '#000' : isSelected ? '#fff' : '#6b7280',
                        }}>
                          {lesson.completed
                            ? <CheckCircle2 className="h-3 w-3" />
                            : <span>{globalIdx}</span>
                          }
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ display: 'block', color: '#290a52', fontSize: '12px', fontWeight: 500, lineHeight: '1.4', wordBreak: 'break-word' }}>
                            {lesson.title}
                          </span>
                          {lesson.duration_seconds && (
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {Math.floor(lesson.duration_seconds / 60)} min
                            </p>
                          )}
                        </div>
                        {isAdminOrOwner && (
                          <button
                            onClick={e => { e.stopPropagation(); setEditingLesson(lesson) }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-accent"
                          >
                            <Pencil className="h-3 w-3 text-muted-foreground" />
                          </button>
                        )}
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
  )

  // ── LESSON CONTENT (shared)
  const LessonContent = () => (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 space-y-6">
      {/* Mobile back button */}
      <button
        onClick={() => setMobileView('modules')}
        className="md:hidden flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to modules
      </button>

      {/* Video Player */}
      {selectedLesson?.video_url ? (
        <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-lg">
          {(getEmbedUrl(selectedLesson.video_url)?.includes('embed') || getEmbedUrl(selectedLesson.video_url)?.includes('player')) ? (
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
      ) : (() => {
        const html = selectedLesson?.content || selectedLesson?.description || ''
        const imgMatch = html.match(/<img[^>]+src="([^"]+)"[^>]*>/i)
        if (imgMatch) {
          return (
            <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-lg flex items-center justify-center">
              <img src={imgMatch[1]} alt={selectedLesson?.title || ''} className="w-full h-full object-contain" />
            </div>
          )
        }
        return (
          <div className="relative w-full aspect-video bg-gradient-to-br from-muted/50 to-muted rounded-xl overflow-hidden flex items-center justify-center">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
                <Play className="h-7 w-7 text-primary ml-1" />
              </div>
              <p className="text-sm text-muted-foreground">No video for this lesson</p>
            </div>
          </div>
        )
      })()}

      {/* Instructor row — NO share button */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0" style={{ background: '#290a52' }}>
            {course?.instructor?.[0]?.toUpperCase() ?? 'T'}
          </div>
          <div>
            <p className="text-sm font-semibold">{course?.instructor ?? 'TruHeirs'}</p>
            <p className="text-xs text-muted-foreground">Publisher</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Heart className="h-4 w-4 text-muted-foreground" />
        </Button>
      </div>

      {/* Lesson title + mark complete */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold" style={{ color: '#290a52' }}>{selectedLesson?.title}</h1>
          {selectedLesson?.duration_seconds && (
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {Math.floor(selectedLesson.duration_seconds / 60)} min
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isAdminOrOwner && selectedLesson && (
            <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => setEditingLesson(selectedLesson)}>
              <Pencil className="h-3.5 w-3.5" /> Edit Lesson
            </Button>
          )}
          <Button
            variant={selectedLesson?.completed ? 'default' : 'outline'}
            size="sm"
            onClick={() => selectedLesson && toggleCompletion(selectedLesson)}
            className={cn('gap-1.5 text-xs', selectedLesson?.completed && 'bg-accent hover:bg-accent/90 text-accent-foreground border-0')}
          >
            {selectedLesson?.completed
              ? <><CheckCircle2 className="h-3.5 w-3.5" /> Completed</>
              : <><Circle className="h-3.5 w-3.5" /> Mark Complete</>
            }
          </Button>
        </div>
      </div>

      {/* Lesson content */}
      {(selectedLesson?.content || selectedLesson?.description) && (() => {
        let html = selectedLesson.content || selectedLesson.description || ''
        // If no video, strip the first image (already shown in the video spot)
        if (!selectedLesson.video_url) {
          html = html.replace(/<img[^>]+>/i, '')
        }
        // Only render if there's still meaningful content after stripping
        const hasText = html.replace(/<[^>]*>/g, '').trim().length > 0
        return hasText ? (
          <div
            className="prose prose-sm max-w-none text-foreground prose-headings:text-foreground prose-a:text-primary prose-blockquote:border-primary prose-blockquote:text-muted-foreground pb-6 border-b border-border"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : null
      })()}

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
                {res.resource_type === 'pdf'
                  ? <FileText className="h-4 w-4 text-destructive shrink-0" />
                  : res.resource_type === 'file'
                  ? <Download className="h-4 w-4 text-secondary-foreground shrink-0" />
                  : <LinkIcon className="h-4 w-4 text-primary shrink-0" />
                }
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
  )

  // ── RIGHT SIDEBAR
  const RightSidebar = () => (
    <div className="p-5 space-y-5">
      {/* Course thumbnail */}
      {course?.image_url ? (
        <img src={course.image_url} alt={course?.title} className="w-full aspect-video object-cover rounded-xl" />
      ) : (
        <div className="w-full aspect-video rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #290a52 0%, #6215C8 100%)' }}>
          <BookOpen className="h-10 w-10 text-white/50" />
        </div>
      )}

      {/* Progress card */}
      <div className="rounded-xl border border-border p-4 space-y-3">
        <Progress value={progressPercent} className="h-2" style={{ '--progress-background': '#FFB500' } as any} />
        <p className="text-xs text-muted-foreground">{completedCount} of {totalLessons} lessons completed</p>
      </div>

      {/* Rating — clearly visible with interactive stars */}
      <div className="rounded-xl border border-border p-4 space-y-3">
        <p className="text-sm font-bold" style={{ color: '#290a52' }}>Rating</p>
        <p className="text-xs text-muted-foreground">Rate this course:</p>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map(i => (
            <button
              key={i}
              onMouseEnter={() => setHoverRating(i)}
              onMouseLeave={() => setHoverRating(0)}
              onClick={() => setUserRating(i)}
              className="transition-transform hover:scale-110"
              title={`Rate ${i} star${i > 1 ? 's' : ''}`}
            >
              <Star
                className="h-6 w-6 transition-colors"
                style={{
                  fill: i <= (hoverRating || userRating) ? '#FFB500' : 'transparent',
                  color: i <= (hoverRating || userRating) ? '#FFB500' : '#d1d5db',
                  strokeWidth: 1.5,
                }}
              />
            </button>
          ))}
        </div>
        {userRating > 0 && (
          <p className="text-xs text-muted-foreground">You rated: {userRating}/5 ⭐</p>
        )}
      </div>

      {/* Publisher — with distinct background so it stands out */}
      <div className="rounded-xl border border-border p-4 space-y-3" style={{ background: '#f8f4ff' }}>
        <p className="text-sm font-bold" style={{ color: '#290a52' }}>Publisher</p>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0" style={{ background: '#290a52' }}>
            {course?.instructor?.[0]?.toUpperCase() ?? 'T'}
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: '#290a52' }}>{course?.instructor ?? 'TruHeirs'}</p>
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

    </div>
  )

  return (
    <>
      {/* ── DESKTOP LAYOUT (md+) ── */}
      <div className="hidden md:flex h-[calc(100vh-4rem)] overflow-hidden bg-background">

        {/* Left sidebar */}
        <div className="w-72 border-r border-border bg-card flex flex-col shrink-0">
          <ModuleList />
        </div>

        {/* Center content */}
        <div className="flex-1 overflow-y-auto">
          {selectedLesson ? (
            <LessonContent />
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

        {/* Right sidebar */}
        <div className="w-72 border-l border-border bg-card flex flex-col shrink-0 overflow-y-auto">
          <RightSidebar />
        </div>
      </div>

      {/* ── MOBILE LAYOUT (< md) ── */}
      <div className="md:hidden flex flex-col h-[calc(100vh-4rem)] overflow-hidden bg-background">
        {mobileView === 'modules' ? (
          /* Module list fills the screen */
          <div className="flex-1 overflow-hidden bg-card">
            <ModuleList />
          </div>
        ) : (
          /* Lesson detail + right sidebar info stacked */
          <div className="flex-1 overflow-y-auto pb-24">
            {selectedLesson && <LessonContent />}
            {/* Compact right sidebar info on mobile */}
            <div className="px-4 pb-6 space-y-4">
              {/* Progress */}
              <div className="rounded-xl border border-border p-4 space-y-2">
                <Progress value={progressPercent} className="h-2" />
                <p className="text-xs text-muted-foreground">{completedCount} of {totalLessons} lessons completed</p>
              </div>
              {/* Rating */}
              <div className="rounded-xl border border-border p-4 space-y-2">
                <p className="text-sm font-bold" style={{ color: '#290a52' }}>Rating</p>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map(i => (
                    <button key={i} onClick={() => setUserRating(i)} className="transition-transform hover:scale-110">
                      <Star className="h-6 w-6 transition-colors" style={{ fill: i <= userRating ? '#FFB500' : 'transparent', color: i <= userRating ? '#FFB500' : '#d1d5db', strokeWidth: 1.5 }} />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
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
          <EditLessonDialog
            lesson={editingLesson}
            open={!!editingLesson}
            onOpenChange={(open) => !open && setEditingLesson(null)}
            onUpdated={() => { fetchData(); setEditingLesson(null) }}
          />
        </>
      )}
    </>
  )
}
