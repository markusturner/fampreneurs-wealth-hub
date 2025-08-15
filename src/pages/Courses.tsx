import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { NavHeader } from '@/components/dashboard/nav-header'
import { useToast } from '@/hooks/use-toast'
import { 
  BookOpen, 
  Play, 
  Clock, 
  Users, 
  Award,
  Upload,
  Download,
  FileText,
  Building,
  Shield,
  Landmark,
  Hash,
  Video,
  Heart,
  Scroll,
  MapPin,
  Phone
} from 'lucide-react'

interface Course {
  id: string
  title: string
  description: string | null
  duration: string | null
  instructor: string | null
  level: string | null
  category: string | null
  created_at: string
  updated_at: string
  created_by: string
  image_url: string | null
  price: string | null
  status: string | null
}

interface CourseEnrollment {
  id: string
  course_id: string
  progress: number
  completed_at: string | null
  enrolled_at: string
  user_id: string
  courses: Course
}

const documentCategories = [
  {
    title: "Trust Documents",
    icon: Landmark,
    documents: [
      { name: "Family Trust Document", icon: FileText, type: "file" },
      { name: "Business Trust Document", icon: Building, type: "file" },
      { name: "Tax-Exempt Trust Document", icon: Shield, type: "file" },
      { name: "Power of Attorney Document", icon: FileText, type: "file" }
    ]
  },
  {
    title: "Certificates & Legal",
    icon: Shield,
    documents: [
      { name: "Trademark Certificate", icon: Award, type: "file" },
      { name: "Family Constitution", icon: Scroll, type: "file" },
      { name: "Family Crest", icon: Award, type: "file" }
    ]
  },
  {
    title: "EIN Numbers",
    icon: Hash,
    documents: [
      { name: "Family Trust EIN Number", icon: Hash, type: "text" },
      { name: "Business Trust EIN Number", icon: Hash, type: "text" },
      { name: "Tax-Exempt EIN Number", icon: Hash, type: "text" }
    ]
  },
  {
    title: "Addresses",
    icon: MapPin,
    documents: [
      { name: "Family Trust Address", icon: MapPin, type: "text" },
      { name: "Business Trust Address", icon: MapPin, type: "text" },
      { name: "Tax-Exempt Address", icon: MapPin, type: "text" }
    ]
  },
  {
    title: "Phone Numbers",
    icon: Phone,
    documents: [
      { name: "Family Trust Phone Number", icon: Phone, type: "text" },
      { name: "Business Trust Phone Number", icon: Phone, type: "text" },
      { name: "Tax-Exempt Phone Number", icon: Phone, type: "text" }
    ]
  },
  {
    title: "Legacy Documents",
    icon: Heart,
    documents: [
      { name: "Legacy Video", icon: Video, type: "file" },
      { name: "The Life-Legacy Letter", icon: Heart, type: "file" },
      { name: "Sorry I Died On You Letter", icon: Heart, type: "file" }
    ]
  }
]

export default function Courses() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [enrollments, setEnrollments] = useState<CourseEnrollment[]>([])
  const [availableCourses, setAvailableCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadingDocument, setUploadingDocument] = useState<string | null>(null)

  useEffect(() => {
    fetchCourses()
    fetchEnrollments()
  }, [])

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setAvailableCourses(data || [])
    } catch (error) {
      console.error('Error fetching courses:', error)
    }
  }

  const fetchEnrollments = async () => {
    if (!user?.id) {
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('course_enrollments')
        .select(`
          *,
          courses (*)
        `)
        .eq('user_id', user.id)
        .order('enrolled_at', { ascending: false })

      if (error) throw error
      setEnrollments(data || [])
    } catch (error) {
      console.error('Error fetching enrollments:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpload = (documentName: string) => {
    setUploadingDocument(documentName)
    // TODO: Implement actual upload logic
    setTimeout(() => {
      setUploadingDocument(null)
      toast({
        title: "Document Uploaded",
        description: `${documentName} has been uploaded successfully.`
      })
    }, 2000)
  }

  const handleDownload = (documentName: string) => {
    // TODO: Implement actual download logic
    toast({
      title: "Download Started",
      description: `Downloading ${documentName}...`
    })
  }

  const formatDuration = (duration: string | null) => {
    if (!duration) return 'Duration not specified'
    return duration
  }

  const getDifficultyColor = (level: string | null) => {
    switch (level?.toLowerCase()) {
      case 'beginner': return 'bg-green-100 text-green-800'
      case 'intermediate': return 'bg-yellow-100 text-yellow-800'
      case 'advanced': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <NavHeader />
      
      <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6 max-w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Courses & Documents</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Access your learning materials and manage family documents
            </p>
          </div>
        </div>

        <Tabs defaultValue="courses" className="space-y-4 sm:space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="courses">Courses</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
          </TabsList>

          <TabsContent value="courses" className="space-y-6">
            {/* Course Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    Total Courses
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{availableCourses.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Play className="h-4 w-4" />
                    Enrolled
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{enrollments.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Award className="h-4 w-4" />
                    Completed
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {enrollments.filter(e => e.completed_at).length}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* My Courses */}
            {enrollments.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Play className="h-5 w-5" />
                    My Courses
                  </CardTitle>
                  <CardDescription>
                    Courses you're currently enrolled in
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {enrollments.map((enrollment) => (
                      <div
                        key={enrollment.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex-1">
                          <h3 className="font-medium">{enrollment.courses.title}</h3>
                          <p className="text-sm text-muted-foreground mb-2">
                            {enrollment.courses.description}
                          </p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDuration(enrollment.courses.duration)}
                            </span>
                            {enrollment.courses.instructor && (
                              <span className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {enrollment.courses.instructor}
                              </span>
                            )}
                            {enrollment.courses.level && (
                              <Badge
                                className={getDifficultyColor(enrollment.courses.level)}
                              >
                                {enrollment.courses.level}
                              </Badge>
                            )}
                          </div>
                          <div className="mt-2">
                            <div className="flex items-center justify-between text-sm mb-1">
                              <span>Progress</span>
                              <span>{enrollment.progress}%</span>
                            </div>
                            <Progress value={enrollment.progress} className="h-2" />
                          </div>
                        </div>
                        <Button className="ml-4">
                          Continue
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Available Courses */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Available Courses
                </CardTitle>
                <CardDescription>
                  Explore all courses available to you
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="animate-pulse p-4 border rounded-lg">
                        <div className="h-4 bg-muted rounded w-1/3 mb-2"></div>
                        <div className="h-3 bg-muted rounded w-2/3"></div>
                      </div>
                    ))}
                  </div>
                ) : availableCourses.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No courses available</p>
                    <p className="text-sm">Check back later for new courses</p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {availableCourses.map((course) => (
                      <div
                        key={course.id}
                        className="p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                      >
                        <h3 className="font-medium mb-2">{course.title}</h3>
                        <p className="text-sm text-muted-foreground mb-3">
                          {course.description}
                        </p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {formatDuration(course.duration)}
                          </div>
                          <Button size="sm">
                            Enroll
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents" className="space-y-6">
            <div className="grid gap-4 sm:gap-6">
              {documentCategories.map((category) => {
                const CategoryIcon = category.icon
                
                return (
                  <Card key={category.title} className="shadow-soft">
                    <CardHeader className="pb-3 sm:pb-6">
                      <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
                        <CategoryIcon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                        <span>{category.title}</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="grid gap-2 sm:gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {category.documents.map((document) => {
                          const DocumentIcon = document.icon
                          const isUploading = uploadingDocument === document.name
                          
                          return (
                            <div
                              key={document.name}
                              className="flex items-center justify-between p-2 sm:p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                            >
                              <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                                <DocumentIcon className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                                <span className="text-xs sm:text-sm font-medium truncate">
                                  {document.name}
                                </span>
                              </div>
                              
                              <div className="flex items-center space-x-1 sm:space-x-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleUpload(document.name)}
                                  disabled={isUploading}
                                  className="h-7 px-2 sm:h-8 sm:px-3"
                                  title="Upload"
                                >
                                  {isUploading ? (
                                    <div className="h-2 w-2 sm:h-3 sm:w-3 animate-spin rounded-full border border-current border-t-transparent" />
                                  ) : (
                                    <Upload className="h-2 w-2 sm:h-3 sm:w-3" />
                                  )}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDownload(document.name)}
                                  className="h-7 px-2 sm:h-8 sm:px-3"
                                  title="Download"
                                >
                                  <Download className="h-2 w-2 sm:h-3 sm:w-3" />
                                </Button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Mobile Bottom Navigation */}
      <div className="pb-16 md:pb-0" />
    </div>
  )
}