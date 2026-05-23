// Program taxonomy + display helpers (FFM is shown as "The Succession Society")

export type ProgramCode = 'fbu' | 'tfv' | 'tfba' | 'tffm'

export const PROGRAM_OPTIONS: { code: ProgramCode; label: string }[] = [
  { code: 'fbu', label: 'Family Business University' },
  { code: 'tfv', label: 'The Family Vault' },
  { code: 'tfba', label: 'The Family Business Accelerator' },
  { code: 'tffm', label: 'The Succession Society' },
]

export const SOP_PROGRAM_CODES: ProgramCode[] = ['tfv', 'tfba', 'tffm']

export function programLabel(code: string): string {
  return PROGRAM_OPTIONS.find(p => p.code === code)?.label || code.toUpperCase()
}

// Map a profile.program_name (long string, possibly comma-separated) to program codes
export function profileProgramCodes(programName?: string | null): ProgramCode[] {
  if (!programName) return []
  const map: Record<string, ProgramCode> = {
    'The Family Business University': 'fbu',
    'Family Business University': 'fbu',
    'The Family Vault': 'tfv',
    'The Family Business Accelerator': 'tfba',
    'The Family Fortune Mastermind': 'tffm',
    'The Succession Society': 'tffm',
  }
  return programName.split(',')
    .map(s => map[s.trim()])
    .filter(Boolean) as ProgramCode[]
}
