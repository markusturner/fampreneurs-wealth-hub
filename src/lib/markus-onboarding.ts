// First-login goals form for Markus AI members. Answers are saved once and shared with Markus as a memory.
export const MARKUS_ONBOARDING_PATH = '/markus-ai/start'

export const MARKUS_GOALS = [
  'See everything my family owns in one place',
  'Protect my assets from lawsuits and creditors',
  'Avoid probate and court delays',
  'Pass wealth down to my kids and grandkids',
  'Lower the taxes my family pays',
  'Protect my business',
  'Get my family organized and on the same page',
] as const

export const MARKUS_ASSET_TYPES = [
  'Home or real estate', 'A business', 'Stocks and investments', 'Retirement accounts',
  'Life insurance', 'Crypto', 'Cash and savings', 'Land or farmland',
] as const

export const MARKUS_NET_WORTH = ['Under $500K', '$500K to $1M', '$1M to $5M', '$5M to $10M', 'Over $10M', 'Prefer not to say'] as const
export const MARKUS_TRUST_STATUS = ['Yes, I have a trust', 'I have a will only', 'No, nothing yet', 'Not sure'] as const

export type MarkusOnboardingAnswers = {
  goals: string[]
  assets: string[]
  netWorth: string
  trustStatus: string
  biggestWorry: string
  success90Days: string
}

export const markusOnboardedKey = (userId: string) => `markus_onboarded_${userId}`

export function markusOnboardingErrors(a: MarkusOnboardingAnswers): string | null {
  if (a.goals.length === 0) return 'Pick at least one goal.'
  if (a.assets.length === 0) return 'Pick at least one thing your family owns.'
  if (!a.trustStatus) return 'Tell us if you have a trust today.'
  return null
}

/** Plain summary Markus reads in every chat and call so he already knows the member's goals. */
export function markusOnboardingSummary(a: MarkusOnboardingAnswers): string {
  const lines = [
    `My goals: ${a.goals.join('; ')}.`,
    `What my family owns: ${a.assets.join(', ')}.`,
    a.netWorth ? `Estimated net worth: ${a.netWorth}.` : '',
    `Trust today: ${a.trustStatus}.`,
    a.biggestWorry.trim() ? `My biggest worry: ${a.biggestWorry.trim()}` : '',
    a.success90Days.trim() ? `Success in 90 days looks like: ${a.success90Days.trim()}` : '',
  ]
  return lines.filter(Boolean).join('\n')
}
