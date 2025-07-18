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
import { CallRecordingsList } from "@/components/courses/call-recordings-list"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  const [activeTab, setActiveTab] = useState('courses')
  const [recordingsCount, setRecordingsCount] = useState(0)
  const [userGroups, setUserGroups] = useState<string[]>([])

  const fetchCourses = async () => {
    try {
      // First fetch user's group memberships
      const { data: groupMemberships, error: groupError } = await supabase
        .from('group_memberships')
        .select('group_id')
        .eq('user_id', user?.id)

      if (groupError) throw groupError

      const groupIds = (groupMemberships || []).map(membership => membership.group_id)
      setUserGroups(groupIds)

      // Fetch courses associated with user's groups
      let coursesData: Course[] = []
      
      if (groupIds.length > 0) {
        const { data: groupCourses, error: groupCoursesError } = await supabase
          .from('group_courses')
          .select(`
            course_id,
            courses (*)
          `)
          .in('group_id', groupIds)

        if (groupCoursesError) throw groupCoursesError

        // Extract unique courses from group courses
        const uniqueCourseIds = new Set()
        coursesData = (groupCourses || [])
          .filter(gc => {
            if (uniqueCourseIds.has(gc.course_id)) {
              return false
            }
            uniqueCourseIds.add(gc.course_id)
            return true
          })
          .map(gc => gc.courses as Course)
          .filter(course => course !== null)
      }

      // Also fetch courses created by the user
      const { data: userCreatedCourses, error: userCoursesError } = await supabase
        .from('courses')
        .select('*')
        .eq('created_by', user?.id)
        .order('created_at', { ascending: false })

      if (userCoursesError) throw userCoursesError

      // Combine group courses with user-created courses (remove duplicates)
      const allCourses = [...coursesData]
      userCreatedCourses?.forEach(course => {
        if (!allCourses.find(c => c.id === course.id)) {
          allCourses.push(course)
        }
      })

      const { data: enrollmentsData, error: enrollmentsError } = await supabase
        .from('course_enrollments')
        .select('*')
        .eq('user_id', user?.id)

      if (enrollmentsError) throw enrollmentsError

      // Fetch recordings count
      const { data: recordingsData, error: recordingsError } = await supabase
        .from('coaching_call_recordings')
        .select('id')

      if (recordingsError) {
        console.error('Error fetching recordings count:', recordingsError)
      } else {
        setRecordingsCount(recordingsData?.length || 0)
      }

      setCourses(allCourses)
      setEnrollments(enrollmentsData || [])
    } catch (error) {
      console.error('Error fetching courses:', error)
    } finally {
      setCoursesLoading(false)
    }
  }

  useEffect(() => {
    if (user?.id) {
      fetchCourses()
    }
  }, [user?.id])

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
    <div className="min-h-screen bg-background text-foreground relative">
      {/* Background Logo with Very Low Transparency */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-5 pointer-events-none"
        style={{
          backgroundImage: `url('/lovable-uploads/600ee2e4-cb13-46ef-a548-e2a35b02d2d0.png')`,
          backgroundSize: 'contain',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center'
        }}
      />
      
      <NavHeader onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      
      <main className="relative z-10 px-4 py-6 space-y-8">
        {/* Welcome Section - Your Brand Style */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent z-10"></div>
          <div className="relative z-20 pt-20 pb-10">
            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-4">
              Family Business University
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl">
              Master the art of family business management through our comprehensive course library
            </p>
          </div>
        </div>

        {/* Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-card border-border">
            <TabsTrigger value="courses" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <BookOpen className="h-4 w-4" />
              Courses
            </TabsTrigger>
            <TabsTrigger value="recordings" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Video className="h-4 w-4" />
              Call Recordings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="courses" className="space-y-8 mt-8">
            {/* Course Grid - Your Brand Netflix Style */}
            <div>
              <h2 className="text-2xl font-bold mb-6 text-foreground">
                {selectedCategory} ({filteredCourses.length})
              </h2>
              <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
                {filteredCourses.map((course) => {
                  const progress = getUserProgress(course.id)
                  const enrolled = isUserEnrolled(course.id)
                  const isCreator = isUserCourseCreator(course)
                  
                  return (
                    <div
                      key={course.id}
                      className="group cursor-pointer transition-all duration-300 hover:scale-105"
                      onClick={() => handleOpenCourseDetail(course)}
                    >
                      <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-card border border-border">
                        <img 
                          src={course.image_url || "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&h=600&fit=crop"} 
                          alt={course.title}
                          className="w-full h-full object-cover group-hover:brightness-75 transition-all duration-300"
                        />
                        
                        {/* Your Brand overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <div className="absolute bottom-0 left-0 right-0 p-4">
                            <h3 className="font-bold text-foreground text-sm mb-1 truncate">{course.title}</h3>
                            <div className="flex items-center gap-2 mb-2">
                              <Badge 
                                className={`text-xs ${
                                  course.level === 'Beginner' ? 'bg-secondary text-secondary-foreground' : 
                                  course.level === 'Advanced' ? 'text-white' : 'bg-accent text-accent-foreground'
                                }`}
                                style={course.level === 'Advanced' ? { backgroundColor: '#ffb500' } : {}}
                              >
                                {course.level}
                              </Badge>
                              <span className="text-xs text-muted-foreground">{course.price}</span>
                            </div>
                            
                            {enrolled && progress > 0 && (
                              <div className="mb-2">
                                <div className="w-full bg-muted rounded-full h-1">
                                  <div 
                                    className="bg-primary h-1 rounded-full transition-all duration-300" 
                                    style={{ width: `${progress}%` }}
                                  ></div>
                                </div>
                                <span className="text-xs text-muted-foreground">{progress}% complete</span>
                              </div>
                            )}
                            
                            <div className="flex gap-2">
                              <Button 
                                size="sm" 
                                className="text-white hover:opacity-90 text-xs px-3 py-1"
                                style={{ backgroundColor: '#ffb500' }}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleOpenCourseDetail(course)
                                }}
                              >
                                <Play className="h-3 w-3 mr-1" />
                                {enrolled ? 'Continue' : 'Start'}
                              </Button>
                              {!enrolled && !isCreator && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="border-border text-foreground hover:bg-muted text-xs px-3 py-1"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleEnrollInCourse(course.id)
                                  }}
                                >
                                  Enroll
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Progress indicator */}
                        {enrolled && progress > 0 && (
                          <div className="absolute top-2 right-2">
                            <div className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
                              {progress}%
                            </div>
                          </div>
                        )}

                        {/* Course level indicator */}
                        <div className="absolute top-2 left-2">
                          <Badge 
                            className={`text-xs ${
                              course.level === 'Beginner' ? 'bg-secondary text-secondary-foreground' : 
                              course.level === 'Advanced' ? 'text-white' : 'bg-accent text-accent-foreground'
                            }`}
                            style={course.level === 'Advanced' ? { backgroundColor: '#ffb500' } : {}}
                          >
                            {course.level}
                          </Badge>
                        </div>
                      </div>
                      
                      {/* Title below image */}
                      <h3 className="text-foreground font-medium text-sm mt-2 truncate">{course.title}</h3>
                      <p className="text-muted-foreground text-xs truncate">{course.instructor}</p>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Learning Stats */}
            <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
              <Card className="shadow-soft text-center">
                <CardContent className="p-3 sm:p-4">
                  <div className="text-xl sm:text-2xl font-bold" style={{ color: '#ffb500' }}>{recordingsCount}</div>
                  <div className="text-xs sm:text-sm text-muted-foreground">Total Call Recordings</div>
                </CardContent>
              </Card>
              <Card className="shadow-soft text-center">
                <CardContent className="p-3 sm:p-4">
                  <div className="text-xl sm:text-2xl font-bold text-accent">
                    {enrollments.filter(e => e.completed_at).length}
                  </div>
                  <div className="text-xs sm:text-sm text-muted-foreground">Completed Courses</div>
                </CardContent>
              </Card>
              <Card className="shadow-soft text-center">
                <CardContent className="p-3 sm:p-4">
                  <div className="text-xl sm:text-2xl font-bold text-secondary">{courses.length}</div>
                  <div className="text-xs sm:text-sm text-muted-foreground">Total Courses</div>
                </CardContent>
              </Card>
              <Card className="shadow-soft text-center">
                <CardContent className="p-3 sm:p-4">
                  <div className="text-xl sm:text-2xl font-bold" style={{ color: '#ffb500' }}>
                    {enrollments.length > 0 ? Math.round(enrollments.reduce((acc, e) => acc + e.progress, 0) / enrollments.length) : 0}%
                  </div>
                  <div className="text-xs sm:text-sm text-muted-foreground">Average Progress</div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="recordings" className="mt-6">
            <div>
              <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">
                Coaching Call Recordings
              </h2>
              <CallRecordingsList />
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Create Course Dialog */}
      <CreateCourseDialog
        open={createCourseOpen}
        onOpenChange={setCreateCourseOpen}
        onCourseCreated={fetchCourses}
      />

      {/* Course Detail Dialog - Your Brand Netflix Style */}
      {selectedCourse && (
        <Dialog open={courseDetailOpen} onOpenChange={setCourseDetailOpen}>
          <DialogContent className="w-[95vw] max-w-[1200px] max-h-[90vh] overflow-hidden bg-card border-border p-0">
            <div className="relative">
              {/* Header with background image */}
              <div className="relative h-64 md:h-80">
                <img 
                  src={selectedCourse.image_url || "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1200&h=400&fit=crop"} 
                  alt={selectedCourse.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
                
                {/* Course info overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">{selectedCourse.title}</h1>
                  <div className="flex items-center gap-4 mb-4">
                    <span className="text-foreground">2024</span>
                    <Badge className={`${
                      selectedCourse.level === 'Beginner' ? 'bg-secondary text-secondary-foreground' : 
                      selectedCourse.level === 'Advanced' ? 'text-white' : 'bg-accent text-accent-foreground'
                    }`}
                    style={selectedCourse.level === 'Advanced' ? { backgroundColor: '#ffb500' } : {}}
                    >
                      {selectedCourse.level}
                    </Badge>
                    {selectedCourse.duration && (
                      <span className="text-foreground flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {selectedCourse.duration}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4 mb-4">
                    <Button 
                      size="lg" 
                      className="text-white hover:opacity-90 font-semibold"
                      style={{ backgroundColor: '#ffb500' }}
                      onClick={() => {
                        setCourseDetailOpen(false)
                        // Auto-scroll to videos when opened
                      }}
                    >
                      <Play className="h-5 w-5 mr-2" />
                      {isUserEnrolled(selectedCourse.id) ? 'Continue Watching' : 'Start Course'}
                    </Button>
                    
                    {!isUserEnrolled(selectedCourse.id) && !isUserCourseCreator(selectedCourse) && (
                      <Button
                        variant="outline"
                        size="lg"
                        className="border-border text-foreground hover:bg-muted"
                        onClick={() => handleEnrollInCourse(selectedCourse.id)}
                      >
                        Enroll Now
                      </Button>
                    )}
                  </div>
                  
                  {selectedCourse.description && (
                    <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed">{selectedCourse.description}</p>
                  )}
                  
                  <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
                    <span>Instructor: <span className="text-foreground">{selectedCourse.instructor}</span></span>
                    <span>Price: <span className="text-foreground">{selectedCourse.price}</span></span>
                  </div>
                </div>
              </div>
              
              {/* Course content */}
              <div className="bg-background">
                <CourseVideoList courseId={selectedCourse.id} isCreator={isUserCourseCreator(selectedCourse)} />
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

    </div>
  )
}

export default Courses