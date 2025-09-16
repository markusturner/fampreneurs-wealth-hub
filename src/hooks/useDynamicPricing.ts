import { useAuth } from '@/contexts/AuthContext'
import { useSubscription } from '@/hooks/useSubscription'

export interface PricingTier {
  name: string
  price: string
  period: string
  description: string
  icon: any
  popular: boolean
  features: string[]
  stripeAmount: number
}

export interface DynamicPricing {
  tiers: PricingTier[]
}

export const useDynamicPricing = (): DynamicPricing => {
  // Base pricing structure
  const baseTiers = [
    {
      name: "Starter",
      description: "Perfect for individuals getting started with wealth building",
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
      ]
    },
    {
      name: "Professional", 
      description: "Ideal for growing families with multiple income streams",
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
      ]
    },
    {
      name: "Enterprise",
      description: "Complete family office solution for serious wealth builders", 
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
      ]
    }
  ]

  // Updated pricing structure: $97/mo, $247/quarter, $897/annual
  const pricingTiers: PricingTier[] = baseTiers.map((tier, index) => ({
    ...tier,
    price: ["$97", "$247", "$897"][index],
    period: ["/month", "/quarter", "/annual"][index],
    stripeAmount: [9700, 24700, 89700][index],
    icon: [() => null, () => null, () => null][index]
  }))

  return {
    tiers: pricingTiers
  }
}