// VIP Weekend Family Protection Workbook helpers

export const isVipWeekendProgram = (programName?: string | null) => /vip weekend/i.test(programName || '')

export type WelcomeSection = 'community' | 'content' | 'dashboard' | 'workbook'

/** Which Welcome page buttons a user sees. */
export function welcomeSections(isAdminOrOwner: boolean, programName?: string | null): WelcomeSection[] {
  if (isAdminOrOwner) return ['community', 'content', 'dashboard', 'workbook']
  if (isVipWeekendProgram(programName)) return ['dashboard', 'workbook']
  return ['community', 'content', 'dashboard']
}

export const COMMODITY_OPTIONS = ['Gold', 'Silver', 'Other precious metals', 'Crypto', 'Oil or gas interests', 'Farm or timber land', 'Other commodities'] as const
export const PERSONAL_RECORD_OPTIONS = ['Government photo ID', 'Social Security card', 'Marriage certificate', 'Divorce decree', "Children's birth certificates", 'Passport', 'Existing will'] as const

export const WORKBOOK_DEFAULTS = {
  has_revocable: 'no',
  rev_name: '',
  rev_date: '',
  rev_state: '',
  rev_trustee: '',
  rev_assets: '',
  rev_attorney: '',
  rev_signed_copy: 'yes',
  real_estate_details: '',
  business_details: '',
  bank_accounts: '',
  retirement_insurance: '',
  commodities: [] as string[],
  commodities_detail: '',
  vehicles_valuables: '',
  debts: '',
  personal_records: [] as string[],
  structure_priority: '',
}

type Form = Record<string, any>
const has = (f: Form, asset: string) => Array.isArray(f.assets) && f.assets.includes(asset)
const filled = (v: any) => typeof v === 'string' && v.trim().length > 0

export interface DocGroup { title: string; items: string[] }

/** Builds the "Documents to Bring" list from what the client told us they own. */
export function documentsToBring(f: Form): DocGroup[] {
  const groups: DocGroup[] = []
  const add = (title: string, items: string[]) => groups.push({ title, items })

  add('Personal', [
    'Government photo ID for you and each person you named as trustee',
    'Social Security card or number for you',
    ...(f.marital_status === 'married' ? ['Marriage certificate'] : []),
    ...(f.marital_status === 'divorced' ? ['Divorce decree and any property settlement'] : []),
    ...(Number(f.kids_count) > 0 ? ["Birth certificates for each child"] : []),
  ])

  if (f.has_revocable === 'yes') add('Your Revocable Trust', [
    'Full signed copy of the revocable trust',
    'Schedule A (list of assets in the trust)',
    'Any changes or amendments',
    'Proof of assets already titled to the trust',
  ])

  if (f.owns_home === 'yes' || has(f, 'Home') || has(f, 'Other real estate') || filled(f.real_estate_details)) add('Real Estate', [
    'Recorded deed for each property',
    'Latest mortgage statement (lender and loan number)',
    'Latest property tax bill',
    'Homeowners insurance policy page',
    ...(/rent|tenant|airbnb|lease/i.test(f.real_estate_details || '') ? ['Current leases and rent records'] : []),
  ])

  if (f.owns_business === 'yes' || has(f, 'Business') || filled(f.business_details)) add('Business', [
    'Articles of Organization or Incorporation',
    'Operating agreement or bylaws',
    'IRS EIN letter',
    'Latest business bank statement',
    'Last 2 years of business tax returns',
  ])

  if (has(f, 'Savings & bank accounts') || filled(f.bank_accounts)) add('Bank Accounts', [
    'Latest statement for each account (bank name and account number)',
  ])

  if (has(f, 'Investments (stocks, crypto, etc.)')) add('Investments', [
    'Latest brokerage statement for each account',
  ])

  if (has(f, 'Retirement accounts') || /401|ira|pension|retire/i.test(f.retirement_insurance || '')) add('Retirement Accounts', [
    'Latest statement for each 401k, IRA, or pension',
    'Current beneficiary form for each account',
  ])

  if (has(f, 'Life insurance') || /policy|insurance|life/i.test(f.retirement_insurance || '')) add('Life Insurance', [
    'Policy declarations page for each policy',
    'Current owner and beneficiary forms',
  ])

  const c: string[] = Array.isArray(f.commodities) ? f.commodities : []
  if (c.length) {
    const items: string[] = []
    if (c.some(x => /gold|silver|metal/i.test(x))) items.push('Purchase receipts or certificates for metals', 'Vault or custodian statement (if stored outside your home)')
    if (c.includes('Crypto')) items.push('Exchange account statements', 'List of wallet addresses (never bring seed phrases or private keys)')
    if (c.includes('Oil or gas interests')) items.push('Mineral deed or lease and latest royalty statement')
    if (c.includes('Farm or timber land')) items.push('Land deed and any farm or timber contracts')
    if (c.includes('Other commodities')) items.push('Proof of purchase and where each item is held')
    add('Commodities', items)
  }

  if (has(f, 'Vehicles') || has(f, 'Other valuables') || filled(f.vehicles_valuables)) add('Vehicles and Valuables', [
    'Vehicle titles (and loan payoff letter if financed)',
    'Appraisals or receipts for art, jewelry, and collectibles',
  ])

  if (f.foreign_assets === 'yes') add('Assets Outside the U.S.', [
    'Proof of ownership for each foreign asset',
    'Latest foreign bank or property statements',
  ])

  if (filled(f.debts)) add('Debts', [
    'Latest statement for each loan or lien',
    'Any court papers for open lawsuits or judgments',
  ])

  return groups
}

export interface StructureNode { key: string; title: string; note: string; assets: string[] }

/** Places the client's assets into our framework: Offshore, then 3 domestic irrevocable trusts, then companies, personal outside. */
export function buildStructure(f: Form): StructureNode[] {
  const family: string[] = []
  const business: string[] = []
  const ministry: string[] = ['Charitable giving and ministry work']
  const companies: string[] = []
  const personal: string[] = []

  if (f.owns_home === 'yes' || has(f, 'Home')) family.push('Primary home')
  if (has(f, 'Other real estate')) family.push('Other real estate')
  if (has(f, 'Savings & bank accounts')) family.push('Savings and bank accounts')
  if (has(f, 'Life insurance')) family.push('Life insurance (trust as owner and beneficiary)')
  if (has(f, 'Vehicles')) family.push('Vehicles')
  if (has(f, 'Other valuables')) family.push('Valuables')
  const c: string[] = Array.isArray(f.commodities) ? f.commodities : []
  c.filter(x => /gold|silver|metal/i.test(x)).forEach(x => family.push(x))
  if (f.owns_business === 'yes' || has(f, 'Business')) {
    business.push('Business ownership')
    companies.push('Holding Company LLC', 'Management Company LLC', 'Operating Company LLC')
  }
  if (has(f, 'Investments (stocks, crypto, etc.)')) business.push('Investments')
  c.filter(x => !/gold|silver|metal/i.test(x)).forEach(x => business.push(x))
  if (has(f, 'Retirement accounts')) personal.push('Retirement accounts (stay personal, trust named as beneficiary)')
  if (f.has_revocable === 'yes') personal.push('Existing revocable trust (assets reviewed for transfer)')

  const nodes: StructureNode[] = []
  if (f.foreign_assets === 'yes') nodes.push({ key: 'offshore', title: 'Offshore Trust', note: 'Sits on top for assets outside the U.S.', assets: ['Foreign assets'] })
  nodes.push(
    { key: 'family', title: 'Private Irrevocable Family Trust', note: 'Holds and protects family assets', assets: family },
    { key: 'ministry', title: '508(c)(1)(a) Ministry Trust', note: 'Giving, ministry, and legacy work', assets: ministry },
    { key: 'business', title: 'Irrevocable Business Trust', note: 'Owns businesses and growth assets', assets: business },
  )
  if (companies.length) nodes.push({ key: 'companies', title: 'Companies under the Business Trust', note: 'Holding, Management, and Operating LLCs', assets: companies })
  if (personal.length) nodes.push({ key: 'personal', title: 'Outside the Trusts', note: 'Stays in your personal name', assets: personal })
  return nodes
}
