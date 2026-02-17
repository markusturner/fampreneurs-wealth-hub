import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Plus, BookOpen } from 'lucide-react'

interface Course {
  id: string
  title: string
  description: string | null
  image_url: string | null
  progress: number
}

export default function Classroom() {
  const { user } = useAuth()
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCourses()
  }, [])

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('status', 'published')
        .order('created_at', { ascending: true })

      if (error) throw error

      // Get enrollments for progress
      let enrollments: any[] = []
      if (user?.id) {
        const { data: enrollData } = await supabase
          .from('course_enrollments')
          .select('course_id, progress')
          .eq('user_id', user.id)
        enrollments = enrollData || []
      }

      setCourses((data || []).map(course => {
        const enrollment = enrollments.find(e => e.course_id === course.id)
        return {
          id: course.id,
          title: course.title,
          description: course.description,
          image_url: course.image_url,
          progress: enrollment?.progress || 0,
        }
      }))
    } catch (error) {
      console.error('Error fetching courses:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Classroom</h1>
        <p className="text-muted-foreground text-sm">Access your courses and track your progress</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <Card key={course.id} className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group">
              <div className="h-44 bg-muted overflow-hidden">
                {course.image_url ? (
                  <img 
                    src={course.image_url} 
                    alt={course.title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
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
          ))}

          {/* New course card (admin only) */}
          <Card className="overflow-hidden border-dashed cursor-pointer hover:border-primary/50 transition-colors">
            <CardContent className="h-full flex flex-col items-center justify-center p-8 min-h-[280px]">
              <Plus className="h-8 w-8 text-muted-foreground mb-2" />
              <span className="text-sm text-muted-foreground">New course</span>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
