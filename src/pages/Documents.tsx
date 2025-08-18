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
  Unlock,
  DollarSign,
  Calendar,
  UserCheck,
  Briefcase,
  Clock,
  MapPin,
  Phone,
  Activity
} from "lucide-react"
import { NavHeader } from "@/components/dashboard/nav-header"
import { FamilySecretCodesAdmin } from "@/components/dashboard/family-secret-codes-admin"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/integrations/supabase/client"
import { useState, useEffect } from "react"
import { toast } from "sonner"

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
    title: "Family Governance Framework",
    description: "The three branches of family government and their roles",
    icon: Scale,
    status: "Available",
    lessons: 15,
    duration: "4 hours"
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

  const isAdmin = profile?.is_admin || false

  useEffect(() => {
    if (user && isAdmin) {
      fetchAvailableCodes()
    }
    // Load saved access from localStorage
    const savedAccess = localStorage.getItem(`family_access_${user?.id}`)
    if (savedAccess) {
      setUserAccess(JSON.parse(savedAccess))
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
    // Navigate to courses page with the specific module
    navigate('/courses', { state: { searchTerm: moduleTitle } })
  }

  const handleAccessChat = () => {
    // Navigate to community page for family communication
    navigate('/community')
  }

  const handleHeritageResource = (resourceTitle: string) => {
    // For now, show a toast message - you can implement specific pages later
    const messages = {
      "Family Crest & Seal": "Opening interactive family crest gallery...",
      "Family Portrait Gallery": "Viewing commissioned family portraits...",
      "Family Tree Explorer": "Loading interactive family tree...",
      "Family Identity Manual": "Opening family values handbook..."
    }
    
    // You could create specific pages for each resource
    alert(messages[resourceTitle as keyof typeof messages] || "Opening resource...")
  }

  const handleEnterAccessCode = async () => {
    if (!accessCode.trim()) {
      toast.error('Please enter an access code')
      return
    }

    try {
      const { data, error } = await supabase.rpc('validate_family_code', {
        p_code: accessCode.toUpperCase().trim()
      })

      if (error) throw error

      const result = data as any
      if (result.success) {
        const newAccess = [...userAccess, result.access_level]
        setUserAccess(newAccess)
        
        // Save access to localStorage
        localStorage.setItem(`family_access_${user?.id}`, JSON.stringify(newAccess))
        
        setShowCodeDialog(false)
        setAccessCode('')
        
        toast.success(`🔓 ${result.access_level.toUpperCase()} ACCESS GRANTED`)
        
        // Show what's been unlocked
        setTimeout(() => {
          const element = document.getElementById(`${result.access_level}-section`)
          if (element) {
            element.scrollIntoView({ behavior: 'smooth' })
          }
        }, 500)
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      console.error('Error validating code:', error)
      toast.error('Failed to validate access code')
    }
  }

  const hasAccess = (level: string) => {
    return isAdmin || userAccess.includes(level)
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
                          ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                          : module.title === 'Family Constitution'
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          : 'bg-purple-600 hover:bg-purple-700 text-white'
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

        {/* Family Governance */}
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
              <Scale className="h-5 w-5" />
              Family Governance Structure
            </h2>
            <p className="text-muted-foreground text-sm">
              The three branches of government that guide our family's decision-making process
            </p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {governanceBranches.map((branch) => {
              const Icon = branch.icon
              return (
                <Card key={branch.title} className="border-2">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                        <Icon className="h-6 w-6 text-emerald-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{branch.title}</CardTitle>
                        <CardDescription className="text-xs">
                          {branch.members}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-3">
                      {branch.description}
                    </p>
                    <Badge variant="outline" className="text-xs">
                      {branch.role}
                    </Badge>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </section>

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
                        <Badge variant="outline" className="text-xs">
                          {resource.type}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </section>

        {/* Family Secret Codes */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Family Secret Codes
              </h2>
              <p className="text-muted-foreground text-sm">
                Secure access system for sensitive family information and resources
              </p>
            </div>
            {isAdmin && (
              <Button
                variant="outline"
                onClick={() => setShowAdminPanel(!showAdminPanel)}
              >
                <Settings className="h-4 w-4 mr-2" />
                {showAdminPanel ? 'Hide Admin' : 'Admin Panel'}
              </Button>
            )}
          </div>

          {showAdminPanel && isAdmin ? (
            <FamilySecretCodesAdmin />
          ) : (
            <>
              {/* Active Codes Display for Admins */}
              {isAdmin && availableCodes.length > 0 && (
                <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Eye className="h-5 w-5" />
                      Active Family Codes ({availableCodes.length})
                    </CardTitle>
                    <CardDescription>
                      As an admin, you can view all active family codes
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

        {/* Trust Documents Section - Unlocked with Trust Access */}
        {hasAccess('trust') && (
          <section id="trust-section" className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center gap-2">
                <Unlock className="h-5 w-5 text-emerald-600" />
                <h2 className="text-xl font-semibold">Trust & Financial Documents</h2>
              </div>
              <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">
                Trust Access
              </Badge>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card className="border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/30">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-6 w-6 text-emerald-600" />
                    <CardTitle className="text-lg">Investment Portfolios</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">
                    Real-time view of family investment holdings and performance
                  </p>
                  <Button className="w-full" onClick={() => navigate('/investments')}>
                    View Investments
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/30">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <FileText className="h-6 w-6 text-emerald-600" />
                    <CardTitle className="text-lg">Trust Documents</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">
                    Legal trust agreements, amendments, and beneficiary information
                  </p>
                  <Button className="w-full" variant="outline">
                    Access Documents
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/30">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-6 w-6 text-emerald-600" />
                    <CardTitle className="text-lg">Financial Statements</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">
                    Quarterly reports, tax documents, and audit statements
                  </p>
                  <Button className="w-full" variant="outline">
                    View Statements
                  </Button>
                </CardContent>
              </Card>
            </div>
          </section>
        )}

        {/* Legacy Meetings Section - Unlocked with Legacy Access */}
        {hasAccess('legacy') && (
          <section id="legacy-section" className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center gap-2">
                <Unlock className="h-5 w-5 text-purple-600" />
                <h2 className="text-xl font-semibold">Family Legacy & Succession</h2>
              </div>
              <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                Legacy Access
              </Badge>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="border-purple-200 bg-purple-50/50 dark:bg-purple-950/30">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-6 w-6 text-purple-600" />
                    <CardTitle className="text-lg">Legacy Council Meetings</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-background rounded border">
                      <div>
                        <p className="font-medium text-sm">Next Generation Leadership</p>
                        <p className="text-xs text-muted-foreground">Today, 2:00 PM</p>
                      </div>
                      <Button size="sm">Join</Button>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-background rounded border">
                      <div>
                        <p className="font-medium text-sm">Succession Planning Review</p>
                        <p className="text-xs text-muted-foreground">Tomorrow, 10:00 AM</p>
                      </div>
                      <Button size="sm" variant="outline">Schedule</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-purple-200 bg-purple-50/50 dark:bg-purple-950/30">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-6 w-6 text-purple-600" />
                    <CardTitle className="text-lg">Leadership Pipeline</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="p-3 bg-background rounded border">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium text-sm">Next Generation Readiness</p>
                        <Badge variant="outline">75%</Badge>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div className="bg-purple-600 h-2 rounded-full" style={{ width: '75%' }}></div>
                      </div>
                    </div>
                    <Button className="w-full" variant="outline">
                      View Development Plans
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-purple-200 bg-purple-50/50 dark:bg-purple-950/30 md:col-span-2">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Crown className="h-6 w-6 text-purple-600" />
                    <CardTitle className="text-lg">Family Legacy Archive</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-3 bg-background rounded border text-center">
                      <FileText className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                      <p className="font-medium text-sm">Historical Documents</p>
                      <p className="text-xs text-muted-foreground">150+ documents</p>
                    </div>
                    <div className="p-3 bg-background rounded border text-center">
                      <Video className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                      <p className="font-medium text-sm">Legacy Recordings</p>
                      <p className="text-xs text-muted-foreground">45 recordings</p>
                    </div>
                    <div className="p-3 bg-background rounded border text-center">
                      <Image className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                      <p className="font-medium text-sm">Family Photos</p>
                      <p className="text-xs text-muted-foreground">1,200+ photos</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>
        )}

        {/* Basic Access Section - Unlocked with Basic Access */}
        {hasAccess('basic') && (
          <section id="basic-section" className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center gap-2">
                <Unlock className="h-5 w-5 text-blue-600" />
                <h2 className="text-xl font-semibold">Family Network & Resources</h2>
              </div>
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                Basic Access
              </Badge>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/30">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Users className="h-6 w-6 text-blue-600" />
                    <CardTitle className="text-lg">Family Directory</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">
                    Contact information and profiles of all family members
                  </p>
                  <Button className="w-full" onClick={() => navigate('/family-members')}>
                    View Directory
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/30">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Phone className="h-6 w-6 text-blue-600" />
                    <CardTitle className="text-lg">Emergency Contacts</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Family Office</span>
                      <span className="font-mono">+1 (555) 123-4567</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Legal Counsel</span>
                      <span className="font-mono">+1 (555) 987-6543</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Financial Advisor</span>
                      <span className="font-mono">+1 (555) 456-7890</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/30 md:col-span-2">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-6 w-6 text-blue-600" />
                    <CardTitle className="text-lg">Family Properties & Locations</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-3 bg-background rounded border">
                      <p className="font-medium text-sm">Main Estate</p>
                      <p className="text-xs text-muted-foreground">Napa Valley, CA</p>
                      <p className="text-xs text-muted-foreground mt-1">Primary residence</p>
                    </div>
                    <div className="p-3 bg-background rounded border">
                      <p className="font-medium text-sm">Beach House</p>
                      <p className="text-xs text-muted-foreground">Hamptons, NY</p>
                      <p className="text-xs text-muted-foreground mt-1">Summer retreat</p>
                    </div>
                    <div className="p-3 bg-background rounded border">
                      <p className="font-medium text-sm">Mountain Lodge</p>
                      <p className="text-xs text-muted-foreground">Aspen, CO</p>
                      <p className="text-xs text-muted-foreground mt-1">Winter getaway</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>
        )}

        {/* Admin Section - Unlocked with Admin Access */}
        {hasAccess('admin') && (
          <section id="admin-section" className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center gap-2">
                <Unlock className="h-5 w-5 text-red-600" />
                <h2 className="text-xl font-semibold">Administrative Controls</h2>
              </div>
              <Badge variant="destructive">
                Admin Access
              </Badge>
            </div>
            
            <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/30">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Shield className="h-6 w-6 text-red-600" />
                  <CardTitle className="text-lg">Family Office Management</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button className="h-auto p-4 flex-col items-start" variant="outline">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="h-5 w-5" />
                      <span className="font-medium">User Management</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      Manage family member accounts and permissions
                    </span>
                  </Button>
                  
                  <Button className="h-auto p-4 flex-col items-start" variant="outline">
                    <div className="flex items-center gap-2 mb-2">
                      <Settings className="h-5 w-5" />
                      <span className="font-medium">System Settings</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      Configure platform settings and preferences
                    </span>
                  </Button>
                  
                  <Button className="h-auto p-4 flex-col items-start" variant="outline">
                    <div className="flex items-center gap-2 mb-2">
                      <Activity className="h-5 w-5" />
                      <span className="font-medium">Audit Logs</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      View system activity and security logs
                    </span>
                  </Button>
                  
                  <Button className="h-auto p-4 flex-col items-start" variant="outline">
                    <div className="flex items-center gap-2 mb-2">
                      <Lock className="h-5 w-5" />
                      <span className="font-medium">Access Control</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      Manage security codes and permissions
                    </span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>
        )}
      </div>
    </div>
  )
}