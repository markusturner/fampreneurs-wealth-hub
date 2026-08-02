import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { BackToWelcome } from '@/components/layout/BackToWelcome'
import { Plus, BookOpen, Pencil, Trash2, GripVertical, FileText, Shield, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { AddCourseDialog } from '@/components/classroom/AddCourseDialog'
import { EditCourseDialog } from '@/components/classroom/EditCourseDialog'
import SopLibraryPanel from '@/components/classroom/SopLibraryPanel'
import TrustCreation from '@/pages/TrustCreation'
import SuccessionPlanning from '@/pages/SuccessionPlanning'
import { useIsAdminOrOwner } from '@/hooks/useIsAdminOrOwner'
import { useSubscription } from '@/hooks/useSubscription'
import { profileProgramCodes } from '@/lib/programs'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface Course {
  id: string
  title: string
  description: string | null
  image_url: string | null
  progress: number
  community_ids: string[]
  order_index: number
}

interface SortableCourseCardProps {
  course: Course
  isAdminOrOwner: boolean
  onEdit: (course: Course) => void
  onDelete: (id: string) => void
  onClick: (id: string) => void
}

function SortableCourseCard({ course, isAdminOrOwner, onEdit, onDelete, onClick }: SortableCourseCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: course.id, disabled: !isAdminOrOwner })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  }

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group relative"
      onClick={() => onClick(course.id)}
    >
      {isAdminOrOwner && (
        <div className="absolute top-2 right-2 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              variant="secondary"
              size="icon"
              className="h-8 w-8 bg-background/80 backdrop-blur-sm hover:bg-background"
            >
              <GripVertical className="h-3.5 w-3.5" />
            </Button>
          </div>
          <Button
            variant="secondary"
            size="icon"
            className="h-8 w-8 bg-background/80 backdrop-blur-sm hover:bg-background"
            onClick={(e) => { e.stopPropagation(); onEdit(course) }}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="destructive"
            size="icon"
            className="h-8 w-8 bg-destructive/80 backdrop-blur-sm hover:bg-destructive"
            onClick={async (e) => {
              e.stopPropagation()
              onDelete(course.id)
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
      <div className="h-44 bg-muted overflow-hidden">
        {course.image_url ? (
          <img src={course.image_url} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <BookOpen className="h-10 w-10 text-muted-foreground" />
          </div>
        )}
      </div>
      <CardContent className="p-4 space-y-3">
        <h3 className="font-semibold line-clamp-1">{course.title}</h3>
        {course.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{course.description}</p>
        )}
        <div className="space-y-1">
          <Progress value={course.progress} className="h-2" />
          <span className="text-xs text-muted-foreground">{course.progress}%</span>
        </div>
      </CardContent>
    </Card>
  )
}

export default function Classroom() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const initialTab = (searchParams.get('tab') as any) || 'classroom'
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddCourse, setShowAddCourse] = useState(false)
  const [editingCourse, setEditingCourse] = useState<Course | null>(null)
  const [activeTab, setActiveTab] = useState<'classroom' | 'sops' | 'ai' | 'trust' | 'succession'>(initialTab)
  const { isAdminOrOwner } = useIsAdminOrOwner()
  const { toast } = useToast()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('status', 'published')
        .order('order_index', { ascending: true })
        .order('created_at', { ascending: true })

      if (error) throw error

      let enrollments: any[] = []
      if (user?.id) {
        const { data: enrollData } = await supabase
          .from('course_enrollments')
          .select('course_id, progress')
          .eq('user_id', user.id)
        enrollments = enrollData || []
      }

      let userCommunityIds: string[] = []
      if (!isAdminOrOwner && profile?.program_name) {
        // Support multi-program assignments stored as comma-separated strings
        const programToGroup: Record<string, string> = {
          'The Family Business University': 'Family Business University',
          'The Family Vault': 'The Family Vault',
          'The Family Business Accelerator': 'The Family Business Accelerator',
          'The Family Fortune Mastermind': 'The Succession Society',
        }
        const programNames = profile.program_name
          .split(',')
          .map((p: string) => p.trim())
          .filter(Boolean)
        const groupNames = programNames.map((p: string) => programToGroup[p] || p)
        if (groupNames.length > 0) {
          const { data: groupData } = await supabase
            .from('community_groups')
            .select('id')
            .in('name', groupNames)
          userCommunityIds = (groupData || []).map((g: any) => g.id)
        }
      }

      const allCourses = (data || []).map((course: any) => {
        const enrollment = enrollments.find(e => e.course_id === course.id)
        return {
          id: course.id,
          title: course.title,
          description: course.description,
          image_url: course.image_url,
          progress: enrollment?.progress || 0,
          community_ids: course.community_ids || [],
          order_index: course.order_index || 0,
        }
      })

      const visibleCourses = isAdminOrOwner
        ? allCourses
        : allCourses.filter(course => {
            if (!course.community_ids || course.community_ids.length === 0) return true
            return userCommunityIds.some(id => course.community_ids.includes(id))
          })

      setCourses(visibleCourses)
    } catch (error) {
      console.error('Error fetching courses:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchCourses() }, [isAdminOrOwner, profile?.program_name])

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = courses.findIndex(c => c.id === active.id)
    const newIndex = courses.findIndex(c => c.id === over.id)
    const reordered = arrayMove(courses, oldIndex, newIndex)
    setCourses(reordered)

    // Persist new order
    const updates = reordered.map((course, idx) => 
      supabase.from('courses').update({ order_index: idx } as any).eq('id', course.id)
    )
    await Promise.all(updates)
  }

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('courses').delete().eq('id', id)
    if (!error) { fetchCourses(); toast({ title: 'Course deleted' }) }
    else toast({ title: 'Error', description: 'Failed to delete course', variant: 'destructive' })
  }

  const SUCCESSION_SOCIETY_ID = '3948275b-06bf-4731-a89f-e0850e26f0e4'
  const successionCourses = courses.filter(c => (c.community_ids || []).includes(SUCCESSION_SOCIETY_ID))
  const trustCourses = courses.filter(c => !(c.community_ids || []).includes(SUCCESSION_SOCIETY_ID))

  const primaryTabs = [
    { key: 'classroom', label: 'Classroom', icon: BookOpen },
    { key: 'sops', label: 'SOP Library', icon: FileText },
  ] as const
  const toolTabs = [
    { key: 'trust', label: 'Trust Creation', icon: Shield },
    { key: 'succession', label: 'Succession Planning', icon: Users },
  ] as const

  return (
    <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-6xl space-y-4 sm:space-y-6">
      <BackToWelcome />

      <div>
        <h1 className="text-xl sm:text-2xl font-bold">Classroom</h1>
        <p className="text-muted-foreground text-xs sm:text-sm">Access your courses and track your progress</p>
      </div>

      {/* Sticky nav: content on the left, tools on the right */}
      <div className="sticky top-0 z-30 -mx-3 sm:-mx-4 px-3 sm:px-4 py-2 bg-background/85 backdrop-blur border-b border-border">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {primaryTabs.map(({ key, label, icon: Icon }) => {
              const active = activeTab === key
              return (
                <button
                  key={key}
                  onClick={() => setActiveTab(key as any)}
                  className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs sm:text-sm font-medium transition-colors ${
                    active
                      ? 'bg-[#290a52] text-white border-[#290a52]'
                      : 'bg-background text-foreground border-border hover:border-[#2eb2ff] hover:text-[#2eb2ff]'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              )
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:pl-3 lg:border-l lg:border-border">
            <span className="hidden lg:inline text-[10px] uppercase tracking-[0.2em] text-muted-foreground mr-1">Tools</span>
            {toolTabs.map(({ key, label, icon: Icon }) => {
              const active = activeTab === key
              const handleClick = () => {
                if (key === 'trust') { navigate('/trust-creation'); return }
                if (key === 'succession') { navigate('/succession-planning'); return }
                setActiveTab(key as any)
              }
              return (
                <button
                  key={key}
                  onClick={handleClick}
                  className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs sm:text-sm font-medium transition-colors ${
                    active
                      ? 'bg-[#ffb500] text-[#290a52] border-[#ffb500]'
                      : 'bg-background text-foreground border-border hover:border-[#ffb500] hover:text-[#290a52]'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {activeTab === 'sops' ? (
        <SopLibraryPanel />
      ) : activeTab === 'trust' ? (
        <TrustCreation />
      ) : activeTab === 'succession' ? (
        <SuccessionPlanning />
      ) : (
        <>
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse overflow-hidden">
              <div className="h-44 bg-muted" />
              <CardContent className="p-4">
                <div className="h-4 bg-muted rounded w-2/3 mb-2" />
                <div className="h-3 bg-muted rounded w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={courses.map(c => c.id)} strategy={rectSortingStrategy}>
            {/* Trust Creation group */}
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center gap-3">
                <Shield className="h-4 w-4 text-[#290a52]" />
                <h2 className="text-xs sm:text-sm font-semibold tracking-[0.2em] uppercase text-[#290a52]">Trust Creation</h2>
                <div className="flex-1 h-px bg-border" />
                <span className="text-[10px] text-muted-foreground">{trustCourses.length} {trustCourses.length === 1 ? 'course' : 'courses'}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {trustCourses.map((course) => (
                  <SortableCourseCard
                    key={course.id}
                    course={course}
                    isAdminOrOwner={isAdminOrOwner}
                    onEdit={setEditingCourse}
                    onDelete={handleDelete}
                    onClick={(id) => navigate(`/classroom/${id}`)}
                  />
                ))}
                {isAdminOrOwner && (
                  <Card
                    className="overflow-hidden border-dashed cursor-pointer hover:border-[#2eb2ff] hover:bg-[#2eb2ff]/10 transition-colors"
                    onClick={() => setShowAddCourse(true)}
                  >
                    <CardContent className="h-full flex flex-col items-center justify-center p-8 min-h-[280px]">
                      <Plus className="h-8 w-8 text-muted-foreground mb-2" />
                      <span className="text-sm text-muted-foreground">New course</span>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>

            {/* Sleek divider */}
            {successionCourses.length > 0 && (
              <div className="mt-8 sm:mt-10 space-y-3 sm:space-y-4">
                <div className="flex items-center gap-3">
                  <Users className="h-4 w-4 text-[#ffb500]" />
                  <h2 className="text-xs sm:text-sm font-semibold tracking-[0.2em] uppercase text-[#ffb500]">The Succession Society</h2>
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-[10px] text-muted-foreground">{successionCourses.length} {successionCourses.length === 1 ? 'course' : 'courses'}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {successionCourses.map((course) => (
                    <SortableCourseCard
                      key={course.id}
                      course={course}
                      isAdminOrOwner={isAdminOrOwner}
                      onEdit={setEditingCourse}
                      onDelete={handleDelete}
                      onClick={(id) => navigate(`/classroom/${id}`)}
                    />
                  ))}
                </div>
              </div>
            )}
          </SortableContext>
        </DndContext>
      )}

      <AddCourseDialog open={showAddCourse} onOpenChange={setShowAddCourse} onCreated={fetchCourses} />
      <EditCourseDialog course={editingCourse} open={!!editingCourse} onOpenChange={(open) => { if (!open) setEditingCourse(null) }} onUpdated={fetchCourses} />
      </>
    )}
    </div>
  )
}
