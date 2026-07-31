export const ENTITY_OPTIONS = [
  'Personal (No Entity)',
  'LLC',
  'LLC (S-Corp Election)',
  'C-Corporation',
  'Holding Company LLC',
  'Holding Company S-Corp',
  'Holding Company C-Corp',
  'Unincorporated Irrevocable Business Trust',
  'Private Irrevocable Family Trust',
  '508(c)(1)(a) Faith-Based Irrevocable Ministry Trust',
  'Revocable Living Trust',
] as const

export type EntityOption = (typeof ENTITY_OPTIONS)[number]

export type ProtectionLevel = 'protected' | 'limited' | 'unprotected'

/** Revocable structures pass assets but do not shield them from creditors. */
const LIMITED = new Set<string>(['Revocable Living Trust'])
const NONE = new Set<string>(['Personal (No Entity)'])

export function getProtectionLevel(entity?: string | null): ProtectionLevel {
  if (!entity || NONE.has(entity)) return 'unprotected'
  if (LIMITED.has(entity)) return 'limited'
  return 'protected'
}

export const PROTECTION_LABEL: Record<ProtectionLevel, string> = {
  protected: 'Protected',
  limited: 'Limited protection',
  unprotected: 'Not protected',
}

export const PROTECTION_CLASS: Record<ProtectionLevel, string> = {
  protected: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  limited: 'bg-amber-100 text-amber-800 border-amber-200',
  unprotected: 'bg-red-100 text-red-800 border-red-200',
}
