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
  'Offshore Trust',
  'Operating Company LLC',
  'Management Company LLC',
  'Non-Profit Organization',
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

/** Never show the phrase "Living Trust" to clients. Values stay unchanged so saved records still match. */
export function displayEntityName(entity?: string | null): string {
  if (!entity) return ''
  return entity.replace(/living trust/i, 'Trust').trim()
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

export type StructureLayer = 'offshore' | 'family' | 'ministry' | 'business' | 'nonprofit' | 'holding' | 'management' | 'operating' | 'personal'

/** Places an account owner into a layer of The Unified Trust Structure. */
export function getStructureLayer(entity?: string | null): StructureLayer {
  const e = (entity || '').toLowerCase()
  if (!e || e.startsWith('personal')) return 'personal'
  if (e.includes('offshore')) return 'offshore'
  if (e.includes('ministry') || e.includes('508')) return 'ministry'
  if (e.includes('business trust')) return 'business'
  if (e.includes('non-profit') || e.includes('charity') || e.includes('nonprofit')) return 'nonprofit'
  if (e.includes('trust')) return 'family'
  if (e.includes('holding')) return 'holding'
  if (e.includes('management')) return 'management'
  return 'operating'
}
