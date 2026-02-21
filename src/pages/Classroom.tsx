import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Plus, BookOpen, Pencil, Trash2, GripVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { AddCourseDialog } from '@/components/classroom/AddCourseDialog'
import { EditCourseDialog } from '@/components/classroom/EditCourseDialog'
import { useIsAdminOrOwner } from '@/hooks/useIsAdminOrOwner'
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
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddCourse, setShowAddCourse] = useState(false)
  const [editingCourse, setEditingCourse] = useState<Course | null>(null)
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
        const { data: groupData } = await supabase
          .from('community_groups')
          .select('id')
          .eq('name', profile.program_name)
        userCommunityIds = (groupData || []).map((g: any) => g.id)
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

  return (
    <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-6xl space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">Classroom</h1>
        <p className="text-muted-foreground text-xs sm:text-sm">Access your courses and track your progress</p>
      </div>

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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {courses.map((course) => (
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
                  className="overflow-hidden border-dashed cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => setShowAddCourse(true)}
                >
                  <CardContent className="h-full flex flex-col items-center justify-center p-8 min-h-[280px]">
                    <Plus className="h-8 w-8 text-muted-foreground mb-2" />
                    <span className="text-sm text-muted-foreground">New course</span>
                  </CardContent>
                </Card>
              )}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <AddCourseDialog open={showAddCourse} onOpenChange={setShowAddCourse} onCreated={fetchCourses} />
      <EditCourseDialog course={editingCourse} open={!!editingCourse} onOpenChange={(open) => { if (!open) setEditingCourse(null) }} onUpdated={fetchCourses} />
    </div>
  )
}
