import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ChevronDown } from 'lucide-react'
import { useState } from 'react'

const faqs = [
  {
    question: "What makes TruHeirs different from other wealth management tools?",
    answer: "TruHeirs is specifically designed for busy professionals earning $75k+ who want professional family office capabilities without the traditional $1M+ minimums. Our AI-powered platform combines investment tracking, family coordination, and wealth-building education in one comprehensive solution."
  },
  {
    question: "How secure is our family's financial data?",
    answer: "We use bank-level 256-bit SSL encryption, multi-factor authentication, and SOC 2 compliance. Your data is stored in secure, audited data centers with regular security assessments. We never store your banking credentials - we use read-only connections through trusted partners like Plaid."
  },
  {
    question: "Do I need to have millions to get started?",
    answer: "Absolutely not! TruHeirs is designed for growing families. You can start with any amount and scale as your wealth grows. Our platform is perfect for professionals and entrepreneurs who are building wealth, not just managing existing fortunes."
  },
  {
    question: "Can we customize the platform for our family's needs?",
    answer: "Yes! All plans include customizable financial goals, family member roles, and reporting preferences. Our Professional and Enterprise plans offer additional customization options including custom integrations and white-label solutions."
  },
  {
    question: "What support is included with my plan?",
    answer: "All plans include comprehensive documentation and email support. Professional plans include priority support and monthly group webinars. Enterprise plans include a dedicated account manager and 1-on-1 strategy calls."
  },
  {
    question: "How quickly can we see results?",
    answer: "Most families see immediate benefits from consolidated wealth tracking and family coordination. Our AI insights typically provide actionable recommendations within the first week. Long-term wealth building results depend on your goals and strategy implementation."
  },
  {
    question: "Can we involve our existing financial advisors?",
    answer: "Absolutely! TruHeirs is designed to complement your existing team of professionals. You can grant limited access to advisors, CPAs, and estate attorneys, making collaboration seamless while maintaining control of your data."
  },
  {
    question: "What happens if we want to cancel?",
    answer: "You can cancel anytime with no penalties or fees. We offer a 30-day money-back guarantee, and you can export all your data if you decide to leave. We believe in earning your business every month, not locking you in with contracts."
  }
]

export const FAQ = () => {
  const [openItems, setOpenItems] = useState<number[]>([])

  const toggleItem = (index: number) => {
    setOpenItems(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    )
  }

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6" style={{ color: '#290A52' }}>
            Frequently Asked
            <span style={{ color: '#FFB500' }}> Questions</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Everything you need to know about building generational wealth with TruHeirs
          </p>
        </div>

        <div className="max-w-4xl mx-auto space-y-4">
          {faqs.map((faq, index) => (
            <Card key={index} className="border-2 hover:border-[#290A52] transition-colors duration-300">
              <Collapsible>
                <CollapsibleTrigger 
                  className="w-full"
                  onClick={() => toggleItem(index)}
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <CardTitle className="text-left text-lg" style={{ color: '#290A52' }}>
                      {faq.question}
                    </CardTitle>
                    <ChevronDown 
                      className={`w-5 h-5 transition-transform duration-300 ${
                        openItems.includes(index) ? 'rotate-180' : ''
                      }`}
                      style={{ color: '#290A52' }}
                    />
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <p className="text-muted-foreground leading-relaxed">
                      {faq.answer}
                    </p>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          ))}
        </div>

        {/* CTA Section */}
        <div className="text-center mt-16">
          <div className="max-w-2xl mx-auto p-8 rounded-2xl" style={{ backgroundColor: 'rgba(41, 10, 82, 0.1)' }}>
            <h3 className="text-2xl font-bold mb-4" style={{ color: '#290A52' }}>
              Still Have Questions?
            </h3>
            <p className="text-muted-foreground mb-6">
              Our team is here to help you understand how TruHeirs can transform your family's wealth building journey.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="px-6 py-3 text-white font-semibold rounded-lg hover:opacity-90 transition-opacity" style={{ backgroundColor: '#290A52' }}>
                Schedule a Demo
              </button>
              <button className="px-6 py-3 border-2 font-semibold rounded-lg hover:bg-opacity-10 transition-colors" style={{ borderColor: '#2EB2FF', color: '#2EB2FF' }}>
                Contact Support
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}