import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Cookie, Settings, Eye, BarChart, Shield, Info } from 'lucide-react';
import { navigateToRoute } from '@/utils/navigation';

const CookiePolicy = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 md:px-6 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => navigateToRoute('/')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Button>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold" style={{backgroundColor: '#290A52'}}>
                T
              </div>
              <span className="text-lg font-bold" style={{color: '#ffb500'}}>TruHeirs</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 md:px-6 py-8 md:py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-6" style={{backgroundColor: 'rgba(41, 10, 82, 0.1)'}}>
            <Cookie className="w-8 h-8" style={{color: '#ffb500'}} />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Cookie Policy</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Learn about how we use cookies and similar technologies to enhance your experience on the TruHeirs platform.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Last updated: January 29, 2025
          </p>
        </div>

        {/* Content Sections */}
        <div className="max-w-4xl mx-auto space-y-8">
          
          {/* What Are Cookies */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="w-5 h-5" style={{color: '#FFB500'}} />
                What Are Cookies?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                Cookies are small text files that are stored on your device when you visit our website. They help us provide you with a better experience by remembering your preferences and enabling certain functionality.
              </p>
              <p>
                We also use similar technologies such as web beacons, pixels, and local storage to collect information about how you use our Service.
              </p>
            </CardContent>
          </Card>

          {/* Types of Cookies */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cookie className="w-5 h-5" style={{color: '#FFB500'}} />
                Types of Cookies We Use
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* Essential Cookies */}
              <div className="border-l-4 pl-4" style={{borderColor: '#290A52'}}>
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4" style={{color: '#FFB500'}} />
                  <h4 className="font-semibold">Essential Cookies</h4>
                </div>
                <p className="text-muted-foreground mb-2">
                  These cookies are necessary for the website to function properly and cannot be disabled.
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Authentication and security tokens</li>
                  <li>Session management</li>
                  <li>Load balancing and routing</li>
                  <li>CSRF protection</li>
                  <li>Cookie consent preferences</li>
                </ul>
              </div>

              {/* Functional Cookies */}
              <div className="border-l-4 pl-4" style={{borderColor: '#FFB500'}}>
                <div className="flex items-center gap-2 mb-2">
                  <Settings className="w-4 h-4" style={{color: '#FFB500'}} />
                  <h4 className="font-semibold">Functional Cookies</h4>
                </div>
                <p className="text-muted-foreground mb-2">
                  These cookies enable enhanced functionality and personalization features.
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>User preferences and settings</li>
                  <li>Language and region settings</li>
                  <li>Theme preferences (light/dark mode)</li>
                  <li>Dashboard layout customizations</li>
                  <li>Recent searches and filters</li>
                </ul>
              </div>

              {/* Analytics Cookies */}
              <div className="border-l-4 pl-4" style={{borderColor: '#6B7280'}}>
                <div className="flex items-center gap-2 mb-2">
                  <BarChart className="w-4 h-4" style={{color: '#FFB500'}} />
                  <h4 className="font-semibold">Analytics Cookies</h4>
                </div>
                <p className="text-muted-foreground mb-2">
                  These cookies help us understand how visitors interact with our website.
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Page views and navigation patterns</li>
                  <li>Feature usage statistics</li>
                  <li>Performance monitoring</li>
                  <li>Error tracking and debugging</li>
                  <li>A/B testing for improvements</li>
                </ul>
              </div>

              {/* Performance Cookies */}
              <div className="border-l-4 pl-4" style={{borderColor: '#10B981'}}>
                <div className="flex items-center gap-2 mb-2">
                  <Eye className="w-4 h-4" style={{color: '#FFB500'}} />
                  <h4 className="font-semibold">Performance Cookies</h4>
                </div>
                <p className="text-muted-foreground mb-2">
                  These cookies help us optimize website performance and user experience.
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Page load time optimization</li>
                  <li>Content caching preferences</li>
                  <li>Network performance monitoring</li>
                  <li>Resource loading optimization</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Third-Party Cookies */}
          <Card>
            <CardHeader>
              <CardTitle>Third-Party Cookies</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                We work with trusted third-party service providers who may also set cookies on your device. These include:
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h4 className="font-semibold">Service Providers</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    <li><strong>Supabase:</strong> Database and authentication services</li>
                    <li><strong>Plaid:</strong> Financial account integration</li>
                    <li><strong>Stripe:</strong> Payment processing</li>
                    <li><strong>Daily.co:</strong> Video calling functionality</li>
                  </ul>
                </div>
                <div className="space-y-3">
                  <h4 className="font-semibold">Analytics & Monitoring</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    <li><strong>Google Analytics:</strong> Website usage analysis</li>
                    <li><strong>Mixpanel:</strong> User behavior tracking</li>
                    <li><strong>Sentry:</strong> Error monitoring</li>
                    <li><strong>Hotjar:</strong> User experience analysis</li>
                  </ul>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                These third parties have their own privacy policies and cookie practices. We encourage you to review their policies.
              </p>
            </CardContent>
          </Card>

          {/* Cookie Duration */}
          <Card>
            <CardHeader>
              <CardTitle>Cookie Duration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-2">Session Cookies</h4>
                  <p className="text-muted-foreground text-sm mb-2">
                    These cookies are temporary and are deleted when you close your browser.
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-xs text-muted-foreground">
                    <li>Login session management</li>
                    <li>Shopping cart contents</li>
                    <li>Form data retention</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Persistent Cookies</h4>
                  <p className="text-muted-foreground text-sm mb-2">
                    These cookies remain on your device for a specified period or until manually deleted.
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-xs text-muted-foreground">
                    <li>User preferences: Up to 1 year</li>
                    <li>Analytics data: Up to 2 years</li>
                    <li>Authentication tokens: 30 days</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Managing Cookies */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" style={{color: '#FFB500'}} />
                Managing Your Cookie Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-semibold mb-2">Browser Settings</h4>
                <p className="text-muted-foreground mb-3">
                  You can control cookies through your browser settings. Most browsers allow you to:
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>View cookies stored on your device</li>
                  <li>Delete existing cookies</li>
                  <li>Block cookies from specific websites</li>
                  <li>Block all cookies (may affect functionality)</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Cookie Consent Management</h4>
                <p className="text-muted-foreground mb-3">
                  We provide a cookie consent banner where you can:
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Accept or reject non-essential cookies</li>
                  <li>Customize your cookie preferences by category</li>
                  <li>Change your preferences at any time</li>
                  <li>Learn more about each cookie type</li>
                </ul>
              </div>

              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Shield className="w-4 h-4" style={{color: '#FFB500'}} />
                  Important Note
                </h4>
                <p className="text-sm text-muted-foreground">
                  Disabling certain cookies may impact your ability to use some features of our Service. Essential cookies cannot be disabled as they are necessary for the platform to function properly.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Browser-Specific Instructions */}
          <Card>
            <CardHeader>
              <CardTitle>Browser-Specific Cookie Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-1">Google Chrome</h4>
                    <p className="text-xs text-muted-foreground">Settings → Privacy and Security → Cookies and other site data</p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Mozilla Firefox</h4>
                    <p className="text-xs text-muted-foreground">Options → Privacy & Security → Cookies and Site Data</p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Safari</h4>
                    <p className="text-xs text-muted-foreground">Preferences → Privacy → Manage Website Data</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-1">Microsoft Edge</h4>
                    <p className="text-xs text-muted-foreground">Settings → Cookies and site permissions → Cookies and site data</p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Opera</h4>
                    <p className="text-xs text-muted-foreground">Settings → Advanced → Privacy & Security → Site Settings</p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Mobile Browsers</h4>
                    <p className="text-xs text-muted-foreground">Check your browser's help section for mobile-specific instructions</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Updates to Policy */}
          <Card>
            <CardHeader>
              <CardTitle>Updates to This Policy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                We may update this Cookie Policy from time to time to reflect changes in our practices or applicable laws. When we make significant changes, we will:
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Update the "Last Updated" date at the top of this policy</li>
                <li>Notify you through our Service or via email</li>
                <li>Provide prominent notice of material changes</li>
                <li>Request renewed consent where required by law</li>
              </ul>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Us About Cookies</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                If you have questions about our use of cookies or this Cookie Policy, please contact us:
              </p>
              <div className="space-y-2">
                <p><strong>Email:</strong> privacy@truheirs.com</p>
                <p><strong>Phone:</strong> 1-800-TRU-HEIR</p>
                <p><strong>Address:</strong> VNCI, LLC, 123 Wealth St., Financial District, New York, NY 10001</p>
              </div>
              <p className="text-sm text-muted-foreground">
                We will respond to cookie-related inquiries within 30 days.
              </p>
            </CardContent>
          </Card>

        </div>

        {/* Footer */}
        <div className="text-center mt-16 py-8 border-t border-border">
          <Button
            onClick={() => navigateToRoute('/')}
            size="lg"
            className="text-white hover:opacity-90 transition-opacity"
            style={{backgroundColor: '#290A52'}}
          >
            Return to TruHeirs
          </Button>
        </div>
      </main>
    </div>
  );
};

export default CookiePolicy;