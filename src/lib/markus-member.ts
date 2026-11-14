// Markus AI members get only Markus AI, the Digital Family Office and their own community.
export const MARKUS_COMMUNITY = 'markusai'

export const MARKUS_PLANS = {
  monthly: { label: 'Monthly', price: '$1,000', per: 'per month', amount: 1000 },
  annual: { label: 'Annual', price: '$8,997', per: 'per year', amount: 8997 },
} as const
export type MarkusPlan = keyof typeof MARKUS_PLANS

export function isMarkusMemberProgram(programName?: string | null): boolean {
  if (!programName) return false
  const names = programName.split(',').map((n) => n.trim()).filter(Boolean)
  // Only a Markus-only account is restricted; members of other programs keep their access.
  return names.length > 0 && names.every((n) => /^markus ai$/i.test(n))
}

const ALLOWED_PREFIXES = ['/markus-ai', '/dashboard', '/digital-family-office', '/documents', '/family-constitution', '/calendar', '/members', '/investments', '/profile-settings', '/handoff']

export function markusPathAllowed(pathname: string, search: string): boolean {
  if (pathname === '/workspace-community') return new URLSearchParams(search).get('program') === MARKUS_COMMUNITY
  return ALLOWED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'))
}
