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
      
      <main className="relative z-10">
        {/* Mobile Netflix-like Layout */}
        <div className="block lg:hidden">
          {/* Header Section - Netflix Style */}
          <div className="px-4 pt-4 pb-6">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold text-foreground">
                For {displayName}
              </h1>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" className="p-2">
                  <Play className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" className="p-2">
                  <Users className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Category Pills - Netflix Style */}
            <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-hide">
              {[
                "Courses",
                "Weekly Meetings",
                "Categories ⌄"
              ].map((item, index) => (
                <Button
                  key={item}
                  variant={index === (activeTab === 'courses' ? 0 : 1) ? "default" : "outline"}
                  size="sm"
                  className={`flex-shrink-0 rounded-full px-4 py-2 text-sm ${
                    index === (activeTab === 'courses' ? 0 : 1)
                      ? 'bg-white text-black' 
                      : 'bg-black/80 text-white border-white/20'
                  }`}
                  onClick={() => {
                    if (index === 0) setActiveTab('courses')
                    if (index === 1) setActiveTab('recordings')
                    if (index === 2) {
                      // Toggle category dropdown or show categories
                    }
                  }}
                >
                  {item}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Desktop Layout - Original */}
        <div className="hidden lg:block">
          <div className="px-4 sm:px-6 lg:px-8 pt-4 pb-6">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">
                For {displayName}
              </h1>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" className="p-2">
                  <Play className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" className="p-2">
                  <Users className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Navigation Pills - Desktop */}
            <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-hide">
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  size="sm"
                  className={`flex-shrink-0 rounded-full px-4 py-2 text-xs sm:text-sm ${
                    selectedCategory === category 
                      ? 'bg-foreground text-background' 
                      : 'bg-background/20 text-foreground border-foreground/20'
                  }`}
                  onClick={() => setSelectedCategory(category)}
                >
                  {category}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Content Tabs - Desktop Only */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="hidden lg:flex mx-4 sm:mx-6 lg:mx-8 bg-card/50 border-border/20 backdrop-blur-sm">
            <TabsTrigger 
              value="courses" 
              className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs sm:text-sm"
            >
              <BookOpen className="h-3 w-3 sm:h-4 sm:w-4" />
              Courses
            </TabsTrigger>
            <TabsTrigger 
              value="recordings" 
              className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs sm:text-sm"
            >
              <Video className="h-3 w-3 sm:h-4 sm:w-4" />
              Weekly Meetings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="courses" className="mt-6">
            {/* Featured Course - Netflix Style Hero */}
            {filteredCourses.length > 0 && (
              <div className="relative mb-8 mx-4 sm:mx-6 lg:mx-8">
                <div 
                  className="relative aspect-[16/9] sm:aspect-[21/9] lg:aspect-[2.4/1] rounded-lg overflow-hidden bg-gradient-to-r from-primary/20 to-accent/20"
                  style={{
                    backgroundImage: `url(${filteredCourses[0].image_url || "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&h=400&fit=crop"})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 lg:p-8">
                    <div className="max-w-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge 
                          className="text-xs font-medium"
                          style={{ backgroundColor: '#ffb500', color: '#290a52' }}
                        >
                          FEATURED
                        </Badge>
                        <Badge 
                          className="text-xs"
                          style={filteredCourses[0].level === 'Advanced' ? { backgroundColor: '#ffb500', color: '#290a52' } : {}}
                        >
                          {filteredCourses[0].level}
                        </Badge>
                      </div>
                      <h2 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold text-foreground mb-2">
                        {filteredCourses[0].title}
                      </h2>
                      <p className="text-xs sm:text-sm lg:text-base text-muted-foreground mb-4 line-clamp-2">
                        {filteredCourses[0].description || "Master essential business skills with this comprehensive course."}
                      </p>
                      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                        <Button 
                          size="sm"
                          className="hover:opacity-90 font-semibold text-xs sm:text-sm px-4 py-2 sm:px-6 sm:py-3"
                          style={{ backgroundColor: '#ffb500', color: '#290a52' }}
                          onClick={() => handleOpenCourseDetail(filteredCourses[0])}
                        >
                          <Play className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                          {isUserEnrolled(filteredCourses[0].id) ? 'Continue' : 'Start Course'}
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="bg-background/20 border-foreground/20 text-foreground hover:bg-background/40 text-xs sm:text-sm px-4 py-2 sm:px-6 sm:py-3"
                          onClick={() => handleOpenCourseDetail(filteredCourses[0])}
                        >
                          <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                          My List
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Course Rows - Netflix Style */}
            <div className="space-y-8">
              {/* Continue Watching */}
              {enrollments.length > 0 && (
                <div className="px-4 sm:px-6 lg:px-8">
                  <h3 className="text-lg sm:text-xl font-bold mb-4 text-foreground">Continue Learning</h3>
                  <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
                    {enrollments.slice(0, 6).map((enrollment) => {
                      const course = courses.find(c => c.id === enrollment.course_id)
                      if (!course) return null
                      
                      return (
                        <div
                          key={course.id}
                          className="flex-shrink-0 w-32 sm:w-40 lg:w-48 cursor-pointer group"
                          onClick={() => handleOpenCourseDetail(course)}
                        >
                          <div className="relative aspect-[2/3] rounded-lg overflow-hidden mb-2">
                            <img 
                              src={course.image_url || "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=300&h=450&fit=crop"} 
                              alt={course.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-background/20">
                              <div 
                                className="h-full bg-primary transition-all duration-300" 
                                style={{ width: `${enrollment.progress}%` }}
                              />
                            </div>
                            <div className="absolute top-2 right-2">
                              <Badge variant="secondary" className="text-xs bg-background/80">
                                {enrollment.progress}%
                              </Badge>
                            </div>
                          </div>
                          <h4 className="text-xs sm:text-sm font-medium text-foreground line-clamp-2">{course.title}</h4>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* All Courses */}
              <div className="px-4 sm:px-6 lg:px-8">
                <h3 className="text-lg sm:text-xl font-bold mb-4 text-foreground">
                  {selectedCategory} ({filteredCourses.length})
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3 sm:gap-4">
                  {filteredCourses.map((course) => {
                    const progress = getUserProgress(course.id)
                    const enrolled = isUserEnrolled(course.id)
                    const isCreator = isUserCourseCreator(course)
                    
                    return (
                      <div
                        key={course.id}
                        className="cursor-pointer group"
                        onClick={() => handleOpenCourseDetail(course)}
                      >
                        <div className="relative aspect-[2/3] rounded-lg overflow-hidden mb-2">
                          <img 
                            src={course.image_url || "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=300&h=450&fit=crop"} 
                            alt={course.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          
                          {/* Course level indicator */}
                          <div className="absolute top-2 left-2">
                            <Badge 
                              className="text-xs"
                              style={course.level === 'Advanced' ? { backgroundColor: '#ffb500', color: '#290a52' } : {}}
                            >
                              {course.level}
                            </Badge>
                          </div>

                          {/* Progress indicator */}
                          {enrolled && progress > 0 && (
                            <>
                              <div className="absolute bottom-0 left-0 right-0 h-1 bg-background/20">
                                <div 
                                  className="h-full bg-primary transition-all duration-300" 
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                              <div className="absolute top-2 right-2">
                                <Badge variant="secondary" className="text-xs bg-background/80">
                                  {progress}%
                                </Badge>
                              </div>
                            </>
                          )}

                          {/* Hover overlay */}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <Button 
                              size="sm" 
                              className="hover:opacity-90"
                              style={{ backgroundColor: '#ffb500', color: '#290a52' }}
                            >
                              <Play className="h-3 w-3 mr-1" />
                              {enrolled ? 'Continue' : 'Start'}
                            </Button>
                          </div>
                        </div>
                        
                        <h4 className="text-xs sm:text-sm font-medium text-foreground line-clamp-2 mb-1">{course.title}</h4>
                        <p className="text-xs text-muted-foreground line-clamp-1">{course.instructor}</p>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Learning Stats - Mobile Optimized */}
              <div className="px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  <Card className="shadow-soft text-center bg-card/50 backdrop-blur-sm">
                    <CardContent className="p-3 sm:p-4">
                      <div className="text-lg sm:text-xl lg:text-2xl font-bold" style={{ color: '#ffb500' }}>
                        {recordingsCount}
                      </div>
                      <div className="text-xs sm:text-sm text-muted-foreground">Weekly Meetings</div>
                    </CardContent>
                  </Card>
                  <Card className="shadow-soft text-center bg-card/50 backdrop-blur-sm">
                    <CardContent className="p-3 sm:p-4">
                      <div className="text-lg sm:text-xl lg:text-2xl font-bold text-accent">
                        {enrollments.filter(e => e.completed_at).length}
                      </div>
                      <div className="text-xs sm:text-sm text-muted-foreground">Completed</div>
                    </CardContent>
                  </Card>
                  <Card className="shadow-soft text-center bg-card/50 backdrop-blur-sm">
                    <CardContent className="p-3 sm:p-4">
                      <div className="text-lg sm:text-xl lg:text-2xl font-bold text-secondary">
                        {courses.length}
                      </div>
                      <div className="text-xs sm:text-sm text-muted-foreground">Total Courses</div>
                    </CardContent>
                  </Card>
                  <Card className="shadow-soft text-center bg-card/50 backdrop-blur-sm">
                    <CardContent className="p-3 sm:p-4">
                      <div className="text-lg sm:text-xl lg:text-2xl font-bold" style={{ color: '#ffb500' }}>
                        {enrollments.length > 0 ? Math.round(enrollments.reduce((acc, e) => acc + e.progress, 0) / enrollments.length) : 0}%
                      </div>
                      <div className="text-xs sm:text-sm text-muted-foreground">Avg Progress</div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="recordings" className="mt-6 px-4 sm:px-6 lg:px-8">
            <CallRecordingsList />
          </TabsContent>
        </Tabs>
      </main>

      {/* Course Detail Dialog */}
      <Dialog open={courseDetailOpen} onOpenChange={setCourseDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-background border-border">
          <DialogHeader>
            <DialogTitle className="sr-only">Course Details</DialogTitle>
          </DialogHeader>
          {selectedCourse && (
            <div className="space-y-6">
              {/* Course Hero */}
              <div 
                className="relative aspect-video rounded-lg overflow-hidden bg-gradient-to-r from-primary/20 to-accent/20"
                style={{
                  backgroundImage: `url(${selectedCourse.image_url || "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&h=400&fit=crop"})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">{selectedCourse.title}</h1>
                  <div className="flex items-center gap-4 mb-4">
                    <span className="text-foreground">2024</span>
                    <Badge 
                      className="text-xs"
                      style={selectedCourse.level === 'Advanced' ? { backgroundColor: '#ffb500', color: '#290a52' } : {}}
                    >
                      {selectedCourse.level}
                    </Badge>
                    <span className="text-foreground">{selectedCourse.duration || "Self-paced"}</span>
                    <span className="text-foreground">{selectedCourse.price}</span>
                  </div>
                  
                  <div className="flex items-center gap-4 mb-4">
                    <Button 
                      size="lg" 
                      className="hover:opacity-90 font-semibold"
                      style={{ backgroundColor: '#ffb500', color: '#290a52' }}
                      onClick={() => {
                        setCourseDetailOpen(false)
                        // Auto-scroll to videos when opened
                        setTimeout(() => {
                          document.querySelector('.course-videos')?.scrollIntoView({ 
                            behavior: 'smooth' 
                          })
                        }, 100)
                      }}
                    >
                      <Play className="h-5 w-5 mr-2" />
                      {isUserEnrolled(selectedCourse.id) ? 'Continue Course' : 'Start Course'}
                    </Button>
                    <Button variant="outline" size="lg" className="bg-background/20 border-foreground/20 text-foreground">
                      <Plus className="h-5 w-5 mr-2" />
                      My List
                    </Button>
                  </div>
                  
                  <p className="text-muted-foreground max-w-2xl leading-relaxed">
                    {selectedCourse.description || "Comprehensive course designed to enhance your business knowledge and skills."}
                  </p>
                </div>
              </div>

              {/* Course Videos */}
              <div className="course-videos">
                <CourseVideoList 
                  courseId={selectedCourse.id} 
                  isCreator={isUserCourseCreator(selectedCourse)}
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Course Dialog */}
      <CreateCourseDialog 
        open={createCourseOpen} 
        onOpenChange={setCreateCourseOpen}
        onCourseCreated={fetchCourses}
      />

      {/* Add Video Dialog */}
      <AddVideoDialog
        open={addVideoOpen}
        onOpenChange={setAddVideoOpen}
        courseId={selectedCourse?.id || ''}
        onVideoAdded={fetchCourses}
      />
    </div>
  )
}

export default Courses