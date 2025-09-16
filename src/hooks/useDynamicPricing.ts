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
  // Shared features for all tiers
  const sharedFeatures = [
    "AI-powered financial insights",
    "Advanced investment analytics", 
    "Unlimited family members",
    "Document storage (100GB)",
    "Advanced courses & webinars",
    "Family meeting tools",
    "Tax optimization insights",
    "Priority support", 
    "Custom financial goals",
    "Mobile app access",
    "Real-time alerts",
    "Weekly wealth reports"
  ]

  // Base pricing structure
  const baseTiers = [
    {
      name: "Starter",
      description: "Full access with monthly billing flexibility",
      popular: false,
      features: sharedFeatures
    },
    {
      name: "Professional", 
      description: "Best value with quarterly billing savings",
      popular: true,
      features: sharedFeatures
    },
    {
      name: "Enterprise",
      description: "Maximum savings with annual commitment", 
      popular: false,
      features: sharedFeatures
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