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
    icon: Brain,
    title: "AI-Powered Family Office Management",
    description: "Get professional-level financial insights and automated wealth management recommendations without the $1M+ minimums."
  },
  {
    icon: TrendingUp,
    title: "Wealth & Investment Tracking",
    description: "Connect all your accounts and track your family's complete financial picture in real-time with advanced analytics."
  },
  {
    icon: Users,
    title: "Family Member Coordination",
    description: "Keep your entire family aligned with secure communication, role-based access, and transparent wealth visibility."
  },
  {
    icon: FileText,
    title: "Secure Document Management",
    description: "Store wills, trusts, insurance policies, and important documents in one encrypted, accessible location."
  },
  {
    icon: Calendar,
    title: "Meeting & Calendar Management",
    description: "Schedule family meetings, track financial reviews, and never miss important wealth-building milestones."
  },
  {
    icon: GraduationCap,
    title: "Financial Education & Courses",
    description: "Access exclusive courses on wealth building, tax strategies, and generational wealth transfer."
  },
  {
    icon: MessageSquare,
    title: "Community & Networking",
    description: "Connect with other successful families building generational wealth and share strategies."
  },
  {
    icon: BarChart3,
    title: "Real-time Analytics & Reporting",
    description: "Get detailed reports on your wealth growth, investment performance, and financial goal progress."
  }
]

export const Features = () => {
  return (
    <section id="features" className="py-20 bg-background">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6" style={{ color: '#290A52' }}>
            Everything You Need to Build
            <span style={{ color: '#FFB500' }}> Generational Wealth</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Professional family office tools designed for busy professionals and entrepreneurs who want to scale their wealth without the traditional barriers.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="border-2 hover:shadow-lg transition-all duration-300 group">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 mx-auto mb-4 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300" style={{ backgroundColor: 'rgba(41, 10, 82, 0.1)' }}>
                  <feature.icon className="w-8 h-8" style={{ color: '#290A52' }} />
                </div>
                <CardTitle className="text-lg" style={{ color: '#290A52' }}>
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
        <div className="mt-20 text-center">
          <div className="max-w-4xl mx-auto p-8 rounded-2xl" style={{ backgroundColor: 'rgba(255, 181, 0, 0.1)' }}>
            <h3 className="text-2xl md:text-3xl font-bold mb-4" style={{ color: '#290A52' }}>
              Why Choose TruHeirs Over Traditional Wealth Management?
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">
              <div>
                <h4 className="font-bold text-lg mb-2" style={{ color: '#FFB500' }}>Traditional Wealth Managers</h4>
                <ul className="text-muted-foreground text-left space-y-1">
                  <li>• $1M+ minimum investment</li>
                  <li>• 1-2% annual fees</li>
                  <li>• Limited family involvement</li>
                  <li>• Slow decision making</li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold text-lg mb-2" style={{ color: '#2EB2FF' }}>DIY Approach</h4>
                <ul className="text-muted-foreground text-left space-y-1">
                  <li>• No professional guidance</li>
                  <li>• Scattered tools & accounts</li>
                  <li>• Time-consuming research</li>
                  <li>• No family coordination</li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold text-lg mb-2" style={{ color: '#290A52' }}>TruHeirs Platform</h4>
                <ul className="text-foreground text-left space-y-1">
                  <li>• Start with any amount</li>
                  <li>• Fixed monthly pricing</li>
                  <li>• Full family engagement</li>
                  <li>• AI-powered insights</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}