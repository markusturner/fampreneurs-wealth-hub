import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Mail, Phone, MessageSquare, Clock, Send } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

const ContactSupport = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.name || !formData.email || !formData.message) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    // Simulate form submission
    toast({
      title: "Message Sent",
      description: "Your support request has been submitted. We'll get back to you within 24 hours.",
    });

    // Reset form
    setFormData({
      name: '',
      email: '',
      subject: '',
      message: ''
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Landing Page Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <Button variant="ghost" onClick={() => navigate('/')} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Button>
          <div className="ml-auto">
            <Button 
              onClick={() => navigate('/auth')}
              className="bg-primary text-primary-foreground hover:opacity-90"
            >
              Sign In
            </Button>
          </div>
        </div>
      </header>
      
      <main className="container max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            <span style={{ color: '#2eb2ff' }}>Contact</span>
            <span style={{ color: '#FFB500' }}> Support</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            We're here to help! Send us a message and we'll get back to you as soon as possible.
          </p>
        </div>

        <div className="grid gap-12 lg:grid-cols-3">
          {/* Contact Form */}
          <div className="lg:col-span-2">
            <Card className="border-2 hover:border-primary transition-colors duration-300">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl text-white">
                  <MessageSquare className="h-6 w-6" style={{ color: '#ffb500' }} />
                  Send us a message
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium mb-2">
                        Full Name *
                      </label>
                      <Input
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        placeholder="Enter your full name"
                        required
                        className="h-12"
                      />
                    </div>
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium mb-2">
                        Email Address *
                      </label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        placeholder="Enter your email"
                        required
                        className="h-12"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="subject" className="block text-sm font-medium mb-2">
                      Subject
                    </label>
                    <Input
                      id="subject"
                      name="subject"
                      value={formData.subject}
                      onChange={handleInputChange}
                      placeholder="Brief description of your inquiry"
                      className="h-12"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="message" className="block text-sm font-medium mb-2">
                      Message *
                    </label>
                    <Textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleInputChange}
                      placeholder="Please describe your question or issue in detail..."
                      rows={6}
                      required
                      className="resize-none"
                    />
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full gap-2 h-12 text-lg bg-primary text-primary-foreground"
                  >
                    <Send className="h-5 w-5" />
                    Send Message
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Contact Information */}
          <div className="space-y-6">
            <Card className="border-2 hover:border-[#2EB2FF] transition-colors duration-300">
              <CardHeader>
                <CardTitle className="flex items-center gap-2" style={{ color: '#2EB2FF' }}>
                  <Mail className="h-5 w-5" />
                  Email Support
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Send us an email directly:
                </p>
                <p style={{ color: '#ffb500' }} className="font-semibold text-lg mb-4">
                  info@fampreneurs.com
                </p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  Response within 24 hours
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-[#FFB500] transition-colors duration-300">
              <CardHeader>
                <CardTitle className="flex items-center gap-2" style={{ color: '#FFB500' }}>
                  <Phone className="h-5 w-5" />
                  Phone Support
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Call our support line:
                </p>
                <p className="font-semibold text-lg mb-4 text-primary">
                  +1 (470) 432-0220
                </p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  Monday - Friday: 9:00 AM - 6:00 PM EST
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-primary transition-colors duration-300">
              <CardHeader>
                <CardTitle className="text-primary">Get Started Today</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Ready to transform your family's wealth building journey?
                </p>
                <Button 
                  className="w-full bg-secondary text-secondary-foreground" 
                  onClick={() => navigate('/auth')}
                >
                  Start Your Free Trial
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-20">
          <div className="max-w-4xl mx-auto p-12 rounded-2xl bg-primary/10">
            <h3 className="text-3xl font-bold mb-6 text-secondary">
              Join Thousands of Families Building Generational Wealth
            </h3>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Start your journey with TruHeirs today and give your family the tools they need to build lasting wealth.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                onClick={() => navigate('/auth')}
                className="px-8 py-4 text-lg font-semibold rounded-lg hover:opacity-90 transition-opacity bg-primary text-primary-foreground"
              >
                Get Started Free
              </Button>
              <Button 
                onClick={() => navigate('/')}
                className="px-8 py-4 border-2 font-semibold rounded-lg hover:bg-opacity-10 transition-colors text-lg border-blue-500 text-blue-500" 
                variant="outline"
              >
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ContactSupport;
