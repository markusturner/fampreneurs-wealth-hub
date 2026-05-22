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
  }, [programOnly, truheirsOnly])

  const fetchCourseCompletion = async () => {
    try {
      setLoading(true)

      // Build optional user filter for tabs
      let filterUserIds: Set<string> | null = null
      if (programOnly) {
        const { data: pp } = await supabase
          .from('profiles').select('user_id').not('program_name', 'is', null)
        filterUserIds = new Set((pp || []).map((p: any) => p.user_id))
      } else if (truheirsOnly) {
        const { data: tp } = await supabase
          .from('profiles').select('user_id').eq('truheirs_access', true)
        filterUserIds = new Set((tp || []).map((p: any) => p.user_id))
      }

      // Live data: derive progress from lesson_completions (course_videos = lessons)
      const [{ data: allCourses }, { data: videos }, { data: completions }] = await Promise.all([
        supabase.from('courses').select('id, title').order('title'),
        supabase.from('course_videos').select('id, course_id'),
        supabase.from('lesson_completions').select('user_id, lesson_id, course_id'),
      ])

      if (!allCourses) { setLoading(false); return }

      // total lessons per course
      const lessonCountByCourse = new Map<string, number>()
      ;(videos || []).forEach((v: any) => {
        lessonCountByCourse.set(v.course_id, (lessonCountByCourse.get(v.course_id) || 0) + 1)
      })

      // completions per (user,course)
      const compsByCourseUser = new Map<string, Map<string, number>>()
      ;(completions || []).forEach((c: any) => {
        if (filterUserIds && !filterUserIds.has(c.user_id)) return
        if (!compsByCourseUser.has(c.course_id)) compsByCourseUser.set(c.course_id, new Map())
        const m = compsByCourseUser.get(c.course_id)!
        m.set(c.user_id, (m.get(c.user_id) || 0) + 1)
      })

      const courseMap: CourseCompletion[] = allCourses.map((course: any) => {
        const total = lessonCountByCourse.get(course.id) || 0
        const userMap = compsByCourseUser.get(course.id) || new Map<string, number>()
        const enrolledCount = userMap.size
        let sumPct = 0, completedCount = 0
        userMap.forEach((done) => {
          const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0
          sumPct += pct
          if (total > 0 && done >= total) completedCount += 1
        })
        const avgProgress = enrolledCount > 0 ? Math.round(sumPct / enrolledCount) : 0
        return { courseId: course.id, courseTitle: course.title, enrolledCount, avgProgress, completedCount }
      })

      const activeCourses = courseMap.filter((c) => c.enrolledCount > 0)
      setCourses(activeCourses)

      const totalAvg = activeCourses.length > 0
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
              <div className="text-sm text-muted-foreground">Courses with active learners</div>
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
                  <TableHead className="w-[100px] text-center">Learners</TableHead>
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
            No lesson completions recorded yet.
          </CardContent>
        </Card>
      )}
    </div>
  )
}
