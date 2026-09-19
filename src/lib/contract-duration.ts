// Program contract durations. Used to auto-create a client's end date
// from their start date once they finish onboarding.
import { profileProgramCodes, getProgramVariant, type ProgramCode } from './programs'

// Duration in days per program code
const PROGRAM_DAYS: Record<ProgramCode, number> = {
  fbu: 365,
  tfv: 112, // 16 weeks
  tfba: 90, // Private Estate Accelerator
  tffm: 365, // Succession Society - 12 months
}

const VIP_DAYS = 90

export function programDurationDays(programName?: string | null): number | null {
  if (!programName) return null
  const variant = (getProgramVariant(programName) || '').toLowerCase()
  if (variant.includes('vip')) return VIP_DAYS
  const codes = profileProgramCodes(programName)
  if (codes.length === 0) return null
  // Highest tier selected drives the duration
  const order: ProgramCode[] = ['fbu', 'tfv', 'tfba', 'tffm']
  const top = codes.reduce((best, c) => (order.indexOf(c) > order.indexOf(best) ? c : best), codes[0])
  return PROGRAM_DAYS[top] ?? null
}

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

// Returns the end date (YYYY-MM-DD) for a program starting on startISO
export function computeContractEndDate(programName?: string | null, startISO?: string | null): string | null {
  const days = programDurationDays(programName)
  if (!days || !startISO) return null
  const start = new Date(`${startISO}T00:00:00`)
  if (isNaN(start.getTime())) return null
  const end = new Date(start.getTime() + days * 86400000)
  return toISODate(end)
}

export function todayISO(): string {
  return toISODate(new Date())
}
