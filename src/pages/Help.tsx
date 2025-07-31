import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { NavHeader } from "@/components/dashboard/nav-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, HelpCircle, CheckCircle, XCircle, Mail, Phone, MessageSquare } from 'lucide-react'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

const faqs = [
  {
    id: "billing",
    question: "How does billing work?",
    answer: "We offer monthly and annual subscription plans. You'll be charged automatically based on your selected plan.",
    category: "Billing"
  },
  {
    id: "features",
    question: "What features are included?",
    answer: "Your subscription includes access to courses, community features, coaching sessions, and investment tracking tools.",
    category: "Features"
  },
  {
    id: "support",
    question: "How do I get technical support?",
    answer: "You can reach our support team through the contact information provided or through the in-app messaging system.",
    category: "Support"
  },
  {
    id: "account",
    question: "How do I manage my account?",
    answer: "Go to Profile Settings to update your personal information, subscription details, and account preferences.",
    category: "Account"
  },
  {
    id: "courses",
    question: "How do course progressions work?",
    answer: "Videos unlock sequentially - you must complete the previous video to access the next one, similar to Netflix series.",
    category: "Courses"
  },
  {
    id: "coaching",
    question: "How do I schedule coaching sessions?",
    answer: "Visit the Calendar tab to view available coaching sessions and join group calls or schedule individual sessions.",
    category: "Coaching"
  },
  {
    id: "community",
    question: "How do community groups work?",
    answer: "Join groups to access specific courses and discussions. Premium groups require an active subscription.",
    category: "Community"
  },
  {
    id: "investments",
    question: "How do I track my investments?",
    answer: "Use the Family Office tab to add and monitor your investment portfolio, view analytics, and track performance.",
    category: "Investments"
  }
]

const Help = () => {
  const navigate = useNavigate()
  const [resolvedQuestions, setResolvedQuestions] = useState<Record<string, boolean>>({})

  const handleYesClick = (questionId: string) => {
    setResolvedQuestions(prev => ({ ...prev, [questionId]: true }))
  }

  const handleNoClick = () => {
    navigate('/contact')
  }

  const categories = [...new Set(faqs.map(faq => faq.category))]

  return (
    <div className="min-h-screen bg-background">
      <NavHeader />
      
      <main className="container max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/community')}
            className="mb-4 gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-2">Help Center</h1>
            <p className="text-muted-foreground">
              Find answers to frequently asked questions
            </p>
          </div>
        </div>

        <div className="grid gap-6">
          {categories.map((category) => (
            <Card key={category}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HelpCircle className="h-5 w-5" />
                  {category}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {faqs
                    .filter(faq => faq.category === category)
                    .map((faq) => (
                      <AccordionItem key={faq.id} value={faq.id}>
                        <AccordionTrigger className="text-left">
                          <div className="flex items-center gap-2">
                            {faq.question}
                            {resolvedQuestions[faq.id] && (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Resolved
                              </Badge>
                            )}
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-4">
                            <p className="text-muted-foreground">{faq.answer}</p>
                            
                            {!resolvedQuestions[faq.id] && (
                              <div className="border-t pt-4">
                                <p className="text-sm font-medium mb-3">Did this answer your question?</p>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() => handleYesClick(faq.id)}
                                    className="gap-2"
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                    Yes
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={handleNoClick}
                                    className="gap-2"
                                  >
                                    <XCircle className="h-4 w-4" />
                                    No
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                </Accordion>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Still need help?</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              If you couldn't find what you're looking for, don't hesitate to reach out to our support team.
            </p>
            <Button onClick={handleNoClick} className="gap-2">
              <MessageSquare className="h-4 w-4" />
              Contact Support
            </Button>
          </CardContent>
        </Card>
      </main>
      
      {/* Mobile Bottom Navigation */}
      <div className="pb-16 md:pb-0" />
    </div>
  )
}

export default Help