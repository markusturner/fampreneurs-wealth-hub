import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Check, Crown, Zap, Rocket } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useDynamicPricing } from '@/hooks/useDynamicPricing'
import { CommunityCallBooking } from '@/components/community/CommunityCallBooking'

const pricingIconColors = [
  '#FF6B6B', // Coral red for Starter
  '#4ECDC4', // Teal for Professional  
  '#45B7D1'  // Sky blue for Enterprise
]

export const Pricing = () => {
  const { tiers: pricingTiers } = useDynamicPricing()
  const iconMap = [Zap, Crown, Rocket]
  
  const handlePurchase = async (amount: number, tierIndex: number) => {
    try {
      const billingIntervals = ['month', 'quarter', 'year'];
      const tierNames = ['Starter', 'Professional', 'Enterprise'];
      
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { 
          amount,
          billingInterval: billingIntervals[tierIndex],
          tierName: tierNames[tierIndex]
        }
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
    <section id="pricing" className="py-16 md:py-20 bg-gradient-to-br from-background to-primary/5">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 md:mb-6">
            <span style={{ color: 'white' }}>Choose Your</span>
            <span style={{ color: '#FFB500' }}> Wealth Building</span>
            <span style={{ color: '#2eb2ff' }}> Plan</span>
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
            Professional family office tools at a fraction of traditional costs. No contracts, cancel anytime.
          </p>
        </div>


        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 max-w-6xl mx-auto">
          {pricingTiers.map((tier, index) => {
            const IconComponent = iconMap[index]
            return (
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
                  <div className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-4 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${pricingIconColors[index]}20` }}>
                    <IconComponent className="w-6 h-6 md:w-8 md:h-8" style={{ color: pricingIconColors[index] }} />
                  </div>
                  <CardTitle className="text-xl md:text-2xl" style={{ color: 'white' }}>
                    {tier.name}
                  </CardTitle>
                  <div className="flex items-baseline justify-center mb-2">
                    <span className="text-3xl md:text-4xl font-bold" style={{ color: '#ffb500' }}>
                      {tier.price}
                    </span>
                    <span className="text-muted-foreground ml-1">{tier.period}</span>
                  </div>
                  <CardDescription className="text-center text-sm md:text-base">
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
                    className={`w-full text-sm md:text-base lg:text-lg py-2 md:py-3 font-semibold ${
                      tier.popular 
                        ? '' 
                        : 'border-2'
                    }`}
                    style={{ 
                      backgroundColor: tier.popular ? '#FFB500' : '#2eb2ff',
                      borderColor: tier.popular ? '#FFB500' : '#2eb2ff',
                      color: '#290a52'
                    }}
                    onClick={() => handlePurchase(tier.stripeAmount, index)}
                  >
                    Start Building Wealth
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>


        {/* Features */}
        <div className="text-center mt-12">
          <div className="inline-flex items-center space-x-2 text-muted-foreground">
            <Check className="w-5 h-5" style={{ color: '#FFB500' }} />
            <span>Cancel anytime</span>
          </div>
          <div className="inline-flex items-center space-x-2 text-muted-foreground ml-8">
            <Check className="w-5 h-5" style={{ color: '#FFB500' }} />
            <span>Bank-level security</span>
          </div>
        </div>
      </div>
      <CommunityCallBooking />
    </section>
  )
}