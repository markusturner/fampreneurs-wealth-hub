import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Check, Crown, Zap, Rocket } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'

const pricingTiers = [
  {
    name: "Starter",
    price: "$97",
    period: "/month",
    description: "Perfect for individuals getting started with wealth building",
    icon: Zap,
    popular: false,
    features: [
      "AI-powered financial insights",
      "Basic investment tracking",
      "Up to 5 family members",
      "Document storage (10GB)",
      "Basic financial education",
      "Email support",
      "Mobile app access",
      "Monthly wealth reports"
    ],
    stripeAmount: 9700
  },
  {
    name: "Professional",
    price: "$297",
    period: "/month",
    description: "Ideal for growing families with multiple income streams",
    icon: Crown,
    popular: true,
    features: [
      "Everything in Starter",
      "Advanced investment analytics",
      "Unlimited family members",
      "Document storage (100GB)",
      "Advanced courses & webinars",
      "Family meeting tools",
      "Tax optimization insights",
      "Priority support",
      "Custom financial goals",
      "Weekly wealth reports"
    ],
    stripeAmount: 29700
  },
  {
    name: "Enterprise",
    price: "$497",
    period: "/month",
    description: "Complete family office solution for serious wealth builders",
    icon: Rocket,
    popular: false,
    features: [
      "Everything in Professional",
      "Dedicated account manager",
      "Custom integrations",
      "White-label options",
      "Advanced security features",
      "Unlimited document storage",
      "Private community access",
      "1-on-1 strategy calls",
      "Estate planning tools",
      "Real-time alerts",
      "Daily wealth reports"
    ],
    stripeAmount: 49700
  }
]

export const Pricing = () => {
  const handlePurchase = async (amount: number) => {
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { amount }
      })

      if (error) {
        console.error('Error creating checkout:', error)
        return
      }

      if (data?.url) {
        window.open(data.url, '_blank')
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }

  return (
    <section id="pricing" className="py-20 bg-gradient-to-br from-background to-primary/5">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6" style={{ color: '#290A52' }}>
            Choose Your
            <span style={{ color: '#FFB500' }}> Wealth Building</span> Plan
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Professional family office tools at a fraction of traditional costs. No contracts, cancel anytime.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {pricingTiers.map((tier, index) => (
            <Card 
              key={index} 
              className={`relative border-2 transition-all duration-300 hover:shadow-xl ${
                tier.popular 
                  ? 'border-[#FFB500] shadow-lg scale-105' 
                  : 'border-border hover:border-[#290A52]'
              }`}
            >
              {tier.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div className="text-xs font-bold px-4 py-2 rounded-full" style={{ backgroundColor: '#FFB500', color: '#290a52' }}>
                    MOST POPULAR
                  </div>
                </div>
              )}

              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 mx-auto mb-4 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(41, 10, 82, 0.1)' }}>
                  <tier.icon className="w-8 h-8" style={{ color: '#290A52' }} />
                </div>
                <CardTitle className="text-2xl" style={{ color: '#290A52' }}>
                  {tier.name}
                </CardTitle>
                <div className="flex items-baseline justify-center mb-2">
                  <span className="text-4xl font-bold" style={{ color: '#290A52' }}>
                    {tier.price}
                  </span>
                  <span className="text-muted-foreground ml-1">{tier.period}</span>
                </div>
                <CardDescription className="text-center">
                  {tier.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                <ul className="space-y-3">
                  {tier.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start">
                      <Check className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0" style={{ color: '#FFB500' }} />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button 
                  className={`w-full text-lg py-3 font-semibold ${
                    tier.popular 
                      ? '' 
                      : 'border-2'
                  }`}
                  style={{ 
                    backgroundColor: tier.popular ? '#FFB500' : '#290A52',
                    borderColor: tier.popular ? '#FFB500' : '#290A52',
                    color: '#290a52'
                  }}
                  onClick={() => handlePurchase(tier.stripeAmount)}
                >
                  Start Building Wealth
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Money Back Guarantee */}
        <div className="text-center mt-12">
          <div className="inline-flex items-center space-x-2 text-muted-foreground">
            <Check className="w-5 h-5" style={{ color: '#FFB500' }} />
            <span>30-day money-back guarantee</span>
          </div>
          <div className="inline-flex items-center space-x-2 text-muted-foreground ml-8">
            <Check className="w-5 h-5" style={{ color: '#FFB500' }} />
            <span>Cancel anytime</span>
          </div>
          <div className="inline-flex items-center space-x-2 text-muted-foreground ml-8">
            <Check className="w-5 h-5" style={{ color: '#FFB500' }} />
            <span>Bank-level security</span>
          </div>
        </div>
      </div>
    </section>
  )
}