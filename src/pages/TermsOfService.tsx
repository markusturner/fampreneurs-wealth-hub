import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, FileText, Scale, Shield, AlertTriangle, Users, CreditCard } from 'lucide-react';
import { navigateToRoute } from '@/utils/navigation';

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 md:px-6 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
onClick={() => navigateToRoute('/auth')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Sign In
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
            <Scale className="w-8 h-8" style={{color: '#290A52'}} />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Terms of Service</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            These terms govern your use of the TruHeirs family office platform. Please read them carefully.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Last updated: January 29, 2025
          </p>
        </div>

        {/* Content Sections */}
        <div className="max-w-4xl mx-auto space-y-8">
          
          {/* Agreement */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" style={{color: '#FFB500'}} />
                Agreement to Terms
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                These Terms of Service ("Terms") constitute a legally binding agreement between you and VNCI, LLC, doing business as TruHeirs ("Company," "we," "us," or "our") regarding your use of the TruHeirs family office platform and related services (the "Service").
              </p>
              <p>
                By accessing or using our Service, you agree to be bound by these Terms. If you do not agree to these Terms, you may not use the Service.
              </p>
            </CardContent>
          </Card>

          {/* Service Description */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" style={{color: '#FFB500'}} />
                Service Description
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                TruHeirs is a comprehensive DIY AI family office platform designed for busy professionals and entrepreneurs building generational wealth. Our Service includes:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>Family governance and management tools</li>
                <li>Investment tracking and portfolio analytics</li>
                <li>Document management and storage</li>
                <li>Family member collaboration features</li>
                <li>Financial planning and reporting tools</li>
                <li>AI-powered insights and recommendations</li>
                <li>Integration with third-party financial services</li>
              </ul>
            </CardContent>
          </Card>

          {/* User Accounts */}
          <Card>
            <CardHeader>
              <CardTitle>User Accounts and Responsibilities</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-semibold mb-2">Account Registration</h4>
                <p className="text-muted-foreground mb-2">You must provide accurate, current, and complete information during registration and maintain the accuracy of your account information.</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Account Security</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>You are responsible for maintaining the confidentiality of your login credentials</li>
                  <li>You must immediately notify us of any unauthorized use of your account</li>
                  <li>You are liable for all activities that occur under your account</li>
                  <li>We recommend enabling two-factor authentication for enhanced security</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Family Office Administration</h4>
                <p className="text-muted-foreground">
                  If you are a family office administrator, you are responsible for managing family member access, permissions, and ensuring compliance with your family's governance policies.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Acceptable Use */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" style={{color: '#FFB500'}} />
                Acceptable Use Policy
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>You agree not to use the Service to:</p>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Prohibited Activities</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    <li>Violate any applicable laws or regulations</li>
                    <li>Upload malicious software or viruses</li>
                    <li>Attempt to gain unauthorized access</li>
                    <li>Interfere with the Service's operation</li>
                    <li>Impersonate others or provide false information</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Content Guidelines</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    <li>Share only content you have rights to</li>
                    <li>Respect intellectual property rights</li>
                    <li>Maintain family privacy and confidentiality</li>
                    <li>Use the platform for legitimate family office purposes</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Subscription and Payments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" style={{color: '#FFB500'}} />
                Subscription and Payments
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-semibold mb-2">Subscription Plans</h4>
                <p className="text-muted-foreground mb-2">
                  We offer various subscription plans with different features and pricing. Current pricing is available on our website.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Payment Terms</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Subscriptions are billed in advance on a monthly or annual basis</li>
                  <li>All fees are non-refundable except as required by law</li>
                  <li>We may change our fees with 30 days' written notice</li>
                  <li>Failed payments may result in service suspension</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Cancellation</h4>
                <p className="text-muted-foreground">
                  You may cancel your subscription at any time. Cancellation will take effect at the end of your current billing period.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Data and Privacy */}
          <Card>
            <CardHeader>
              <CardTitle>Data and Privacy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                Your privacy is important to us. Our collection, use, and protection of your personal information is governed by our Privacy Policy, which is incorporated into these Terms by reference.
              </p>
              <div className="space-y-2">
                <h4 className="font-semibold">Data Ownership</h4>
                <p className="text-muted-foreground">
                  You retain ownership of all data you submit to the Service. We provide tools for you to export your data at any time.
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold">Data Security</h4>
                <p className="text-muted-foreground">
                  We implement industry-standard security measures to protect your data, but cannot guarantee absolute security. You acknowledge the inherent risks of internet-based services.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Intellectual Property */}
          <Card>
            <CardHeader>
              <CardTitle>Intellectual Property Rights</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Our Rights</h4>
                <p className="text-muted-foreground">
                  The Service, including all software, designs, text, graphics, and other content, is owned by us or our licensors and protected by intellectual property laws.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Your License</h4>
                <p className="text-muted-foreground">
                  We grant you a limited, non-exclusive, non-transferable license to use the Service for your family office purposes in accordance with these Terms.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">User Content</h4>
                <p className="text-muted-foreground">
                  You grant us a limited license to use, store, and transmit your content solely to provide the Service. We do not claim ownership of your content.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Disclaimers and Limitations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" style={{color: '#FFB500'}} />
                Disclaimers and Limitations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-semibold mb-2">Service Availability</h4>
                <p className="text-muted-foreground">
                  We strive to maintain high service availability but do not guarantee uninterrupted access. We may perform maintenance that temporarily affects service availability.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Financial Advice Disclaimer</h4>
                <p className="text-muted-foreground">
                  Our Service provides tools and information but does not constitute financial, legal, or tax advice. Always consult with qualified professionals for specific guidance.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Limitation of Liability</h4>
                <p className="text-muted-foreground">
                  To the maximum extent permitted by law, our liability is limited to the amount you paid for the Service in the 12 months preceding the claim.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Termination */}
          <Card>
            <CardHeader>
              <CardTitle>Termination</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Termination by You</h4>
                <p className="text-muted-foreground">
                  You may terminate your account at any time by following the cancellation process in your account settings or contacting our support team.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Termination by Us</h4>
                <p className="text-muted-foreground">
                  We may terminate or suspend your access immediately if you breach these Terms or engage in prohibited activities.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Effect of Termination</h4>
                <p className="text-muted-foreground">
                  Upon termination, your right to use the Service ceases immediately. We will provide reasonable opportunity to export your data before permanent deletion.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Governing Law */}
          <Card>
            <CardHeader>
              <CardTitle>Governing Law and Dispute Resolution</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                These Terms are governed by the laws of the State of New York, without regard to conflict of law principles.
              </p>
              <div>
                <h4 className="font-semibold mb-2">Dispute Resolution</h4>
                <p className="text-muted-foreground">
                  Any disputes arising from these Terms will be resolved through binding arbitration in accordance with the rules of the American Arbitration Association.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                If you have questions about these Terms, please contact us:
              </p>
              <div className="space-y-2">
                <p><strong>Email:</strong> legal@truheirs.com</p>
                <p><strong>Phone:</strong> 1-800-TRU-HEIR</p>
                <p><strong>Address:</strong> VNCI, LLC, 1650 Marietta Boulevard NW Unit D58, Atlanta, GA 30318</p>
              </div>
            </CardContent>
          </Card>

        </div>

        {/* Footer */}
        <div className="text-center mt-16 py-8 border-t border-border">
          <Button
onClick={() => navigateToRoute('/auth')}
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

export default TermsOfService;