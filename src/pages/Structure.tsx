import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Building2, Users, FileText, CheckCircle, ArrowRight, Lightbulb } from 'lucide-react'
import { BusinessStructureDialog } from '@/components/dashboard/business-structure-dialog'
import { NavHeader } from '@/components/dashboard/nav-header'

export function Structure() {
  const [businessStructureDialogOpen, setBusinessStructureDialogOpen] = useState(false)

  const structureSteps = [
    {
      step: 1,
      title: "Entity Assessment",
      description: "Analyze your current business entities and structure",
      icon: Building2,
      status: "pending"
    },
    {
      step: 2,
      title: "Family Integration",
      description: "Review family member involvement and employment",
      icon: Users,
      status: "pending"
    },
    {
      step: 3,
      title: "Tax Optimization",
      description: "Identify tax savings opportunities and structure improvements",
      icon: FileText,
      status: "pending"
    },
    {
      step: 4,
      title: "Implementation Plan",
      description: "Get specific action items and next steps",
      icon: CheckCircle,
      status: "pending"
    }
  ]

  const benefits = [
    "Optimal tax structure recommendations",
    "Family employment guidance",
    "Asset protection strategies",
    "Compliance optimization",
    "Growth planning insights"
  ]

  return (
    <>
      <NavHeader />
      <BusinessStructureDialog 
        open={businessStructureDialogOpen} 
        onOpenChange={setBusinessStructureDialogOpen} 
      />
      
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
        <div className="container mx-auto px-4 py-6 space-y-6">
          {/* Header Section */}
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Business Structure Analysis
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Optimize your business entities for maximum tax efficiency, asset protection, and family integration using The F.L.I.P. Formula™
            </p>
          </div>

          {/* Process Overview */}
          <Card className="border-2 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-primary" />
                How It Works
              </CardTitle>
              <CardDescription>
                Our comprehensive analysis follows a proven step-by-step process
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {structureSteps.map((step, index) => (
                  <div key={step.step} className="relative">
                    <Card className="h-full border border-muted">
                      <CardContent className="p-4 text-center">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-3">
                          <step.icon className="h-6 w-6 text-primary" />
                        </div>
                        <div className="space-y-2">
                          <Badge variant="outline" className="text-xs">
                            Step {step.step}
                          </Badge>
                          <h3 className="font-semibold text-sm">{step.title}</h3>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {step.description}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                    {index < structureSteps.length - 1 && (
                      <ArrowRight className="hidden lg:block absolute top-1/2 -right-6 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Main CTA Section */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Left Column - Analysis Benefits */}
            <Card>
              <CardHeader>
                <CardTitle>What You'll Receive</CardTitle>
                <CardDescription>
                  Comprehensive recommendations tailored to your specific situation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <span className="text-sm">{benefit}</span>
                  </div>
                ))}
                
                <Separator className="my-4" />
                
                <div className="space-y-3">
                  <h4 className="font-medium text-sm">The F.L.I.P. Formula™ Structure:</h4>
                  <div className="grid gap-2 text-xs text-muted-foreground">
                    <div className="flex justify-between">
                      <span>• Family Trust</span>
                      <span>Foundation</span>
                    </div>
                    <div className="flex justify-between">
                      <span>• Tax-Exempt Trust</span>
                      <span>Business Trust</span>
                    </div>
                    <div className="flex justify-between">
                      <span>• Wyoming Entities</span>
                      <span>Management Companies</span>
                    </div>
                    <div className="flex justify-between">
                      <span>• Real Estate Holdings</span>
                      <span>Operating Companies</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Right Column - Start Analysis */}
            <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-background">
              <CardHeader className="text-center">
                <CardTitle className="text-xl">Ready to Optimize?</CardTitle>
                <CardDescription>
                  Complete our 7-step analysis to receive personalized structure recommendations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center space-y-4">
                  <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                    <span>⏱️ Takes 5-10 minutes</span>
                    <span>•</span>
                    <span>🔒 Completely confidential</span>
                  </div>
                  
                  <Button 
                    size="lg" 
                    className="w-full h-12 text-base font-semibold"
                    onClick={() => setBusinessStructureDialogOpen(true)}
                  >
                    Start Business Structure Analysis
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                  
                  <p className="text-xs text-muted-foreground">
                    Get instant recommendations based on The F.L.I.P. Formula™ methodology
                  </p>
                </div>

                <Separator />

                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-center">Analysis Covers:</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      <span>Current LLCs</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      <span>Family Employment</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      <span>Tax Optimization</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      <span>Asset Protection</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      <span>Real Estate</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      <span>Benefits Planning</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Additional Information */}
          <Card className="bg-muted/50">
            <CardContent className="p-6">
              <div className="text-center space-y-3">
                <h3 className="font-semibold">Professional Implementation Support</h3>
                <p className="text-sm text-muted-foreground max-w-3xl mx-auto">
                  Our analysis provides detailed recommendations, but professional consultation with qualified CPAs, 
                  attorneys, and financial advisors is essential for proper implementation. We can connect you with 
                  trusted professionals who specialize in family office structures.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}

export default Structure