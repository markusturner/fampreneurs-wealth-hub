import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Crown, 
  Users, 
  Scale,
  ArrowLeft,
  Building2,
  Target,
  Users2,
  CheckCircle2
} from "lucide-react"
import { NavHeader } from "@/components/dashboard/nav-header"
import { useNavigate } from "react-router-dom"

const governanceBranches = [
  {
    title: "The Family Council",
    description: "Executive branch responsible for day-to-day family business decisions",
    icon: Crown,
    members: "5 Active Members",
    role: "Decision Making & Strategy",
    color: "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800",
    iconColor: "text-blue-600",
    responsibilities: [
      "Strategic planning and direction",
      "Resource allocation decisions", 
      "Business operations oversight",
      "Crisis management and resolution",
      "Quarterly family meetings"
    ],
    meetingSchedule: "Weekly meetings every Tuesday",
    authority: "Executive decisions for amounts up to $500K"
  },
  {
    title: "Council of Elders",
    description: "Advisory branch providing wisdom and guidance based on experience",
    icon: Users,
    members: "3 Elder Members",
    role: "Guidance & Mentorship",
    color: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800",
    iconColor: "text-emerald-600",
    responsibilities: [
      "Mentorship for younger generation",
      "Dispute resolution and mediation",
      "Preservation of family values",
      "Historical knowledge transfer",
      "Legacy planning guidance"
    ],
    meetingSchedule: "Monthly meetings first Friday",
    authority: "Advisory capacity with veto power on major decisions"
  },
  {
    title: "Family Assembly",
    description: "Legislative branch representing all family members' voices",
    icon: Scale,
    members: "All Family Members",
    role: "Voting & Policy Making",
    color: "bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800",
    iconColor: "text-purple-600",
    responsibilities: [
      "Vote on family constitution changes",
      "Approve major investments",
      "Select Family Council members",
      "Annual budget approval",
      "Policy and governance decisions"
    ],
    meetingSchedule: "Quarterly assemblies and annual meeting",
    authority: "Final voting authority on all major family matters"
  }
]

const governancePrinciples = [
  {
    title: "Transparency",
    description: "All decisions and processes are open and accessible to family members",
    icon: CheckCircle2
  },
  {
    title: "Accountability", 
    description: "Each branch is responsible for their actions and decisions",
    icon: Target
  },
  {
    title: "Representation",
    description: "Every family member has a voice in the governance process",
    icon: Users2
  },
  {
    title: "Continuity",
    description: "Structures designed to preserve family values across generations",
    icon: Building2
  }
]

export default function FamilyGovernance() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-background">
      <NavHeader />
      
      <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/documents')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Family Roundtable
          </Button>
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <Scale className="h-8 w-8" />
            Family Governance Structure
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-2">
            Understanding the three branches of government that guide our family's decision-making process
          </p>
        </div>

        {/* Governance Principles */}
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold mb-2">Core Governance Principles</h2>
            <p className="text-muted-foreground text-sm">
              The foundational values that guide our family governance structure
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {governancePrinciples.map((principle, index) => {
              const Icon = principle.icon
              const iconColors = [
                "text-blue-600",
                "text-emerald-600", 
                "text-purple-600",
                "text-orange-600"
              ]
              return (
                <Card key={principle.title} className="text-center">
                  <CardContent className="p-4">
                    <div className="flex justify-center mb-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Icon className={`h-6 w-6 ${iconColors[index]}`} />
                      </div>
                    </div>
                    <h3 className="font-semibold mb-2">{principle.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {principle.description}
                    </p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </section>

        {/* Three Branches */}
        <section className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-2">The Three Branches of Family Government</h2>
            <p className="text-muted-foreground text-sm">
              Each branch has distinct roles and responsibilities in our family's governance system
            </p>
          </div>
          
          <div className="space-y-6">
            {governanceBranches.map((branch, index) => {
              const Icon = branch.icon
              return (
                <Card key={branch.title} className={`${branch.color} border-2`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-lg bg-background/50">
                          <Icon className={`h-8 w-8 ${branch.iconColor}`} />
                        </div>
                        <div>
                          <CardTitle className="text-xl">{branch.title}</CardTitle>
                          <CardDescription className="text-base">
                            {branch.description}
                          </CardDescription>
                          <div className="flex gap-3 mt-2">
                            <Badge variant="secondary">{branch.members}</Badge>
                            <Badge variant="outline">{branch.role}</Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-3 gap-6">
                      <div>
                        <h4 className="font-semibold mb-2 text-sm">Key Responsibilities</h4>
                        <ul className="space-y-1">
                          {branch.responsibilities.map((responsibility, idx) => (
                            <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                              <CheckCircle2 className="h-3 w-3 mt-0.5 flex-shrink-0 text-green-600" />
                              {responsibility}
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <div>
                        <h4 className="font-semibold mb-2 text-sm">Meeting Schedule</h4>
                        <p className="text-sm text-muted-foreground">{branch.meetingSchedule}</p>
                      </div>
                      
                      <div>
                        <h4 className="font-semibold mb-2 text-sm">Decision Authority</h4>
                        <p className="text-sm text-muted-foreground">{branch.authority}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </section>

        {/* How It Works Together */}
        <section className="space-y-4">
          <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                How Our Governance System Works
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Our family governance structure operates on a system of checks and balances, ensuring that no single branch has absolute power while maintaining efficient decision-making processes.
                </p>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2">Decision Flow</h4>
                    <ol className="text-sm text-muted-foreground space-y-1">
                      <li>1. Family Council proposes initiatives</li>
                      <li>2. Council of Elders provides guidance</li>
                      <li>3. Family Assembly votes on major decisions</li>
                      <li>4. Implementation by appropriate branch</li>
                    </ol>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-2">Conflict Resolution</h4>
                    <ol className="text-sm text-muted-foreground space-y-1">
                      <li>1. Council of Elders mediates disputes</li>
                      <li>2. Family Assembly final arbiter if needed</li>
                      <li>3. External mediation for complex issues</li>
                      <li>4. Family Constitution as ultimate guide</li>
                    </ol>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  )
}