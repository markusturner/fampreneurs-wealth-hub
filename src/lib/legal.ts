// Shared legal/compliance constants and helpers.
// Bump LEGAL_DOCUMENT_VERSION whenever the Terms or Privacy Policy change materially;
// every signed-in member is asked to accept the new version once.
export const LEGAL_DOCUMENT_VERSION = '2026-10-31'
export const LEGAL_EFFECTIVE_DATE = 'October 31, 2026'
export const MINIMUM_AGE = 18
export const PRIVACY_CONTACT_EMAIL = 'info@fampreneurs.com'
export const COMPANY_LEGAL_NAME = 'VNCI, LLC'

export const EDUCATIONAL_DISCLAIMER =
  'Educational only. Not legal, tax, or investment advice. Talk to a licensed attorney, CPA, or financial advisor before acting.'

export const TESTIMONIAL_DISCLOSURE =
  'Results shown are not typical and are not a guarantee. Each person\'s results depend on their own situation, effort, and many outside factors.'

export const SMS_CONSENT_TEXT =
  'I agree to receive account and program text messages from TruHeirs at the number I provide. Consent is not a condition of purchase. Message frequency varies. Message and data rates may apply. Reply STOP to opt out or HELP for help.'

export const REPORT_REASONS = [
  { value: 'spam', label: 'Spam or scam' },
  { value: 'harassment', label: 'Harassment or bullying' },
  { value: 'hate', label: 'Hate speech' },
  { value: 'sexual', label: 'Sexual or explicit content' },
  { value: 'violence', label: 'Violence or threats' },
  { value: 'privacy', label: 'Shares private information' },
  { value: 'copyright', label: 'Copyright or trademark' },
  { value: 'misleading', label: 'False or misleading advice' },
  { value: 'other', label: 'Something else' },
] as const

export type ConsentType =
  | 'terms_privacy'
  | 'age_18_plus'
  | 'email_marketing'
  | 'sms'
  | 'push'

/** Whole years between a YYYY-MM-DD birth date and `today`. Returns null for invalid input. */
export function ageOn(birthDate: string, today: Date = new Date()): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate)
  if (!match) return null
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])]
  const born = new Date(Date.UTC(y, m - 1, d))
  if (born.getUTCFullYear() !== y || born.getUTCMonth() !== m - 1 || born.getUTCDate() !== d) return null
  const ty = today.getUTCFullYear(), tm = today.getUTCMonth(), td = today.getUTCDate()
  let age = ty - y
  if (tm < m - 1 || (tm === m - 1 && td < d)) age -= 1
  if (age < 0 || age > 130) return null
  return age
}

/** True only when the birth date is valid and the person is at least MINIMUM_AGE. */
export function isAdult(birthDate: string, today: Date = new Date()): boolean {
  const age = ageOn(birthDate, today)
  return age !== null && age >= MINIMUM_AGE
}

/** Routes that must stay readable without accepting the Terms (the documents themselves, sign-in). */
export const CONSENT_EXEMPT_ROUTES = [
  '/', '/auth', '/auth/family', '/signup', '/apply', '/thank-you', '/reset-password',
  '/privacy-policy', '/terms-of-service', '/cookie-policy', '/community-guidelines',
  '/dmca', '/disclaimer', '/security', '/contact-support',
]

export function isConsentExemptRoute(pathname: string): boolean {
  return CONSENT_EXEMPT_ROUTES.includes(pathname) || pathname.startsWith('/invite/') || pathname.startsWith('/survey')
}
