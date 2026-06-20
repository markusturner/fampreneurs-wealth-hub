import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { supabase } from '@/integrations/supabase/client'
import { BookOpen, Loader2, Users, CheckCircle2 } from 'lucide-react'

interface LearnerRow {
  userId: string
  name: string
  email: string
  progress: number
  completed: boolean
}

interface CourseCompletion {
  courseId: string
  courseTitle: string
  enrolledCount: number
  avgProgress: number
  completedCount: number
  learners: LearnerRow[]
}

interface AdminCourseCompletionProps {
  programOnly?: boolean
  truheirsOnly?: boolean
}

export function AdminCourseCompletion({ programOnly = false, truheirsOnly = false }: AdminCourseCompletionProps) {
  const [courses, setCourses] = useState<CourseCompletion[]>([])
  const [loading, setLoading] = useState(true)
  const [overallAvg, setOverallAvg] = useState(0)
  const [openCourse, setOpenCourse] = useState<CourseCompletion | null>(null)

  useEffect(() => {
    fetchCourseCompletion()
  }, [programOnly, truheirsOnly])

  const fetchCourseCompletion = async () => {
    try {
      setLoading(true)

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

      const [{ data: allCourses }, { data: videos }, { data: completions }, { data: profiles }] = await Promise.all([
        supabase.from('courses').select('id, title').order('title'),
        supabase.from('course_videos').select('id, course_id'),
        supabase.from('lesson_completions').select('user_id, lesson_id, course_id'),
        supabase.from('profiles').select('user_id, full_name, first_name, last_name, email'),
      ])

      if (!allCourses) { setLoading(false); return }

      const profileMap = new Map<string, { name: string; email: string }>()
      ;(profiles || []).forEach((p: any) => {
        const composed = [p.first_name, p.last_name].filter(Boolean).join(' ').trim()
        const name = (p.full_name && p.full_name.trim()) || composed || (p.email ? p.email.split('@')[0] : 'Unknown')
        profileMap.set(p.user_id, { name, email: p.email || '' })
      })

      const lessonCountByCourse = new Map<string, number>()
      ;(videos || []).forEach((v: any) => {
        lessonCountByCourse.set(v.course_id, (lessonCountByCourse.get(v.course_id) || 0) + 1)
      })

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
        const learners: LearnerRow[] = []
        userMap.forEach((done, userId) => {
          const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0
          sumPct += pct
          const completed = total > 0 && done >= total
          if (completed) completedCount += 1
          const p = profileMap.get(userId) || { name: 'Unknown', email: '' }
          learners.push({ userId, name: p.name, email: p.email, progress: pct, completed })
        })
        learners.sort((a, b) => b.progress - a.progress)
        const avgProgress = enrolledCount > 0 ? Math.round(sumPct / enrolledCount) : 0
        return { courseId: course.id, courseTitle: course.title, enrolledCount, avgProgress, completedCount, learners }
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
                      <button
                        type="button"
                        onClick={() => setOpenCourse(course)}
                        className="inline-flex items-center gap-1 font-semibold text-foreground hover:text-[#2eb2ff] hover:underline focus:outline-none transition-colors"
                        title="View learners"
                      >
                        <Users className="h-3 w-3" />
                        <span>{course.enrolledCount}</span>
                      </button>
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

      <Dialog open={!!openCourse} onOpenChange={(o) => !o && setOpenCourse(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Learners — {openCourse?.courseTitle}
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="w-[160px]">Progress</TableHead>
                  <TableHead className="w-[80px] text-center">Done</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {openCourse?.learners.map((l) => (
                  <TableRow key={l.userId}>
                    <TableCell className="font-medium">{l.name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{l.email}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={l.progress} className="h-2 flex-1" />
                        <span className="text-xs w-9 text-right">{l.progress}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {l.completed ? <CheckCircle2 className="h-4 w-4 text-green-600 inline" /> : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
