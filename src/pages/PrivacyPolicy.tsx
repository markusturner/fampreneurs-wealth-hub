import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Shield, Eye, Lock, Users, FileText, Mail } from 'lucide-react';
import { navigateToRoute } from '@/utils/navigation';

const PrivacyPolicy = () => {
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
            <Shield className="w-8 h-8" style={{color: '#290A52'}} />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Privacy Policy</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Your privacy and data security are fundamental to our mission. Learn how we protect and handle your family's information.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Last updated: January 29, 2025
          </p>
        </div>

        {/* Content Sections */}
        <div className="max-w-4xl mx-auto space-y-8">
          
          {/* Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" style={{color: '#FFB500'}} />
                Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                TruHeirs by VNCI, LLC ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our family office platform and related services.
              </p>
              <p>
                As a platform designed for managing generational wealth and sensitive family information, we understand the critical importance of maintaining the highest standards of data protection and privacy.
              </p>
            </CardContent>
          </Card>

          {/* Information We Collect */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" style={{color: '#FFB500'}} />
                Information We Collect
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-semibold mb-2">Personal Information</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Name, email address, phone number</li>
                  <li>Profile information and preferences</li>
                  <li>Authentication credentials</li>
                  <li>Family member information and relationships</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Financial Information</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Investment account data (via encrypted connections)</li>
                  <li>Transaction history and patterns</li>
                  <li>Asset allocation and portfolio information</li>
                  <li>Banking information (processed through secure third-party providers)</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Usage Information</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Platform usage patterns and preferences</li>
                  <li>Communication within the platform</li>
                  <li>Document storage and access logs</li>
                  <li>Meeting and calendar data</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* How We Use Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" style={{color: '#FFB500'}} />
                How We Use Your Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full mt-2" style={{backgroundColor: '#FFB500'}}></div>
                  <span>Provide and maintain our family office platform services</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full mt-2" style={{backgroundColor: '#FFB500'}}></div>
                  <span>Generate insights and analytics for your family's financial planning</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full mt-2" style={{backgroundColor: '#FFB500'}}></div>
                  <span>Facilitate secure communication between family members</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full mt-2" style={{backgroundColor: '#FFB500'}}></div>
                  <span>Improve our services through usage analysis</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full mt-2" style={{backgroundColor: '#FFB500'}}></div>
                  <span>Send important service updates and notifications</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full mt-2" style={{backgroundColor: '#FFB500'}}></div>
                  <span>Comply with legal obligations and regulatory requirements</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Data Security */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5" style={{color: '#FFB500'}} />
                Data Security & Protection
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                We implement industry-leading security measures to protect your sensitive family and financial information:
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-semibold">Technical Safeguards</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    <li>End-to-end encryption for all data transmission</li>
                    <li>AES-256 encryption for data at rest</li>
                    <li>Multi-factor authentication</li>
                    <li>Regular security audits and penetration testing</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold">Operational Safeguards</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    <li>Strict access controls and role-based permissions</li>
                    <li>Employee background checks and training</li>
                    <li>Incident response and breach notification procedures</li>
                    <li>Regular data backup and disaster recovery testing</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Information Sharing */}
          <Card>
            <CardHeader>
              <CardTitle>Information Sharing & Disclosure</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                We do not sell, trade, or rent your personal information to third parties. We may share your information only in the following circumstances:
              </p>
              <ul className="space-y-2">
                <li><strong>Service Providers:</strong> Trusted third-party services that help us operate our platform (e.g., cloud hosting, payment processing)</li>
                <li><strong>Legal Requirements:</strong> When required by law, court order, or government request</li>
                <li><strong>Family Members:</strong> Information shared within your family office as configured by your family's access settings</li>
                <li><strong>Business Transfers:</strong> In the event of a merger, acquisition, or sale of assets (with prior notice)</li>
              </ul>
            </CardContent>
          </Card>

          {/* Your Rights */}
          <Card>
            <CardHeader>
              <CardTitle>Your Privacy Rights</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>You have the right to:</p>
              <div className="grid md:grid-cols-2 gap-4">
                <ul className="space-y-2 text-sm">
                  <li>• Access your personal information</li>
                  <li>• Correct inaccurate information</li>
                  <li>• Delete your account and data</li>
                  <li>• Export your data</li>
                </ul>
                <ul className="space-y-2 text-sm">
                  <li>• Opt-out of marketing communications</li>
                  <li>• Restrict certain data processing</li>
                  <li>• File a complaint with supervisory authorities</li>
                  <li>• Receive breach notifications</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" style={{color: '#FFB500'}} />
                Contact Us
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                If you have questions about this Privacy Policy or our privacy practices, please contact us:
              </p>
              <div className="space-y-2">
                <p><strong>Email:</strong> privacy@truheirs.com</p>
                <p><strong>Phone:</strong> 1-800-TRU-HEIR</p>
                <p><strong>Address:</strong> 1650 Marietta Boulevard NW Unit D58, Atlanta, GA 30318</p>
              </div>
              <p className="text-sm text-muted-foreground">
                We will respond to your privacy-related inquiries within 30 days.
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

export default PrivacyPolicy;