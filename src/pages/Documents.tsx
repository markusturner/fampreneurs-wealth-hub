import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { 
  BookOpen, 
  Crown, 
  Users, 
  MessageCircle, 
  Image, 
  TreePine, 
  Lock, 
  Scroll,
  Building2,
  Scale,
  Shield,
  GraduationCap,
  ArrowLeft,
  Heart,
  FileText,
  Video,
  Settings,
  Eye,
  EyeOff,
  CheckCircle,
  Key,
  Edit,
  Trash2,
  FileCheck,
  Loader2,
  UserPlus
} from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { NavHeader } from "@/components/dashboard/nav-header"
import { FamilySecretCodesAdmin } from "@/components/dashboard/family-secret-codes-admin"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/integrations/supabase/client"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import { FamilyTreeVisualization } from "@/components/family-tree/FamilyTreeVisualization"
import { FamilyTreeTextInput } from "@/components/family-tree/FamilyTreeTextInput"
import { DynamicFamilyTreeVisualization } from "@/components/family-tree/DynamicFamilyTreeVisualization"
import { FamilyDocumentsTab } from "@/components/dashboard/family-documents-tab"

const familyEducationModules = [
  {
    title: "Family Business Education",
    description: "Learn the fundamentals of running a successful family business",
    icon: Building2,
    status: "Available",
    lessons: 12,
    duration: "3 hours",
    color: "text-blue-600"
  },
  {
    title: "Family Constitution",
    description: "Understanding and implementing your family's core values and principles",
    icon: Scroll,
    status: "Available", 
    lessons: 8,
    duration: "2 hours",
    color: "text-amber-600"
  },
  {
    title: "Wealth Management",
    description: "Strategic approaches to preserving and growing family wealth",
    icon: Crown,
    status: "Available",
    lessons: 15,
    duration: "4 hours",
    color: "text-purple-600"
  },
  {
    title: "Next Generation Leadership",
    description: "Preparing future leaders for family business success",
    icon: Users,
    status: "Available",
    lessons: 10,
    duration: "3 hours",
    color: "text-green-600"
  }
]

const heritageResources = [
  {
    title: "Legal Documents",
    description: "Important family documents and legal papers",
    icon: FileText,
    category: "Documents",
    color: "text-slate-600"
  },
  {
    title: "Family Tree Interactive",
    description: "Visualize your family connections",
    icon: TreePine,
    category: "Genealogy",
    color: "text-emerald-600"
  },
  {
    title: "Family Governance",
    description: "Access governance policies, decision-making frameworks, and family charter documents",
    icon: Scale,
    category: "Governance",
    color: "text-indigo-600"
  }
]

const businessCourses = [
  {
    title: "Family Business Fundamentals",
    instructor: "Dr. Sarah Johnson",
    duration: "4 weeks",
    description: "Essential principles for successful family business management",
    status: "published",
    videos: [
      "https://youtu.be/example1",
      "https://youtu.be/example2"
    ],
    modules: [
      { name: "Introduction to Family Business", duration: "45 minutes" },
      { name: "Governance Structures", duration: "60 minutes" },
      { name: "Succession Planning", duration: "75 minutes" }
    ]
  },
  {
    title: "Wealth Preservation Strategies",
    instructor: "Michael Thompson",
    duration: "6 weeks",
    description: "Advanced strategies for multi-generational wealth management",
    status: "published",
    videos: [
      "https://youtu.be/example3",
      "https://youtu.be/example4"
    ],
    modules: [
      { name: "Asset Protection", duration: "50 minutes" },
      { name: "Tax Optimization", duration: "65 minutes" },
      { name: "Estate Planning", duration: "80 minutes" }
    ]
  },
  {
    title: "Next-Gen Leadership Development",
    instructor: "Jennifer Lee",
    duration: "8 weeks", 
    description: "Developing the next generation of family business leaders",
    status: "draft",
    videos: [
      "https://youtu.be/example5",
      "https://youtu.be/example6"
    ],
    modules: [
      { name: "Leadership Fundamentals", duration: "40 minutes" },
      { name: "Communication Skills", duration: "55 minutes" },
      { name: "Decision Making", duration: "70 minutes" }
    ]
  }
]

export default function Documents() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const [showCodeDialog, setShowCodeDialog] = useState(false)
  const [accessCode, setAccessCode] = useState('')
  const [showAdminPanel, setShowAdminPanel] = useState(false)
  const [availableCodes, setAvailableCodes] = useState<any[]>([])
  const [userAccess, setUserAccess] = useState<string[]>([])
  const [showCoursesDialog, setShowCoursesDialog] = useState(false)
  const [showFamilyTreeDialog, setShowFamilyTreeDialog] = useState(false)
  const [showConstitutionDialog, setShowConstitutionDialog] = useState(false)
  const [familyData, setFamilyData] = useState<any[]>([])
  const [familyTreeInput, setFamilyTreeInput] = useState('')
  const [selectedCourse, setSelectedCourse] = useState<any>(null)
  const [showCreateCourseDialog, setShowCreateCourseDialog] = useState(false)
  const [showEditCourseDialog, setShowEditCourseDialog] = useState(false)
  const [editingCourseIndex, setEditingCourseIndex] = useState<number | null>(null)
  const [newCourse, setNewCourse] = useState({ title: '', instructor: '', duration: '', description: '', status: 'draft' })
  const [videoUrls, setVideoUrls] = useState<string[]>([''])
  const [courseModules, setCourseModules] = useState<Array<{name: string, duration: string}>>([{name: '', duration: ''}])
  const [showMessagesDialog, setShowMessagesDialog] = useState(false)
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [showFamilyDocuments, setShowFamilyDocuments] = useState(false)
  // Family Secret Code states
  const [familyCodeInput, setFamilyCodeInput] = useState('')
  const [isValidatingCode, setIsValidatingCode] = useState(false)
  const [validatedCodeResult, setValidatedCodeResult] = useState<any>(null)
  
  // Family Code Creation states
  const [codeDescription, setCodeDescription] = useState('')
  const [codeAccessLevel, setCodeAccessLevel] = useState('')
  const [isCreatingCode, setIsCreatingCode] = useState(false)
  const [createdCode, setCreatedCode] = useState<string | null>(null)

  const isAdmin = profile?.is_admin || false

  useEffect(() => {
    if (user && isAdmin) {
      fetchAvailableCodes()
    }
  }, [user, isAdmin])

  const fetchAvailableCodes = async () => {
    try {
      const { data, error } = await supabase
        .from('family_secret_codes')
        .select('*')
        .eq('is_active', true)

      if (error) throw error
      setAvailableCodes(data || [])
    } catch (error) {
      console.error('Error fetching codes:', error)
    }
  }

  const handleHeritageResource = (resourceTitle: string) => {
    const accessLevel = userAccess.find(access => 
      (access === 'trust' && resourceTitle.includes('Legacy')) ||
      (access === 'legacy' && resourceTitle.includes('Family')) ||
      (access === 'admin')
    )

    if (resourceTitle === "Family Tree Interactive") {
      setShowFamilyTreeDialog(true)
    } else if (resourceTitle === "Family Governance") {
      navigate('/family-governance')
    } else if (resourceTitle === "Family History Archive") {
      if (accessLevel) {
        alert("🏛️ TRUST ACCESS GRANTED - Accessing Family History Archive...")
      } else {
        alert("🔒 This resource requires Trust-level access. Please enter the family trust code to continue.")
      }
    } else {
      const messages = {
        "Legal Documents": "📄 Accessing secure legal documents...",
        "Family Tree Interactive": "🌳 Opening interactive family tree..."
      }
      
      alert(messages[resourceTitle as keyof typeof messages] || "Opening resource...")
    }
  }

  const handleEnterAccessCode = async () => {
    if (!accessCode.trim()) {
      toast.error('Please enter an access code')
      return
    }

    try {
      const { data, error } = await supabase.functions.invoke('validate-family-code', {
        body: {
          code: accessCode.toUpperCase().trim(),
          ip_address: null,
          user_agent: navigator.userAgent
        }
      })

      if (error) throw error

      const result = data as any
      if (result.success) {
        toast.success(result.message)
        setUserAccess(prev => [...prev, result.access_level])
        setShowCodeDialog(false)
        setAccessCode('')
        
        // Show access granted content based on level
        switch (result.access_level) {
          case 'trust':
            alert(`🏛️ TRUST ACCESS GRANTED\n\n${result.description}\n\nYou now have access to:\n• Trust documents\n• Financial statements\n• Legal agreements\n• Investment portfolios`)
            break
          case 'legacy':
            alert(`👑 LEGACY ACCESS GRANTED\n\n${result.description}\n\nYou now have access to:\n• Family legacy meetings\n• Historical documents\n• Succession planning\n• Leadership councils`)
            break
          case 'admin':
            alert(`🔧 ADMIN ACCESS GRANTED\n\n${result.description}\n\nYou now have full administrative access to all family office resources.`)
            break
          default:
            alert(`✅ ACCESS GRANTED\n\n${result.description}`)
        }
      } else {
        toast.error(result.message || 'Invalid access code')
      }
    } catch (error) {
      console.error('Error validating code:', error)
      toast.error('Failed to validate access code')
    }
  }

  const createFamilyCode = async () => {
    if (!codeDescription.trim() || !codeAccessLevel) {
      toast.error('Please fill in all fields')
      return
    }

    setIsCreatingCode(true)
    try {
      // Generate a random code
      const randomCode = `FAM-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${new Date().getFullYear()}`
      
      // Here you would typically call an edge function to save the code to the database
      // For now, we'll just simulate the creation
      setTimeout(() => {
        setCreatedCode(randomCode)
        toast.success('Family code created successfully!')
        setCodeDescription('')
        setCodeAccessLevel('')
        setIsCreatingCode(false)
      }, 1000)
      
    } catch (error) {
      console.error('Error creating family code:', error)
      toast.error('Failed to create family code')
      setIsCreatingCode(false)
    }
  }

  const validateFamilyCode = async () => {
    if (!familyCodeInput.trim()) {
      toast.error('Please enter a family secret code')
      return
    }

    setIsValidatingCode(true)
    try {
      const { data, error } = await supabase.functions.invoke('validate-family-code', {
        body: {
          code: familyCodeInput.trim(),
          ip_address: null,
          user_agent: navigator.userAgent
        }
      })

      if (error) throw error

      const result = data as any
      if (result.success) {
        setValidatedCodeResult(result)
        setUserAccess(prev => [...prev, result.access_level])
        toast.success(`Access granted! Level: ${result.access_level}`)
        setFamilyCodeInput('')
      } else {
        toast.error(result.message || 'Invalid family secret code')
        setValidatedCodeResult(null)
      }
    } catch (error) {
      console.error('Error validating code:', error)
      toast.error('Failed to validate family secret code')
      setValidatedCodeResult(null)
    } finally {
      setIsValidatingCode(false)
    }
  }

  const generateFamilyTree = () => {
    if (!familyTreeInput.trim()) {
      toast.error('Please enter family information first')
      return
    }

    try {
      const lines = familyTreeInput.split('\n').filter(line => line.trim())
      const members: any[] = []
      
      lines.forEach((line, index) => {
        const name = line.trim()
        if (name) {
          members.push({
            id: `member-${index}`,
            name: name,
            generation: Math.floor(index / 3), // Simple generation assignment
            parents: index > 0 ? [lines[Math.max(0, index - 1)].trim()] : [],
            children: index < lines.length - 1 ? [lines[index + 1].trim()] : []
          })
        }
      })
      
      setFamilyData(members)
      toast.success('Family tree generated successfully!')
    } catch (error) {
      console.error('Error generating family tree:', error)
      toast.error('Failed to generate family tree')
    }
  }

  const addVideoUrl = () => {
    setVideoUrls([...videoUrls, ''])
  }

  const updateVideoUrl = (index: number, url: string) => {
    const updated = [...videoUrls]
    updated[index] = url
    setVideoUrls(updated)
  }

  const removeVideoUrl = (index: number) => {
    if (videoUrls.length > 1) {
      setVideoUrls(videoUrls.filter((_, i) => i !== index))
    }
  }

  const addModule = () => {
    setCourseModules([...courseModules, { name: '', duration: '' }])
  }

  const updateModule = (index: number, field: 'name' | 'duration', value: string) => {
    const updated = [...courseModules]
    updated[index][field] = value
    setCourseModules(updated)
  }

  const removeModule = (index: number) => {
    if (courseModules.length > 1) {
      setCourseModules(courseModules.filter((_, i) => i !== index))
    }
  }

  const handleCreateCourse = () => {
    if (!newCourse.title || !newCourse.instructor) {
      toast.error('Please fill in the required fields')
      return
    }

    const course = {
      ...newCourse,
      videos: videoUrls.filter(url => url.trim()),
      modules: courseModules.filter(module => module.name.trim())
    }

    businessCourses.push(course)
    
    setNewCourse({ title: '', instructor: '', duration: '', description: '', status: 'draft' })
    setVideoUrls([''])
    setCourseModules([{ name: '', duration: '' }])
    setShowCreateCourseDialog(false)
    
    toast.success('Course created successfully!')
  }

  const handleEditCourse = (index: number) => {
    const course = businessCourses[index]
    setNewCourse({
      title: course.title,
      instructor: course.instructor,
      duration: course.duration,
      description: course.description,
      status: course.status
    })
    setVideoUrls(course.videos?.length ? course.videos : [''])
    setCourseModules(course.modules?.length ? course.modules : [{ name: '', duration: '' }])
    setEditingCourseIndex(index)
    setShowEditCourseDialog(true)
  }

  const handleUpdateCourse = () => {
    if (!newCourse.title || !newCourse.instructor || editingCourseIndex === null) {
      toast.error('Please fill in the required fields')
      return
    }

    const updatedCourse = {
      ...newCourse,
      videos: videoUrls.filter(url => url.trim()),
      modules: courseModules.filter(module => module.name.trim())
    }

    businessCourses[editingCourseIndex] = updatedCourse
    
    setNewCourse({ title: '', instructor: '', duration: '', description: '', status: 'draft' })
    setVideoUrls([''])
    setCourseModules([{ name: '', duration: '' }])
    setEditingCourseIndex(null)
    setShowEditCourseDialog(false)
    
    toast.success('Course updated successfully!')
  }

  const handleDeleteCourse = (index: number) => {
    businessCourses.splice(index, 1)
    toast.success('Course deleted successfully!')
  }

  const sendMessage = async () => {
    if (!newMessage.trim()) return

    const message = {
      id: Date.now().toString(),
      content: newMessage,
      sender_id: user?.id,
      sender_name: profile?.display_name || 'You',
      created_at: new Date().toISOString()
    }

    setMessages([...messages, message])
    setNewMessage('')
    toast.success('Message sent!')
  }

  return (
    <div className="min-h-screen bg-background">
      <NavHeader />
      
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-8">

        {/* Family Office Documents Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Family Office Documents</h1>
            <p className="text-muted-foreground">Access important family documents, educational resources, and secure information</p>
          </div>
        </div>

        {/* Family Business Education Modules */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                Family Business Education
              </h2>
              <p className="text-muted-foreground text-sm">
                Comprehensive learning modules for family business management and wealth preservation
              </p>
            </div>
            
            <Button 
              variant="outline"
              onClick={() => setShowCoursesDialog(true)}
            >
              <Video className="h-4 w-4 mr-2" />
              View All Courses
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {businessCourses.filter(course => course.status === 'published').slice(0, 4).map((course, index) => (
              <Card key={index} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedCourse(course)}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <Building2 className="h-8 w-8 text-blue-600" />
                    <Badge variant="secondary">Published</Badge>
                  </div>
                  <CardTitle className="text-lg">{course.title}</CardTitle>
                  <CardDescription>{course.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Instructor: {course.instructor}</span>
                    <span>{course.duration}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
            {businessCourses.filter(course => course.status === 'published').length === 0 && (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No published courses available yet.</p>
                {isAdmin && (
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => setShowCreateCourseDialog(true)}
                  >
                    Create First Course
                  </Button>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Heritage & Legacy Resources */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
                <Heart className="h-5 w-5" />
                Heritage & Legacy Resources
              </h2>
              <p className="text-muted-foreground text-sm">
                Preserve and explore your family's rich history and heritage
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {heritageResources.map((resource) => {
              const Icon = resource.icon
              return (
                <Card 
                  key={resource.title} 
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => {
                    if (resource.title === "Legal Documents") {
                      // Show Family Documents tab with focus on Legal Documents
                      setShowFamilyDocuments(true)
                    } else {
                      handleHeritageResource(resource.title)
                    }
                  }}
                >
                  <CardHeader className="pb-3">
                    <Icon className={`h-8 w-8 ${resource.color} mx-auto`} />
                    <CardTitle className="text-center text-base">{resource.title}</CardTitle>
                    <CardDescription className="text-center text-sm">
                      {resource.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Button variant="secondary" className="w-full justify-center">
                      {resource.category}
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </section>

        {/* Family Secret Codes - Admin Only */}
        {isAdmin && (
          <section className="space-y-4">
            <FamilySecretCodesAdmin />
          </section>
        )}

        {/* Business Courses Dialog */}
        <Dialog open={showCoursesDialog} onOpenChange={setShowCoursesDialog}>
          <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Family Business Education Courses
              </DialogTitle>
              <DialogDescription>
                Comprehensive courses designed for family business success
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              {businessCourses.map((course, index) => (
                <Card key={index} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-lg">{course.title}</h3>
                          <Badge variant={course.status === 'published' ? 'default' : 'secondary'}>
                            {course.status === 'published' ? (
                              <>
                                <FileCheck className="h-3 w-3 mr-1" />
                                Published
                              </>
                            ) : (
                              <>
                                <Eye className="h-3 w-3 mr-1" />
                                Draft
                              </>
                            )}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{course.description}</p>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            {course.instructor}
                          </span>
                          <span>{course.duration}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => setSelectedCourse(course)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        {isAdmin && (
                          <>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleEditCourse(index)}
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleDeleteCourse(index)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Delete
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex justify-between">
              {isAdmin && (
                <Button 
                  variant="outline" 
                  onClick={() => setShowCreateCourseDialog(true)}
                >
                  Create New Course
                </Button>
              )}
              <Button variant="outline" onClick={() => setShowCoursesDialog(false)}>
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Course Detail Dialog */}
        {selectedCourse && (
          <Dialog open={!!selectedCourse} onOpenChange={() => setSelectedCourse(null)}>
            <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{selectedCourse.title}</DialogTitle>
                <DialogDescription>
                  Instructor: {selectedCourse.instructor} | Duration: {selectedCourse.duration}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6">
                <p>{selectedCourse.description}</p>
                
                {selectedCourse.videos && selectedCourse.videos.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-3">Course Videos</h4>
                    <div className="grid gap-4">
                      {selectedCourse.videos.map((videoUrl: string, index: number) => (
                        <div key={index} className="aspect-video bg-muted rounded-lg overflow-hidden">
                          <iframe
                            src={videoUrl.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')}
                            title={`${selectedCourse.title} - Video ${index + 1}`}
                            className="w-full h-full"
                            allowFullScreen
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {selectedCourse.modules && selectedCourse.modules.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-3">Course Modules</h4>
                    <div className="grid gap-4">
                      {selectedCourse.modules.map((module: any, index: number) => (
                        <Card key={index}>
                          <CardHeader>
                            <CardTitle className="text-base">Module {index + 1}: {module.name}</CardTitle>
                            <CardDescription>Duration: {module.duration}</CardDescription>
                          </CardHeader>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Create Course Dialog */}
        <Dialog open={showCreateCourseDialog} onOpenChange={setShowCreateCourseDialog}>
          <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Course</DialogTitle>
              <DialogDescription>
                Add a new family business education course
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="course-title">Course Title *</Label>
                  <Input
                    id="course-title"
                    value={newCourse.title}
                    onChange={(e) => setNewCourse(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter course title"
                  />
                </div>
                <div>
                  <Label htmlFor="course-instructor">Instructor *</Label>
                  <Input
                    id="course-instructor"
                    value={newCourse.instructor}
                    onChange={(e) => setNewCourse(prev => ({ ...prev, instructor: e.target.value }))}
                    placeholder="Enter instructor name"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="course-duration">Duration</Label>
                <Input
                  id="course-duration"
                  value={newCourse.duration}
                  onChange={(e) => setNewCourse(prev => ({ ...prev, duration: e.target.value }))}
                  placeholder="e.g., 4 weeks"
                />
              </div>
              
              <div>
                <Label htmlFor="course-description">Description</Label>
                <Input
                  id="course-description"
                  value={newCourse.description}
                  onChange={(e) => setNewCourse(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter course description"
                />
              </div>
              
              <div>
                <Label htmlFor="course-status">Status</Label>
                <Select value={newCourse.status} onValueChange={(value) => setNewCourse(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">
                      <div className="flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                        Draft
                      </div>
                    </SelectItem>
                    <SelectItem value="published">
                      <div className="flex items-center gap-2">
                        <FileCheck className="h-4 w-4" />
                        Published
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Video URLs</Label>
                <div className="space-y-2">
                  {videoUrls.map((url, index) => (
                    <div key={index} className="flex gap-2">
                      <div className="flex-1">
                        <Input
                          value={url}
                          onChange={(e) => updateVideoUrl(index, e.target.value)}
                          placeholder="https://youtu.be/..."
                        />
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => removeVideoUrl(index)}
                        disabled={videoUrls.length === 1}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={addVideoUrl}>
                    Add Video
                  </Button>
                </div>
              </div>
              
              <div>
                <Label>Course Modules</Label>
                <div className="space-y-3">
                  {courseModules.map((module, index) => (
                    <div key={index} className="p-3 border rounded-lg space-y-3">
                      <div className="flex justify-between items-center">
                        <Label className="text-sm font-medium">Module {index + 1}</Label>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => removeModule(index)}
                          disabled={courseModules.length === 1}
                        >
                          Remove
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          value={module.name}
                          onChange={(e) => updateModule(index, 'name', e.target.value)}
                          placeholder="Module name"
                        />
                        <Input
                          value={module.duration}
                          onChange={(e) => updateModule(index, 'duration', e.target.value)}
                          placeholder="Duration (e.g., 45 minutes)"
                        />
                      </div>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={addModule}>
                    Add Module
                  </Button>
                </div>
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setShowCreateCourseDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateCourse}>
                  Create Course
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Course Dialog */}
        <Dialog open={showEditCourseDialog} onOpenChange={setShowEditCourseDialog}>
          <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Course</DialogTitle>
              <DialogDescription>
                Update the family business education course
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-course-title">Course Title *</Label>
                  <Input
                    id="edit-course-title"
                    value={newCourse.title}
                    onChange={(e) => setNewCourse(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter course title"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-course-instructor">Instructor *</Label>
                  <Input
                    id="edit-course-instructor"
                    value={newCourse.instructor}
                    onChange={(e) => setNewCourse(prev => ({ ...prev, instructor: e.target.value }))}
                    placeholder="Enter instructor name"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="edit-course-duration">Duration</Label>
                <Input
                  id="edit-course-duration"
                  value={newCourse.duration}
                  onChange={(e) => setNewCourse(prev => ({ ...prev, duration: e.target.value }))}
                  placeholder="e.g., 4 weeks"
                />
              </div>
              
              <div>
                <Label htmlFor="edit-course-description">Description</Label>
                <Input
                  id="edit-course-description"
                  value={newCourse.description}
                  onChange={(e) => setNewCourse(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter course description"
                />
              </div>
              
              <div>
                <Label htmlFor="edit-course-status">Status</Label>
                <Select value={newCourse.status} onValueChange={(value) => setNewCourse(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">
                      <div className="flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                        Draft
                      </div>
                    </SelectItem>
                    <SelectItem value="published">
                      <div className="flex items-center gap-2">
                        <FileCheck className="h-4 w-4" />
                        Published
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Video URLs</Label>
                <div className="space-y-2">
                  {videoUrls.map((url, index) => (
                    <div key={index} className="flex gap-2">
                      <div className="flex-1">
                        <Input
                          value={url}
                          onChange={(e) => updateVideoUrl(index, e.target.value)}
                          placeholder="https://youtu.be/..."
                        />
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => removeVideoUrl(index)}
                        disabled={videoUrls.length === 1}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={addVideoUrl}>
                    Add Video
                  </Button>
                </div>
              </div>
              
              <div>
                <Label>Course Modules</Label>
                <div className="space-y-3">
                  {courseModules.map((module, index) => (
                    <div key={index} className="p-3 border rounded-lg space-y-3">
                      <div className="flex justify-between items-center">
                        <Label className="text-sm font-medium">Module {index + 1}</Label>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => removeModule(index)}
                          disabled={courseModules.length === 1}
                        >
                          Remove
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          value={module.name}
                          onChange={(e) => updateModule(index, 'name', e.target.value)}
                          placeholder="Module name"
                        />
                        <Input
                          value={module.duration}
                          onChange={(e) => updateModule(index, 'duration', e.target.value)}
                          placeholder="Duration (e.g., 45 minutes)"
                        />
                      </div>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={addModule}>
                    Add Module
                  </Button>
                </div>
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setShowEditCourseDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleUpdateCourse}>
                  Update Course
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Family Tree Dialog */}
        <Dialog open={showFamilyTreeDialog} onOpenChange={setShowFamilyTreeDialog}>
          <DialogContent className="sm:max-w-6xl max-h-[90vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <TreePine className="h-5 w-5" />
                Interactive Family Tree
              </DialogTitle>
              <DialogDescription>
                Visualize your family connections and relationships
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 h-[70vh] overflow-hidden">
              <FamilyTreeTextInput
                onGenerate={(members) => {
                  setFamilyData(members)
                  toast.success('Family tree generated successfully!')
                }}
              />
              
              <div className="h-[400px] border rounded-lg overflow-hidden">
                {familyData.length > 0 ? (
                  <DynamicFamilyTreeVisualization familyMembers={familyData} />
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <TreePine className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Enter family information above to generate your family tree</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Family Messages Dialog */}
        <Dialog open={showMessagesDialog} onOpenChange={setShowMessagesDialog}>
          <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Family Messages
              </DialogTitle>
              <DialogDescription>
                Communicate securely with family members
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex-1 space-y-4 overflow-hidden">
              <div className="flex-1 overflow-y-auto max-h-[400px] space-y-3 p-4 border rounded-lg bg-muted/20">
                {messages.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  messages.map((message) => {
                    const isOwnMessage = message.sender_id === user?.id
                    
                    return (
                      <div key={message.id} className={`flex items-start gap-3 ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold text-white ${
                          isOwnMessage ? 'bg-primary' : 'bg-blue-500'
                        }`}>
                          {message.sender_name.charAt(0).toUpperCase()}
                        </div>
                        <div className={`flex-1 max-w-[80%] ${isOwnMessage ? 'text-right' : ''}`}>
                          <div className={`p-3 rounded-lg ${
                            isOwnMessage ? 'bg-primary text-primary-foreground' : 'bg-background border'
                          }`}>
                            <p className="text-sm">{message.content}</p>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {message.sender_name} • {new Date(message.created_at).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
              
              <div className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      sendMessage()
                    }
                  }}
                  placeholder="Type your message..."
                  className="flex-1"
                />
                <Button onClick={sendMessage} disabled={!newMessage.trim()}>
                  Send
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Family Documents Dialog */}
        <Dialog open={showFamilyDocuments} onOpenChange={setShowFamilyDocuments}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-red-500" />
                Legal Documents & Family Office Files
              </DialogTitle>
              <DialogDescription>
                Upload, manage, and access your family's important legal documents
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4">
              <FamilyDocumentsTab viewOnly={true} />
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}