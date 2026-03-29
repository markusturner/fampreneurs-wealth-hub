import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { supabase } from '@/integrations/supabase/client'
import { BookOpen, Loader2, Users } from 'lucide-react'

interface CourseCompletion {
  courseId: string
  courseTitle: string
  enrolledCount: number
  avgProgress: number
  completedCount: number
}

interface AdminCourseCompletionProps {
  programOnly?: boolean
  truheirsOnly?: boolean
}

export function AdminCourseCompletion({ programOnly = false, truheirsOnly = false }: AdminCourseCompletionProps) {
  const [courses, setCourses] = useState<CourseCompletion[]>([])
  const [loading, setLoading] = useState(true)
  const [overallAvg, setOverallAvg] = useState(0)

  useEffect(() => {
    fetchCourseCompletion()
  }, [programOnly])

  const fetchCourseCompletion = async () => {
    try {
      setLoading(true)

      // If programOnly, get program user IDs first
      let programUserIds: Set<string> | null = null
      if (programOnly) {
        const { data: programProfiles } = await supabase
          .from('profiles')
          .select('user_id')
          .not('program_name', 'is', null)
        programUserIds = new Set(programProfiles?.map(p => p.user_id) || [])
      }

      const [{ data: allCourses }, { data: enrollments }] = await Promise.all([
        supabase.from('courses').select('id, title').order('title'),
        supabase.from('course_enrollments').select('course_id, progress, completed_at, user_id'),
      ])

      if (!allCourses) return

      const courseMap: CourseCompletion[] = allCourses.map((course) => {
        let courseEnrollments = enrollments?.filter((e) => e.course_id === course.id) || []
        if (programUserIds) {
          courseEnrollments = courseEnrollments.filter((e) => e.user_id && programUserIds.has(e.user_id))
        }
        const enrolledCount = courseEnrollments.length
        const avgProgress =
          enrolledCount > 0
            ? courseEnrollments.reduce((sum, e) => sum + (e.progress || 0), 0) / enrolledCount
            : 0
        const completedCount = courseEnrollments.filter((e) => e.completed_at !== null).length

        return {
          courseId: course.id,
          courseTitle: course.title,
          enrolledCount,
          avgProgress: Math.round(avgProgress),
          completedCount,
        }
      })

      // Only show courses that have at least 1 enrollment
      const activeCourses = courseMap.filter((c) => c.enrolledCount > 0)
      setCourses(activeCourses)

      const totalAvg =
        activeCourses.length > 0
          ? activeCourses.reduce((sum, c) => sum + c.avgProgress, 0) / activeCourses.length
          : 0
      setOverallAvg(Math.round(totalAvg))
    } catch (error) {
      console.error('Error fetching course completion:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Course Completion</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-card/50 backdrop-blur">
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <div className="text-4xl md:text-5xl font-bold">{overallAvg}%</div>
              <div className="text-sm text-muted-foreground">Overall avg completion</div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur">
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <div className="text-4xl md:text-5xl font-bold">{courses.length}</div>
              <div className="text-sm text-muted-foreground">Courses with enrollments</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {courses.length > 0 ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Avg Completion per Course
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course</TableHead>
                  <TableHead className="w-[100px] text-center">Enrolled</TableHead>
                  <TableHead className="w-[100px] text-center">Completed</TableHead>
                  <TableHead className="w-[200px]">Avg Progress</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {courses.map((course) => (
                  <TableRow key={course.courseId}>
                    <TableCell className="font-medium">{course.courseTitle}</TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <Users className="h-3 w-3" />
                        {course.enrolledCount}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">{course.completedCount}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={course.avgProgress} className="h-2 flex-1" />
                        <span className="text-sm font-medium w-10 text-right">
                          {course.avgProgress}%
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No course enrollments found yet.
          </CardContent>
        </Card>
      )}
    </div>
  )
}
