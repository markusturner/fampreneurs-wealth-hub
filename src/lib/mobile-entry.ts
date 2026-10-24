import { expandProgramCodes, profileProgramCodes } from './programs'
import { isVipWeekendProgram } from './workbook'

type EntryOptions = {
  programName?: string | null
  programs?: string[]
  isAdminOrOwner: boolean
  softwareOnly?: boolean
  familyOfficeOnly?: boolean
  lastCommunity?: string | null
}

export function mobileEntryPath(options: EntryOptions): string {
  if (!options.isAdminOrOwner && isVipWeekendProgram(options.programName)) return '/protection-workbook'
  if (!options.isAdminOrOwner && (options.softwareOnly || options.familyOfficeOnly)) return '/dashboard'
  const assigned = profileProgramCodes(options.programName)
  const eligible = options.isAdminOrOwner ? ['tfv', 'tfba', 'tffm'] : expandProgramCodes([...assigned, ...(options.programs || [])])
  const preferred = options.lastCommunity && eligible.includes(options.lastCommunity) ? options.lastCommunity : assigned[0] || eligible[eligible.length - 1]
  return preferred ? `/workspace-community?program=${preferred}` : '/dashboard'
}