import { useNavigate } from 'react-router-dom'
import { NavHeader } from "@/components/dashboard/nav-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Mail, Phone, MessageSquare, Clock, MapPin } from 'lucide-react'

const Contact = () => {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-background">
      <NavHeader />
      
      <main className="container max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-4 gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-2">Contact Us</h1>
            <p className="text-muted-foreground">
              Get in touch with our support team
            </p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email Support
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Send us an email and we'll get back to you within 24 hours.
              </p>
              <div className="space-y-2">
                <div>
                  <p className="font-medium">General Support</p>
                  <p style={{ color: '#ffb500' }}>info@fampreneurs.com</p>
                </div>
                <div>
                  <p className="font-medium">Technical Issues</p>
                  <p style={{ color: '#ffb500' }}>info@fampreneurs.com</p>
                </div>
                <div>
                  <p className="font-medium">Billing & Subscriptions</p>
                  <p style={{ color: '#ffb500' }}>info@fampreneurs.com</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Phone Support
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Contact our family success coaches for immediate assistance.
              </p>
              <div className="space-y-2">
                <div>
                  <p className="font-medium">Family Success Coaches</p>
                  <p style={{ color: '#ffb500' }}>+1 (555) 123-4567</p>
                </div>
                <div>
                  <p className="font-medium">General Support</p>
                  <p style={{ color: '#ffb500' }}>+1 (555) 123-4568</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                Monday - Friday: 9:00 AM - 6:00 PM EST
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Live Chat
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Get instant help through our live chat feature.
              </p>
              <Button 
                className="w-full"
                onClick={() => {
                  // Simple chat implementation - opens mailto as fallback
                  window.open('mailto:info@fampreneurs.com?subject=Live Chat Support Request', '_blank')
                }}
              >
                Start Live Chat
              </Button>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                Available 24/7
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Office Location
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Visit us at our headquarters for in-person support.
              </p>
              <div>
                <p className="font-medium">The Fampreneurs HQ</p>
                <p className="text-muted-foreground">
                  1650 Marietta Boulevard NW<br />
                  Unit D58<br />
                  Atlanta, GA 30318
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                By appointment only
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Emergency Support</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              For urgent issues that need immediate assistance, contact our family success coaches:
            </p>
            <div className="space-y-2">
              <div>
                <p className="font-medium text-red-600">Family Success Coaches</p>
                <p className="text-primary">+1 (555) 911-HELP</p>
              </div>
              <p className="text-sm text-muted-foreground">
                Available 24/7 for critical issues only
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

export default Contact