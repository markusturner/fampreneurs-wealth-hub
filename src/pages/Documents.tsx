import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
  Video
} from "lucide-react"
import { NavHeader } from "@/components/dashboard/nav-header"
import { useNavigate } from "react-router-dom"

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
                    <Button className="w-full mt-3" size="sm">
                      Start Learning
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
                <Button>
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
                <Card key={resource.title} className="hover:shadow-md transition-shadow cursor-pointer">
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
          <div>
            <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Family Secret Codes
            </h2>
            <p className="text-muted-foreground text-sm">
              Secure access system for sensitive family information and resources
            </p>
          </div>
          
          <Card className="border-2 border-dashed border-muted-foreground/30">
            <CardContent className="p-8 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
                <Lock className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="font-semibold mb-2">Secure Access Required</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Enter your family access code to view sensitive family information
              </p>
              <Button variant="outline">
                Enter Access Code
              </Button>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  )
}