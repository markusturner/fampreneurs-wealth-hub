import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Check, Crown, Zap, Rocket } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const pricingIconColors = ['#FF6B6B', '#4ECDC4', '#45B7D1']

const LITE_TIERS = [
  {
    name: 'Lite Monthly',
    price: '$47',
    period: '/month',
    description: 'Flexible monthly billing for FBU community access',
    popular: false,
    plan: 'lite_monthly',
  },
  {
    name: 'Lite Quarterly',
    price: '$127',
    period: '/quarter',
    description: 'Best value — save vs monthly billing',
    popular: true,
    plan: 'lite_quarterly',
  },
  {
    name: 'Lite Annual',
    price: '$547',
    period: '/year',
    description: 'Biggest savings with annual commitment',
    popular: false,
    plan: 'lite_annual',
  },
]

const SHARED_FEATURES = [
  'Family Business University community',
  'Live community discussions & Q&A',
  'Classroom courses & lessons',
  'Group calendar & events',
  'Member directory & networking',
  'Messenger access',
  'Mobile app access',
  'Cancel anytime',
]

export const Pricing = () => {
  const navigate = useNavigate()
  const iconMap = [Zap, Crown, Rocket]

  const handleSelect = (plan: string) => {
    navigate(`/signup?plan=${plan}`)
  }

  return (
    <section id="pricing" className="py-16 md:py-20 bg-gradient-to-br from-background to-primary/5">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 md:mb-6">
            <span style={{ color: 'white' }}>TruHeirs</span>
            <span style={{ color: '#FFB500' }}> Lite</span>
            <span style={{ color: '#2eb2ff' }}> Membership</span>
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
            Get instant access to the Family Business University community. No contracts, cancel anytime.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 max-w-6xl mx-auto">
          {LITE_TIERS.map((tier, index) => {
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
                      BEST VALUE
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
                    {SHARED_FEATURES.map((feature, i) => (
                      <li key={i} className="flex items-start">
                        <Check className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0" style={{ color: '#FFB500' }} />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    className="w-full text-sm md:text-base lg:text-lg py-2 md:py-3 font-semibold"
                    style={{
                      backgroundColor: tier.popular ? '#FFB500' : '#2eb2ff',
                      borderColor: tier.popular ? '#FFB500' : '#2eb2ff',
                      color: '#290a52',
                    }}
                    onClick={() => handleSelect(tier.plan)}
                  >
                    Get Started
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <div className="text-center mt-12">
          <div className="inline-flex items-center space-x-2 text-muted-foreground">
            <Check className="w-5 h-5" style={{ color: '#FFB500' }} />
            <span>Cancel anytime</span>
          </div>
          <div className="inline-flex items-center space-x-2 text-muted-foreground ml-8">
            <Check className="w-5 h-5" style={{ color: '#FFB500' }} />
            <span>Instant access after checkout</span>
          </div>
        </div>
      </div>
    </section>
  )
}
