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
  freeTrialDays?: number
  isFreeTrial?: boolean
}

export interface DynamicPricing {
  tiers: PricingTier[]
  userStatus: {
    isCommunityMember: boolean
    program: string | null
    hasActiveTrial: boolean
  }
}

export const useDynamicPricing = (): DynamicPricing => {
  const { profile } = useAuth()
  const { subscriptionStatus } = useSubscription()
  
  // Determine user status
  const isCommunityMember = profile?.membership_type === 'community' || 
                           profile?.program_name !== null ||
                           subscriptionStatus.subscribed
  
  const program = profile?.program_name
  const hasActiveTrial = subscriptionStatus.subscribed && 
                        subscriptionStatus.subscription_tier === 'trial'

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

  // Apply dynamic pricing logic
  let pricingTiers: PricingTier[]

  if (program === 'Family Legacy: VIP Weekend Program') {
    // 120-day free trial
    pricingTiers = baseTiers.map((tier, index) => ({
      ...tier,
      price: index === 0 ? "FREE" : ["$97", "$297", "$497"][index],
      period: index === 0 ? "120 days" : "/month",
      stripeAmount: index === 0 ? 0 : [9700, 29700, 49700][index],
      freeTrialDays: 120,
      isFreeTrial: index === 0,
      icon: [() => null, () => null, () => null][index] // Will be set properly in component
    }))
  } else if (program === 'Family Business Accelerator Program') {
    // 90-day free trial
    pricingTiers = baseTiers.map((tier, index) => ({
      ...tier,
      price: index === 0 ? "FREE" : ["$97", "$297", "$497"][index], 
      period: index === 0 ? "90 days" : "/month",
      stripeAmount: index === 0 ? 0 : [9700, 29700, 49700][index],
      freeTrialDays: 90,
      isFreeTrial: index === 0,
      icon: [() => null, () => null, () => null][index]
    }))
  } else if (program === 'The Family Vault Program') {
    // 30-day free trial then $97/mo
    pricingTiers = baseTiers.map((tier, index) => ({
      ...tier,
      price: index === 0 ? "FREE" : ["$97", "$297", "$497"][index],
      period: index === 0 ? "30 days" : "/month", 
      stripeAmount: index === 0 ? 0 : [9700, 29700, 49700][index],
      freeTrialDays: 30,
      isFreeTrial: index === 0,
      icon: [() => null, () => null, () => null][index]
    }))
  } else if (isCommunityMember) {
    // Community member pricing: $97, $297, $497
    pricingTiers = baseTiers.map((tier, index) => ({
      ...tier,
      price: ["$97", "$297", "$497"][index],
      period: "/month",
      stripeAmount: [9700, 29700, 49700][index],
      icon: [() => null, () => null, () => null][index]
    }))
  } else {
    // Default pricing (double): $194, $594, $994
    pricingTiers = baseTiers.map((tier, index) => ({
      ...tier, 
      price: ["$194", "$594", "$994"][index],
      period: "/month",
      stripeAmount: [19400, 59400, 99400][index],
      icon: [() => null, () => null, () => null][index]
    }))
  }

  return {
    tiers: pricingTiers,
    userStatus: {
      isCommunityMember,
      program,
      hasActiveTrial
    }
  }
}