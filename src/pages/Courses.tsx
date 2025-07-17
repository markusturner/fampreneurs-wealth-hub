import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { NavHeader } from "@/components/dashboard/nav-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { CreateCourseDialog } from "@/components/courses/create-course-dialog"
import { AddVideoDialog } from "@/components/courses/add-video-dialog"
import { CourseVideoList } from "@/components/courses/course-video-list"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Loader2, BookOpen, Play, CheckCircle, Clock, Users, Star, Plus, Video } from 'lucide-react'

interface Course {
  id: string
  title: string
  description: string | null
  instructor: string | null
  duration: string | null
  level: string
  price: string
  image_url: string | null
  category: string | null
  created_by: string
  created_at: string
}

interface Enrollment {
  id: string
  course_id: string
  progress: number
  enrolled_at: string
  completed_at: string | null
}

const Courses = () => {
  const { user, profile, loading } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [courses, setCourses] = useState<Course[]>([])
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [selectedCategory, setSelectedCategory] = useState('All Courses')
  const [coursesLoading, setCoursesLoading] = useState(true)
  const [createCourseOpen, setCreateCourseOpen] = useState(false)
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [courseDetailOpen, setCourseDetailOpen] = useState(false)
  const [addVideoOpen, setAddVideoOpen] = useState(false)

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading courses...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const displayName = profile?.display_name || profile?.first_name || 'Member'

  const fetchCourses = async () => {
    try {
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select('*')
        .order('created_at', { ascending: false })

      if (coursesError) throw coursesError

      const { data: enrollmentsData, error: enrollmentsError } = await supabase
        .from('course_enrollments')
        .select('*')
        .eq('user_id', user?.id)

      if (enrollmentsError) throw enrollmentsError

      setCourses(coursesData || [])
      setEnrollments(enrollmentsData || [])
    } catch (error) {
      console.error('Error fetching courses:', error)
    } finally {
      setCoursesLoading(false)
    }
  }

  useEffect(() => {
    fetchCourses()
  }, [user?.id])

  const categories = [
    "All Courses",
    "Wealth Management", 
    "Investment",
    "Estate Planning",
    "Tax Strategy",
    "Business Growth",
    "Family Governance"
  ]

  const filteredCourses = selectedCategory === 'All Courses' 
    ? courses 
    : courses.filter(course => course.category === selectedCategory)

  const getUserProgress = (courseId: string) => {
    const enrollment = enrollments.find(e => e.course_id === courseId)
    return enrollment?.progress || 0
  }

  const isUserEnrolled = (courseId: string) => {
    return enrollments.some(e => e.course_id === courseId)
  }

  const isUserCourseCreator = (course: Course) => {
    return course.created_by === user?.id
  }

  const handleEnrollInCourse = async (courseId: string) => {
    try {
      const { error } = await supabase
        .from('course_enrollments')
        .insert({
          course_id: courseId,
          user_id: user?.id,
          progress: 0
        })

      if (error) throw error
      fetchCourses()
    } catch (error) {
      console.error('Error enrolling in course:', error)
    }
  }

  const handleOpenCourseDetail = (course: Course) => {
    setSelectedCourse(course)
    setCourseDetailOpen(true)
  }

  const handleAddVideo = (course: Course) => {
    setSelectedCourse(course)
    setAddVideoOpen(true)
  }

  if (coursesLoading) {
    return (
      <div className="min-h-screen bg-background">
        <NavHeader onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6 max-w-6xl">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded"></div>
            <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-96 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <NavHeader onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      
      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6 max-w-6xl">
        {/* Welcome Section */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              Family Wealth Courses
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              Enhance your financial knowledge with expert-led courses
            </p>
          </div>
          <Button onClick={() => setCreateCourseOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Create Course</span>
            <span className="sm:hidden">Create</span>
          </Button>
        </div>

        {/* Course Categories */}
        <Card className="shadow-soft">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-lg font-bold">Course Categories</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={category === selectedCategory ? "default" : "outline"}
                  size="sm"
                  className="text-xs sm:text-sm"
                  onClick={() => setSelectedCategory(category)}
                >
                  {category}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Course Grid */}
        <div>
          <h2 className="text-xl font-semibold mb-4">
            {selectedCategory} ({filteredCourses.length})
          </h2>
          <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {filteredCourses.map((course) => {
              const progress = getUserProgress(course.id)
              const enrolled = isUserEnrolled(course.id)
              const isCreator = isUserCourseCreator(course)
              
              return (
                <Card key={course.id} className="shadow-soft hover:shadow-medium transition-smooth overflow-hidden">
                  <div className="aspect-video overflow-hidden">
                    <img 
                      src={course.image_url || "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&h=200&fit=crop"} 
                      alt={course.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <CardHeader className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <Badge variant={course.level === 'Beginner' ? 'secondary' : course.level === 'Advanced' ? 'destructive' : 'default'} className="text-xs">
                        {course.level}
                      </Badge>
                      <span className="text-sm font-semibold text-primary">{course.price}</span>
                    </div>
                    <CardTitle className="text-base leading-tight">{course.title}</CardTitle>
                    <CardDescription className="text-sm line-clamp-2">
                      {course.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3">
                    <div className="text-sm text-muted-foreground">
                      <p className="font-medium">{course.instructor}</p>
                      {course.duration && (
                        <p className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {course.duration}
                        </p>
                      )}
                    </div>

                    {enrolled && progress > 0 && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span>Progress</span>
                          <span>{progress}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button 
                        className="flex-1 gap-2" 
                        size="sm"
                        onClick={() => handleOpenCourseDetail(course)}
                      >
                        {enrolled && progress === 0 ? (
                          <>
                            <Play className="h-4 w-4" />
                            Start Course
                          </>
                        ) : enrolled && progress === 100 ? (
                          <>
                            <CheckCircle className="h-4 w-4" />
                            Completed
                          </>
                        ) : enrolled ? (
                          <>
                            <Play className="h-4 w-4" />
                            Continue
                          </>
                        ) : (
                          <>
                            <BookOpen className="h-4 w-4" />
                            View Course
                          </>
                        )}
                      </Button>
                      
                      {isCreator && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddVideo(course)}
                          className="gap-1"
                        >
                          <Video className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    {!enrolled && !isCreator && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => handleEnrollInCourse(course.id)}
                      >
                        Enroll Now
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>

        {/* Learning Stats */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <Card className="shadow-soft text-center">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-primary">{enrollments.length}</div>
              <div className="text-sm text-muted-foreground">Enrolled Courses</div>
            </CardContent>
          </Card>
          <Card className="shadow-soft text-center">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-accent">
                {enrollments.filter(e => e.completed_at).length}
              </div>
              <div className="text-sm text-muted-foreground">Completed</div>
            </CardContent>
          </Card>
          <Card className="shadow-soft text-center">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-secondary">{courses.length}</div>
              <div className="text-sm text-muted-foreground">Total Courses</div>
            </CardContent>
          </Card>
          <Card className="shadow-soft text-center">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-muted-foreground">
                {enrollments.length > 0 ? Math.round(enrollments.reduce((acc, e) => acc + e.progress, 0) / enrollments.length) : 0}%
              </div>
              <div className="text-sm text-muted-foreground">Avg Progress</div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Create Course Dialog */}
      <CreateCourseDialog
        open={createCourseOpen}
        onOpenChange={setCreateCourseOpen}
        onCourseCreated={fetchCourses}
      />

      {/* Course Detail Dialog */}
      {selectedCourse && (
        <Dialog open={courseDetailOpen} onOpenChange={setCourseDetailOpen}>
          <DialogContent className="sm:max-w-[900px] mx-4 max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedCourse.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>Instructor: {selectedCourse.instructor}</span>
                {selectedCourse.duration && <span>Duration: {selectedCourse.duration}</span>}
                <Badge variant="outline">{selectedCourse.level}</Badge>
              </div>
              {selectedCourse.description && (
                <p className="text-muted-foreground">{selectedCourse.description}</p>
              )}
              <CourseVideoList courseId={selectedCourse.id} />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Add Video Dialog */}
      {selectedCourse && (
        <AddVideoDialog
          open={addVideoOpen}
          onOpenChange={setAddVideoOpen}
          courseId={selectedCourse.id}
          onVideoAdded={() => {
            // Refresh course videos if needed
            setAddVideoOpen(false)
          }}
        />
      )}
    </div>
  )
}

export default Courses