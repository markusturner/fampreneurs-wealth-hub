import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
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
  Key
} from "lucide-react"
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

const familyEducationModules = [
  {
    title: "Family Business Education",
    description: "Learn the fundamentals of running a successful family business",
    icon: Building2,
    status: "Available",
    lessons: 12,
    duration: "3 hours"
  },
  {
    title: "Family Constitution",
    description: "Understanding and implementing your family's core values and principles",
    icon: Scroll,
    status: "Available",
    lessons: 8,
    duration: "2 hours"
  },
  {
    title: "Family Governance Structure",
    description: "The three branches of family government and their roles",
    icon: Scale,
    status: "Available",
    lessons: 15,
    duration: "4 hours"
  }
]

const initialBusinessCourses = [
  {
    id: 1,
    title: "Financial Management",
    description: "Learn budgeting, cash flow, and financial planning for families",
    lessons: 8,
    duration: "2.5 hours",
    level: "Beginner"
  },
  {
    id: 2,
    title: "Relationship Building",
    description: "Strengthen family bonds and communication skills",
    lessons: 6,
    duration: "2 hours",
    level: "All Levels"
  },
  {
    id: 3,
    title: "Investment Fundamentals",
    description: "Basic principles of wealth building and investment strategies",
    lessons: 10,
    duration: "3 hours",
    level: "Intermediate"
  },
  {
    id: 4,
    title: "Estate Planning",
    description: "Protecting and transferring family wealth across generations",
    lessons: 12,
    duration: "4 hours",
    level: "Advanced"
  },
  {
    id: 5,
    title: "Family Communication",
    description: "Effective communication strategies for family meetings",
    lessons: 5,
    duration: "1.5 hours",
    level: "All Levels"
  },
  {
    id: 6,
    title: "Conflict Resolution",
    description: "Managing disagreements and finding common ground",
    lessons: 7,
    duration: "2.5 hours",
    level: "Intermediate"
  }
]

const governanceBranches = [
  {
    title: "The Family Council",
    description: "Executive branch responsible for day-to-day family business decisions",
    icon: Crown,
    members: "5 Active Members",
    role: "Decision Making & Strategy"
  },
  {
    title: "Council of Elders",
    description: "Advisory branch providing wisdom and guidance based on experience",
    icon: Users,
    members: "3 Elder Members",
    role: "Guidance & Mentorship"
  },
  {
    title: "Family Assembly",
    description: "Legislative branch representing all family members' voices",
    icon: Scale,
    members: "All Family Members",
    role: "Voting & Policy Making"
  }
]

const heritageResources = [
  {
    title: "Family Crest & Seal",
    description: "Explore the history and meaning behind your family symbols",
    icon: Crown,
    type: "Interactive Gallery"
  },
  {
    title: "Family Portrait Gallery",
    description: "View the commissioned family portrait painting",
    icon: Image,
    type: "Digital Gallery"
  },
  {
    title: "Family Tree Explorer",
    description: "Interactive genealogy and family lineage",
    icon: TreePine,
    type: "Interactive Map"
  },
  {
    title: "Family Identity Manual",
    description: "Comprehensive guide to family values, mission, and vision",
    icon: FileText,
    type: "Digital Handbook"
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
  const [businessCourses, setBusinessCourses] = useState(initialBusinessCourses)
  const [editingCourse, setEditingCourse] = useState<any>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [videoUrls, setVideoUrls] = useState<string[]>([''])
  const [courseModules, setCourseModules] = useState<any[]>([{ name: '', description: '', videos: [] }])
  const [showCoursePlayer, setShowCoursePlayer] = useState(false)
  const [selectedCourse, setSelectedCourse] = useState<any>(null)
  const [showMessagingCenter, setShowMessagingCenter] = useState(false)
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loadingMessages, setLoadingMessages] = useState(false)

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

  const handleStartLearning = (moduleTitle: string) => {
    if (moduleTitle === 'Family Business Education') {
      setShowCoursesDialog(true)
    } else if (moduleTitle === 'Family Constitution') {
      // Open the Family Constitution document
      handleOpenFamilyConstitution()
    } else if (moduleTitle === 'Family Governance Structure') {
      // Navigate to the family governance page
      navigate('/family-governance')
    } else {
      // Navigate to courses page with the specific module
      navigate('/courses', { state: { searchTerm: moduleTitle } })
    }
  }

  const handleOpenFamilyConstitution = () => {
    setShowConstitutionDialog(true)
  }

  const handleAccessChat = () => {
    setShowMessagingCenter(true)
    fetchMessages()
  }

  // Add messaging functions
  const fetchMessages = async () => {
    if (!user) return
    
    setLoadingMessages(true)
    try {
      const { data, error } = await supabase
        .from('family_messages')
        .select('*')
        .order('created_at', { ascending: true })
      
      if (error) throw error
      setMessages(data || [])
    } catch (error) {
      console.error('Error fetching messages:', error)
      toast.error('Failed to load messages')
    } finally {
      setLoadingMessages(false)
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !user) return
    
    try {
      const { error } = await supabase
        .from('family_messages')
        .insert({
          sender_id: user.id,
          content: newMessage.trim()
        })
      
      if (error) throw error
      
      setNewMessage('')
      // Refresh messages to show the new one
      fetchMessages()
    } catch (error) {
      console.error('Error sending message:', error)
      toast.error('Failed to send message')
    }
  }

  // Set up real-time subscription for messages
  useEffect(() => {
    if (!showMessagingCenter || !user) return

    const channel = supabase
      .channel('family-messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'family_messages'
        },
        () => {
          // Refresh messages when changes occur
          fetchMessages()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [showMessagingCenter, user])

  const handleHeritageResource = (resourceTitle: string) => {
    if (resourceTitle === "Family Tree Explorer") {
      setShowFamilyTreeDialog(true)
    } else {
      // For other resources, show a toast message
      const messages = {
        "Family Crest & Seal": "Opening interactive family crest gallery...",
        "Family Portrait Gallery": "Viewing commissioned family portraits...",
        "Family Identity Manual": "Opening family values handbook..."
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
            alert(`🔐 ADMINISTRATIVE ACCESS GRANTED\n\n${result.description}\n\nYou now have full administrative privileges.`)
            break
          default:
            alert(`✅ ACCESS GRANTED\n\n${result.description}`)
        }
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      console.error('Error validating code:', error)
      toast.error('Failed to validate access code')
    }
  }

  const handleEditCourse = (course: any) => {
    setEditingCourse({ ...course, videos: course.videos || [], modules: course.modules || [] })
    setVideoUrls(course.videos?.length > 0 ? course.videos : [''])
    setCourseModules(course.modules?.length > 0 ? course.modules : [{ name: '', description: '', videos: [] }])
    setShowEditDialog(true)
  }

  const handleDeleteCourse = (courseId: number) => {
    if (confirm('Are you sure you want to delete this course? This action cannot be undone.')) {
      setBusinessCourses(prev => prev.filter(course => course.id !== courseId))
      toast.success('Course deleted successfully')
    }
  }

  const handleSaveCourse = (updatedCourse: any) => {
    const courseWithVideosAndModules = {
      ...updatedCourse,
      videos: videoUrls.filter(url => url.trim() !== ''),
      modules: courseModules.filter(module => module.name.trim() !== '')
    }
    setBusinessCourses(prev => 
      prev.map(course => course.id === updatedCourse.id ? courseWithVideosAndModules : course)
    )
    setShowEditDialog(false)
    setEditingCourse(null)
    setVideoUrls([''])
    setCourseModules([{ name: '', description: '', videos: [] }])
    toast.success('Course updated successfully')
  }

  const handleVideoUrlChange = (index: number, value: string) => {
    setVideoUrls(prev => {
      const updated = [...prev]
      updated[index] = value
      return updated
    })
  }

  const addVideoUrl = () => {
    setVideoUrls(prev => [...prev, ''])
  }

  const removeVideoUrl = (index: number) => {
    setVideoUrls(prev => prev.filter((_, i) => i !== index))
  }

  const validateVideoUrl = (url: string) => {
    const youtubePat = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)/
    const vimeoPat = /^(https?:\/\/)?(www\.)?vimeo\.com/
    const loomPat = /^(https?:\/\/)?(www\.)?loom\.com/
    
    return youtubePat.test(url) || vimeoPat.test(url) || loomPat.test(url)
  }

  const handleModuleChange = (index: number, field: string, value: string) => {
    setCourseModules(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  const addModule = () => {
    setCourseModules(prev => [...prev, { name: '', description: '', videos: [] }])
  }

  const removeModule = (index: number) => {
    setCourseModules(prev => prev.filter((_, i) => i !== index))
  }

  return (
    <div className="min-h-screen bg-background">
      <NavHeader />
      
      <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">The Family Roundtable</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Family education, governance, and heritage management center
          </p>
        </div>

        {/* Communication Hub */}
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Family Communication Hub
            </h2>
            <p className="text-muted-foreground text-sm">
              Stay connected with family members through our secure communication platform
            </p>
          </div>
          
          <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900/30">
                    <MessageCircle className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Family Group Chat</h3>
                    <p className="text-sm text-muted-foreground">
                      Secure messaging platform for all family members
                    </p>
                  </div>
                </div>
                <Button onClick={handleAccessChat}>
                  Access Chat
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Family Education Modules */}
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              Family Education Center
            </h2>
            <p className="text-muted-foreground text-sm">
              Comprehensive courses designed to educate family members about business, governance, and values
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {familyEducationModules.map((module) => {
              const Icon = module.icon
              return (
                <Card key={module.title} className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <Icon className="h-8 w-8 text-blue-600" />
                      <Badge variant="secondary">{module.status}</Badge>
                    </div>
                    <CardTitle className="text-base">{module.title}</CardTitle>
                    <CardDescription className="text-sm">
                      {module.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{module.lessons} lessons</span>
                      <span>{module.duration}</span>
                    </div>
                    <Button 
                      className={`w-full mt-3 ${
                        module.title === 'Family Business Education' 
                          ? 'business-course-btn bg-blue-600 hover:bg-blue-700 text-white' 
                          : module.title === 'Family Constitution'
                          ? 'constitution-btn bg-emerald-600 hover:bg-emerald-700 text-white'
                          : 'governance-btn bg-purple-600 hover:bg-purple-700 text-white'
                      }`}
                      size="sm"
                      onClick={() => handleStartLearning(module.title)}
                    >
                      <module.icon className="h-4 w-4 mr-2" />
                      {module.title === 'Family Business Education' 
                        ? 'Start Business Course' 
                        : module.title === 'Family Constitution'
                        ? 'Learn Our Values'
                        : 'Study Governance'
                      }
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </section>



        {/* Heritage & Identity */}
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
              <Heart className="h-5 w-5" />
              Family Heritage & Identity
            </h2>
            <p className="text-muted-foreground text-sm">
              Explore your family's rich history, traditions, and cultural identity
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {heritageResources.map((resource) => {
              const Icon = resource.icon
              return (
                <Card 
                  key={resource.title} 
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleHeritageResource(resource.title)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                        <Icon className="h-6 w-6 text-orange-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold mb-1">{resource.title}</h3>
                        <p className="text-sm text-muted-foreground mb-2">
                          {resource.description}
                        </p>
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-xs">
                            {resource.type}
                          </Badge>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              if (resource.title === "Family Crest & Coat of Arms") {
                                window.open('/family-office#documents', '_blank')
                              } else {
                                setShowFamilyTreeDialog(true)
                              }
                            }}
                          >
                            View
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </section>

        {/* Family Secret Codes */}
        {/* Family Secret Codes - Admin Only */}
        {isAdmin && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  Family Secret Codes Management
                </h2>
                <p className="text-muted-foreground text-sm">
                  Create and manage family access codes for secure authentication
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => setShowAdminPanel(!showAdminPanel)}
              >
                <Settings className="h-4 w-4 mr-2" />
                {showAdminPanel ? 'Hide Admin' : 'Admin Panel'}
              </Button>
            </div>

            {showAdminPanel ? (
              <FamilySecretCodesAdmin />
            ) : (
              <>
                {/* Active Codes Display for Admins */}
                {availableCodes.length > 0 && (
                  <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Eye className="h-5 w-5" />
                        Active Family Codes ({availableCodes.length})
                      </CardTitle>
                      <CardDescription>
                        Family secret codes for member authentication
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-3">
                        {availableCodes.map((code) => (
                          <div key={code.id} className="flex items-center justify-between p-3 bg-background rounded-lg border">
                            <div>
                              <div className="font-mono text-sm font-semibold">{code.code}</div>
                              <div className="text-xs text-muted-foreground">{code.description}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={
                                code.access_level === 'admin' ? 'destructive' :
                                code.access_level === 'legacy' ? 'default' :
                              code.access_level === 'trust' ? 'secondary' : 'outline'
                            }>
                              {code.access_level}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {code.current_uses} uses
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Public Access Interface */}
              <Card className="border-2 border-dashed border-muted-foreground/30">
                <CardContent className="p-8 text-center">
                  <div className="mx-auto w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
                    <Lock className="h-6 w-6 text-red-600" />
                  </div>
                  <h3 className="font-semibold mb-2">Secure Access Required</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Enter your family access code to unlock sensitive resources
                  </p>
                  
                  {/* Show user's current access levels */}
                  {userAccess.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm font-medium mb-2">Current Access:</p>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {userAccess.map((access, index) => (
                          <Badge key={index} variant="secondary">
                            {access.charAt(0).toUpperCase() + access.slice(1)} Access
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <Dialog open={showCodeDialog} onOpenChange={setShowCodeDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline">
                        Enter Access Code
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Family Access Code</DialogTitle>
                        <DialogDescription>
                          Enter your secret family code to access restricted resources
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="access-code">Access Code</Label>
                          <Input
                            id="access-code"
                            type="text"
                            value={accessCode}
                            onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                            placeholder="XXXX-XXXX-XXXX"
                            className="font-mono text-center tracking-wider"
                            onKeyDown={(e) => e.key === 'Enter' && handleEnterAccessCode()}
                          />
                        </div>
                        <div className="flex gap-2 pt-2">
                          <Button onClick={handleEnterAccessCode} className="flex-1">
                            Validate Code
                          </Button>
                          <Button variant="outline" onClick={() => {
                            setShowCodeDialog(false)
                            setAccessCode('')
                          }}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <div className="mt-6 text-xs text-muted-foreground">
                    💡 Family codes provide access to different levels of information:
                    <br />
                    <strong>Trust</strong> - Financial documents & investments
                    <br />
                    <strong>Legacy</strong> - Family meetings & succession planning
                    <br />
                    <strong>Admin</strong> - Full administrative access
                  </div>
                </CardContent>
              </Card>
            </>
            )}
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
                Choose from our comprehensive business education curriculum
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {businessCourses.map((course, index) => (
                <Card key={index} className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-1">{course.title}</h3>
                        <p className="text-sm text-muted-foreground mb-2">
                          {course.description}
                        </p>
                      </div>
                      <Badge variant={
                        course.level === 'Beginner' ? 'secondary' :
                        course.level === 'Intermediate' ? 'default' :
                        course.level === 'Advanced' ? 'destructive' : 'outline'
                      }>
                        {course.level}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <span>{course.lessons} lessons</span>
                        <span>{course.duration}</span>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditCourse(course)}
                        >
                          Edit
                        </Button>
                        <Button 
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteCourse(course.id)}
                        >
                          Delete
                        </Button>
                        <Button 
                          size="sm"
                          onClick={() => {
                            setSelectedCourse(course)
                            setShowCoursePlayer(true)
                            setShowCoursesDialog(false)
                          }}
                        >
                          Start Course
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        {/* Family Tree Dialog */}
        <Dialog open={showFamilyTreeDialog} onOpenChange={setShowFamilyTreeDialog}>
          <DialogContent className="sm:max-w-7xl h-[95vh] overflow-hidden flex flex-col">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle className="flex items-center gap-2">
                <TreePine className="h-5 w-5" />
                Family Tree Builder
              </DialogTitle>
              <DialogDescription>
                Describe your family in text and see it visualized in real-time
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
              <div className="flex flex-col h-full">
                <div className="flex-1 overflow-y-auto pr-2">
                  <FamilyTreeTextInput onGenerate={setFamilyData} />
                </div>
              </div>
              <div className="relative border rounded-lg overflow-hidden h-full min-h-[560px]">
                <DynamicFamilyTreeVisualization familyMembers={familyData} />
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Course Player Dialog */}
        <Dialog open={showCoursePlayer} onOpenChange={setShowCoursePlayer}>
          <DialogContent className="sm:max-w-6xl h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle className="flex items-center gap-2">
                <Video className="h-5 w-5" />
                {selectedCourse?.title}
              </DialogTitle>
              <DialogDescription>
                {selectedCourse?.description}
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto space-y-6">
              {/* Course Videos */}
              {selectedCourse?.videos && selectedCourse.videos.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Video className="h-5 w-5" />
                    Course Videos
                  </h3>
                  <div className="grid gap-4">
                    {selectedCourse.videos.map((videoUrl: string, index: number) => (
                      <div key={index} className="aspect-video bg-muted rounded-lg overflow-hidden">
                        <iframe
                          src={videoUrl.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')}
                          className="w-full h-full"
                          allowFullScreen
                          title={`Course video ${index + 1}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Course Modules */}
              {selectedCourse?.modules && selectedCourse.modules.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    Course Modules
                  </h3>
                  <div className="grid gap-4">
                    {selectedCourse.modules.map((module: any, index: number) => (
                      <Card key={index}>
                        <CardHeader>
                          <CardTitle className="text-base">Module {index + 1}: {module.name}</CardTitle>
                          <CardDescription>{module.description}</CardDescription>
                        </CardHeader>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty State */}
              {(!selectedCourse?.videos || selectedCourse.videos.length === 0) && 
               (!selectedCourse?.modules || selectedCourse.modules.length === 0) && (
                <div className="text-center py-12">
                  <Video className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Content Available</h3>
                  <p className="text-muted-foreground">
                    This course doesn't have any videos or modules yet. Use the edit button to add content.
                  </p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Course Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Course</DialogTitle>
              <DialogDescription>
                Update the course information
              </DialogDescription>
            </DialogHeader>
            {editingCourse && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="course-title">Course Title</Label>
                  <Input
                    id="course-title"
                    value={editingCourse.title}
                    onChange={(e) => setEditingCourse(prev => ({ ...prev, title: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="course-description">Description</Label>
                  <Input
                    id="course-description"
                    value={editingCourse.description}
                    onChange={(e) => setEditingCourse(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="course-lessons">Lessons</Label>
                    <Input
                      id="course-lessons"
                      type="number"
                      value={editingCourse.lessons}
                      onChange={(e) => setEditingCourse(prev => ({ ...prev, lessons: parseInt(e.target.value) }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="course-duration">Duration</Label>
                    <Input
                      id="course-duration"
                      value={editingCourse.duration}
                      onChange={(e) => setEditingCourse(prev => ({ ...prev, duration: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="course-level">Level</Label>
                  <select
                    id="course-level"
                    value={editingCourse.level}
                    onChange={(e) => setEditingCourse(prev => ({ ...prev, level: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-md bg-background"
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                    <option value="All Levels">All Levels</option>
                  </select>
                </div>
                
                {/* Video Upload Section */}
                <div className="space-y-4 border-t pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Video className="h-4 w-4" />
                    <Label className="text-sm font-medium">Course Videos</Label>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    Add videos from YouTube, Loom, or Vimeo by pasting their URLs below
                  </p>
                  
                  {videoUrls.map((url, index) => (
                    <div key={index} className="flex gap-2">
                      <div className="flex-1">
                        <Input
                          placeholder="https://youtube.com/watch?v=... or https://loom.com/share/... or https://vimeo.com/..."
                          value={url}
                          onChange={(e) => handleVideoUrlChange(index, e.target.value)}
                          className={url && !validateVideoUrl(url) ? 'border-red-500' : ''}
                        />
                        {url && !validateVideoUrl(url) && (
                          <p className="text-xs text-red-500 mt-1">
                            Please enter a valid YouTube, Loom, or Vimeo URL
                          </p>
                        )}
                      </div>
                      {videoUrls.length > 1 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeVideoUrl(index)}
                          className="px-2"
                        >
                          ×
                        </Button>
                      )}
                    </div>
                  ))}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addVideoUrl}
                    className="w-full"
                  >
                    + Add Another Video URL
                  </Button>
                  
                  {videoUrls.some(url => url && validateVideoUrl(url)) && (
                    <div className="text-xs text-green-600 flex items-center gap-1">
                      ✓ {videoUrls.filter(url => url && validateVideoUrl(url)).length} valid video URL(s) added
                    </div>
                  )}
                </div>

                {/* Course Modules Section */}
                <div className="space-y-4 border-t pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <BookOpen className="h-4 w-4" />
                    <Label className="text-sm font-medium">Course Modules</Label>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    Organize your course content into modules for better structure
                  </p>
                  
                  {courseModules.map((module, index) => (
                    <div key={index} className="p-3 border rounded-lg space-y-3">
                      <div className="flex justify-between items-center">
                        <Label className="text-sm font-medium">Module {index + 1}</Label>
                        {courseModules.length > 1 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeModule(index)}
                            className="px-2 h-8"
                          >
                            ×
                          </Button>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <Input
                          placeholder="Module name (e.g., Introduction to Family Finance)"
                          value={module.name}
                          onChange={(e) => handleModuleChange(index, 'name', e.target.value)}
                        />
                        <Input
                          placeholder="Module description"
                          value={module.description}
                          onChange={(e) => handleModuleChange(index, 'description', e.target.value)}
                        />
                      </div>
                    </div>
                  ))}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addModule}
                    className="w-full"
                  >
                    + Add New Module
                  </Button>
                  
                  {courseModules.some(module => module.name.trim() !== '') && (
                    <div className="text-xs text-green-600 flex items-center gap-1">
                      ✓ {courseModules.filter(module => module.name.trim() !== '').length} module(s) configured
                    </div>
                  )}
                </div>
                
                <div className="flex gap-2 pt-4">
                  <Button onClick={() => handleSaveCourse(editingCourse)} className="flex-1">
                    Save Changes
                  </Button>
                  <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Family Constitution Dialog */}
        <Dialog open={showConstitutionDialog} onOpenChange={setShowConstitutionDialog}>
          <DialogContent className="sm:max-w-4xl h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle className="flex items-center gap-2">
                <Scroll className="h-5 w-5" />
                Family Constitution
              </DialogTitle>
              <DialogDescription>
                Our family's core values, principles, and guiding document
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto space-y-6 p-6">
              <div className="prose prose-slate max-w-none">
                <h2>Preamble</h2>
                <p>
                  We, the members of this family, recognize that our greatest asset is not our financial wealth, 
                  but our relationships with each other and our shared commitment to our values. This Constitution 
                  serves as our guiding document, establishing the principles by which we conduct our family affairs 
                  and make decisions that affect our collective future.
                </p>

                <h2>Article I: Mission Statement</h2>
                <p>
                  Our family's mission is to preserve and grow our legacy through multiple generations while 
                  maintaining strong family bonds, fostering individual growth, and contributing positively 
                  to our community and society at large.
                </p>

                <h2>Article II: Core Values</h2>
                <ul>
                  <li><strong>Integrity:</strong> We conduct ourselves with honesty and moral uprightness in all dealings</li>
                  <li><strong>Respect:</strong> We treat each family member with dignity and value diverse perspectives</li>
                  <li><strong>Stewardship:</strong> We responsibly manage our resources for current and future generations</li>
                  <li><strong>Excellence:</strong> We strive for the highest standards in our personal and professional endeavors</li>
                  <li><strong>Compassion:</strong> We support each other and extend kindness to our community</li>
                  <li><strong>Learning:</strong> We commit to continuous education and personal development</li>
                </ul>

                <h2>Article III: Family Governance</h2>
                <p>
                  Our family shall be governed by a three-branch system consisting of:
                </p>
                <ul>
                  <li><strong>The Family Council:</strong> Executive decision-making body</li>
                  <li><strong>Council of Elders:</strong> Advisory body providing wisdom and guidance</li>
                  <li><strong>Family Assembly:</strong> Legislative body representing all family members</li>
                </ul>

                <h2>Article IV: Communication Principles</h2>
                <ul>
                  <li>Open and honest communication is encouraged and valued</li>
                  <li>Disagreements will be addressed respectfully and constructively</li>
                  <li>All family members have the right to be heard</li>
                  <li>Confidential family matters remain within the family</li>
                </ul>

                <h2>Article V: Financial Stewardship</h2>
                <p>
                  We commit to responsible financial management, including:
                </p>
                <ul>
                  <li>Transparent reporting of family assets and investments</li>
                  <li>Prudent investment strategies aligned with our values</li>
                  <li>Support for family members' education and development</li>
                  <li>Charitable giving to causes that reflect our values</li>
                </ul>

                <h2>Article VI: Next Generation Development</h2>
                <p>
                  We are committed to preparing the next generation through:
                </p>
                <ul>
                  <li>Educational opportunities and mentorship</li>
                  <li>Gradual assumption of family responsibilities</li>
                  <li>Exposure to family business operations</li>
                  <li>Character development and values training</li>
                </ul>

                <h2>Article VII: Amendment Process</h2>
                <p>
                  This Constitution may be amended by a two-thirds majority vote of the Family Assembly, 
                  with proposed amendments circulated at least 30 days prior to voting.
                </p>

                <h2>Article VIII: Commitment</h2>
                <p>
                  By participating in our family governance structure, we each commit to upholding 
                  these principles and working together to build a lasting legacy that honors our 
                  ancestors and serves future generations.
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Messaging Center Dialog */}
        <Dialog open={showMessagingCenter} onOpenChange={setShowMessagingCenter}>
          <DialogContent className="sm:max-w-4xl h-[80vh] flex flex-col">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Family Messaging Center
              </DialogTitle>
              <DialogDescription>
                Secure communication platform for family members
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 flex flex-col min-h-0">
              {/* Message Area */}
              <div className="flex-1 overflow-y-auto border rounded-lg p-4 bg-muted/20 mb-4 space-y-4">
                {loadingMessages ? (
                  <div className="text-center text-sm text-muted-foreground py-4">
                    Loading messages...
                  </div>
                ) : messages.length > 0 ? (
                  messages.map((message) => {
                    const senderName = message.profiles?.display_name || 
                                     `${message.profiles?.first_name || ''} ${message.profiles?.last_name || ''}`.trim() ||
                                     'Unknown User'
                    const isOwnMessage = message.sender_id === user?.id
                    const initials = senderName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
                    
                    return (
                      <div key={message.id} className={`flex items-start gap-3 ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold text-white ${
                          isOwnMessage ? 'bg-primary' : 'bg-blue-500'
                        }`}>
                          {message.profiles?.avatar_url ? (
                            <img 
                              src={message.profiles.avatar_url} 
                              alt={senderName} 
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            initials
                          )}
                        </div>
                        <div className={`flex-1 ${isOwnMessage ? 'text-right' : ''}`}>
                          <div className={`flex items-center gap-2 mb-1 ${isOwnMessage ? 'justify-end' : ''}`}>
                            <span className="font-semibold text-sm">{isOwnMessage ? 'You' : senderName}</span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(message.created_at).toLocaleTimeString([], { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </span>
                          </div>
                          <p className={`text-sm rounded-lg p-3 shadow-sm max-w-xs ${
                            isOwnMessage 
                              ? 'bg-primary text-primary-foreground ml-auto' 
                              : 'bg-white dark:bg-slate-800'
                          }`}>
                            {message.content}
                          </p>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="text-center text-sm text-muted-foreground py-4">
                    <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    No messages yet. Start a conversation with your family members!
                  </div>
                )}
              </div>
              
              {/* Message Input */}
              <div className="flex gap-2">
                <Input
                  placeholder="Type your message..."
                  className="flex-1"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      sendMessage()
                    }
                  }}
                />
                <Button onClick={sendMessage} disabled={!newMessage.trim()}>
                  Send
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}