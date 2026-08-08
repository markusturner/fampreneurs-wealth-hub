// Program taxonomy + display helpers (FFM is shown as "The Succession Society")

export type ProgramCode = 'fbu' | 'tfv' | 'tfba' | 'tffm'

export const PROGRAM_OPTIONS: { code: ProgramCode; label: string }[] = [
  { code: 'fbu', label: 'Family Business University' },
  { code: 'tfv', label: 'The Family Vault' },
  { code: 'tfba', label: 'The Private Estate Accelerator' },
  { code: 'tffm', label: 'The Succession Society' },
]

export const SOP_PROGRAM_CODES: ProgramCode[] = ['tfv', 'tfba', 'tffm']

const SHORT_LABELS: Record<string, string> = {
  fbu: 'FBU',
  tfv: 'TFV',
  tfba: 'PEA',
  tffm: 'TFFM',
}

// Short display label for a program code (internal code stays 'tfba')
export function programShortLabel(code?: string | null): string {
  if (!code) return ''
  return SHORT_LABELS[code.toLowerCase()] || code.toUpperCase()
}

export function programLabel(code: string): string {
  return PROGRAM_OPTIONS.find(p => p.code === code)?.label || code.toUpperCase()
}

// Strip variant suffix like " (VIP Weekend)" so classification still works
export function stripProgramVariant(name?: string | null): string {
  return (name || '').replace(/\s*\(([^)]+)\)\s*$/,'').trim()
}

export function getProgramVariant(name?: string | null): string | null {
  const m = (name || '').match(/\(([^)]+)\)\s*$/)
  return m ? m[1].trim() : null
}

// Map a profile.program_name (long string, possibly comma-separated) to program codes
export function profileProgramCodes(programName?: string | null): ProgramCode[] {
  if (!programName) return []
  const map: Record<string, ProgramCode> = {
    'The Family Business University': 'fbu',
    'Family Business University': 'fbu',
    'The Family Vault': 'tfv',
    'The Private Estate Accelerator': 'tfba',
    'The Family Fortune Mastermind': 'tffm',
    'The Succession Society': 'tffm',
  }
  return programName.split(',')
    .map(s => map[stripProgramVariant(s)])
    .filter(Boolean) as ProgramCode[]
}


// Program tiers: a higher tier includes access to everything below it
const PROGRAM_TIERS: ProgramCode[] = ['fbu', 'tfv', 'tfba', 'tffm']

// Expand assigned program codes to include all lower tiers
export function expandProgramCodes(codes: (string | null | undefined)[]): ProgramCode[] {
  const highest = codes
    .filter(Boolean)
    .map(c => PROGRAM_TIERS.indexOf(String(c).toLowerCase() as ProgramCode))
    .filter(i => i >= 0)
    .reduce((max, i) => Math.max(max, i), -1)
  if (highest < 0) return []
  return PROGRAM_TIERS.slice(0, highest + 1)
}

// Community group names (including legacy names) that belong to a program code
export const PROGRAM_GROUP_NAMES: Record<ProgramCode, string[]> = {
  fbu: ['Family Business University', 'The Family Business University'],
  tfv: ['The Family Vault'],
  tfba: ['The Private Estate Accelerator', 'The Family Business Accelerator'],
  tffm: ['The Succession Society', 'The Family Fortune Mastermind'],
}

export function programGroupNames(codes: ProgramCode[]): string[] {
  return codes.flatMap(c => PROGRAM_GROUP_NAMES[c] || [])
}
