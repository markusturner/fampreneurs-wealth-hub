import { describe, expect, it } from 'vitest'
import { isConsentExemptRoute } from '../src/lib/legal'
import { MARKUS_ONBOARDING_PATH, markusOnboardingErrors, markusOnboardingSummary } from '../src/lib/markus-onboarding'

const base = { goals: ['Protect my business'], assets: ['A business'], netWorth: '', trustStatus: 'No, nothing yet', biggestWorry: '', success90Days: '' }

describe('Markus AI onboarding', () => {
  it('requires at least one goal', () => {
    expect(markusOnboardingErrors({ ...base, goals: [] })).toBe('Pick at least one goal.')
  })
  it('requires at least one asset type', () => {
    expect(markusOnboardingErrors({ ...base, assets: [] })).toBe('Pick at least one thing your family owns.')
  })
  it('accepts a complete form', () => {
    expect(markusOnboardingErrors(base)).toBeNull()
  })
  it('gives Markus the member goals as a memory', () => {
    expect(markusOnboardingSummary(base)).toContain('My goals: Protect my business.')
  })
  it('collects Terms inside the onboarding page instead of the popup', () => {
    expect(isConsentExemptRoute(MARKUS_ONBOARDING_PATH)).toBe(true)
  })
})
