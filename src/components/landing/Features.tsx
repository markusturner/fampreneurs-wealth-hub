import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Brain, 
  TrendingUp, 
  Users, 
  FileText, 
  Calendar, 
  GraduationCap, 
  MessageSquare, 
  BarChart3 
} from 'lucide-react'

const features = [
  {
    icon: Users,
    title: "AI Family Office Team",
    description: "Meet Rachel (AI Director) and 8 specialized AI advisors available 24/7. From financial planning to tax optimization, your complete AI-powered advisory team."
  },
  {
    icon: TrendingUp,
    title: "Investment Tracking & AI Insights",
    description: "Connect all accounts for real-time portfolio monitoring. Get AI-powered investment recommendations and wealth optimization strategies."
  },
  {
    icon: GraduationCap,
    title: "Financial Education & Courses",
    description: "Master The F.L.I.P. Formula™ with expert courses, webinars, and AI-guided learning paths to build sustainable wealth."
  },
  {
    icon: Brain,
    title: "Estate Planning & Wealth Protection",
    description: "AI-assisted estate planning tools and asset protection strategies to secure your family's financial future across generations."
  },
  {
    icon: MessageSquare,
    title: "Family Governance & Goals",
    description: "Involve your whole family in wealth building. Set goals, track progress, and build financial literacy with AI guidance."
  },
  {
    icon: BarChart3,
    title: "Performance Analytics & Reports",
    description: "Comprehensive AI-generated reports and analytics to understand wealth growth, identify opportunities, and optimize your strategy."
  },
  {
    icon: FileText,
    title: "Secure Document Management",
    description: "Store wills, trusts, insurance policies, and important documents in one encrypted, accessible location with AI organization."
  },
  {
    icon: Calendar,
    title: "Meeting & Calendar Management",
    description: "Schedule family meetings, track financial reviews, and never miss important wealth-building milestones with AI reminders."
  }
]

const iconColors = [
  '#FFB500', // Golden yellow
  '#2EB2FF', // Bright blue
  '#FF6B6B', // Coral red
  '#4ECDC4', // Teal
  '#45B7D1', // Sky blue
  '#96CEB4', // Mint green
  '#FFEAA7', // Light yellow
  '#DDA0DD'  // Plum
]

export const Features = () => {
  return (
    <section id="features" className="py-16 md:py-20 bg-background">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 md:mb-6" style={{ color: '#2eb2ff' }}>
            Your Complete AI-Powered
            <span style={{ color: '#FFB500' }}> Family Office</span>
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
            Meet your 8 AI specialists and Rachel, your AI Family Office Director. Professional guidance 24/7, no $1M minimum required.
          </p>
          <div className="mt-4 inline-block px-4 py-2 bg-primary/10 text-white rounded-full text-sm font-semibold">
            🎯 Human advisory team launching Q2 2025 for premium members
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="border-2 hover:shadow-lg transition-all duration-300 group">
              <CardHeader className="text-center pb-4">
                 <div className="w-16 h-16 mx-auto mb-4 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300" style={{ backgroundColor: `${iconColors[index]}20` }}>
                   <feature.icon className="w-8 h-8" style={{ color: iconColors[index] }} />
                </div>
                <CardTitle className="text-lg" style={{ color: '#ffb500' }}>
                  {feature.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center text-sm leading-relaxed">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Value Proposition */}
        <div className="mt-16 md:mt-20 text-center">
          <div className="max-w-4xl mx-auto p-6 md:p-8 rounded-2xl" style={{ backgroundColor: 'rgba(255, 181, 0, 0.1)' }}>
            <h3 className="text-xl md:text-2xl lg:text-3xl font-bold mb-4 text-foreground dark:text-white">
              Why Choose TruHeirs Over Traditional Wealth Management?
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 mt-6 md:mt-8">
              <div>
                <h4 className="font-bold text-lg mb-2" style={{ color: '#FFB500' }}>Traditional Wealth Managers</h4>
                <ul className="text-white text-left space-y-1">
                  <li className="flex items-start"><span className="mr-2">•</span><span>$1M+ minimum investment</span></li>
                  <li className="flex items-start"><span className="mr-2">•</span><span>1-2% annual fees</span></li>
                  <li className="flex items-start"><span className="mr-2">•</span><span>Limited family involvement</span></li>
                  <li className="flex items-start"><span className="mr-2">•</span><span>Slow decision making</span></li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold text-lg mb-2" style={{ color: '#2EB2FF' }}>DIY Approach</h4>
                <ul className="text-white text-left space-y-1">
                  <li className="flex items-start"><span className="mr-2">•</span><span>No professional guidance</span></li>
                  <li className="flex items-start"><span className="mr-2">•</span><span>Scattered tools & accounts</span></li>
                  <li className="flex items-start"><span className="mr-2">•</span><span>Time-consuming research</span></li>
                  <li className="flex items-start"><span className="mr-2">•</span><span>No family coordination</span></li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold text-lg mb-2" style={{ color: '#6215c8' }}>TruHeirs Platform</h4>
                <ul className="text-white text-left space-y-1">
                  <li className="flex items-start"><span className="mr-2">•</span><span>AI-first approach with 8 specialists</span></li>
                  <li className="flex items-start"><span className="mr-2">•</span><span>$97/mo (not 1-2% fees)</span></li>
                  <li className="flex items-start"><span className="mr-2">•</span><span>24/7 unlimited AI guidance</span></li>
                  <li className="flex items-start"><span className="mr-2">•</span><span>Human advisory coming Q2 2025</span></li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}