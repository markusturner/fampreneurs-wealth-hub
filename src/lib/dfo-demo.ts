import { useSyncExternalStore } from 'react'

// Shared demo-mode flag for the Digital Family Office page (owner/admin only).
// Demo data is never saved anywhere; it only fills the screen for walkthroughs.

let demoMode = false
const listeners = new Set<() => void>()

export function isDfoDemo() {
  return demoMode
}

export function setDfoDemo(value: boolean) {
  demoMode = value
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useDfoDemo() {
  return useSyncExternalStore(subscribe, isDfoDemo)
}

export const DEMO_DFO_ACCOUNTS = [
  { id: 'demo-a1', name: 'Family Checking', account_name: 'Family Checking', type: 'bank', account_type: 'bank', provider: 'Chase', balance: 48250, lastSync: new Date().toISOString(), status: 'connected', institution: 'Chase', owner_entity: 'Turner Family Trust' },
  { id: 'demo-a2', name: 'Brokerage Account', account_name: 'Brokerage Account', type: 'brokerage', account_type: 'brokerage', provider: 'Fidelity', balance: 1250000, lastSync: new Date().toISOString(), status: 'connected', institution: 'Fidelity', owner_entity: 'Turner Family Trust' },
  { id: 'demo-a3', name: 'Crypto Wallet', account_name: 'Crypto Wallet', type: 'crypto', account_type: 'crypto', provider: 'Coinbase', balance: 145000, lastSync: new Date().toISOString(), status: 'connected', institution: 'Coinbase', owner_entity: null },
  { id: 'demo-a4', name: 'Business Operating', account_name: 'Business Operating', type: 'business', account_type: 'business', provider: 'Wells Fargo', balance: 212400, lastSync: new Date().toISOString(), status: 'connected', institution: 'Wells Fargo', owner_entity: 'Legacy Holdings LLC' },
]

export const DEMO_GOVERNANCE = {
  constitutionName: 'The Turner Family Constitution',
  familyConstitution: 'A shared framework for protecting our family, building lasting wealth, and preparing each generation to lead.',
  constitutionDate: '2025-01-15',
  coreValues: ['Faith', 'Family', 'Stewardship', 'Education', 'Service'],
  visionStatement: 'Build a united family that creates opportunity and protects its legacy for generations.',
  missionStatement: 'Make thoughtful decisions together, develop future leaders, and use our resources to strengthen our family and community.',
  wealthPhilosophy: 'Wealth is a tool for freedom, service, education, and responsible ownership. We preserve principal while investing for long-term growth.',
  foundingStory: 'Our family legacy began with entrepreneurship, discipline, and a commitment to create opportunities for the next generation.',
  legacyMilestones: [
    { year: '2008', note: 'Founded the family operating business.' },
    { year: '2021', note: 'Created the family trust and estate plan.' },
    { year: '2025', note: 'Established the family council and constitution.' },
  ],
  quorumPercentage: 75,
  ownershipEligibility: 'Ownership is limited to direct descendants and approved family trusts. Owners must complete annual education and sign the family agreement.',
  familyCouncil: { members: ['Mark Turner', 'Angela Turner', 'Jordan Turner'], cadence: 'Quarterly' },
  educationOverview: 'Every family member completes annual financial, trust, and leadership education.',
  participationGuidelines: 'Members attend quarterly meetings, prepare before votes, and disclose conflicts of interest.',
  philanthropyThesis: 'We support youth education, entrepreneurship, and stable housing in our community.',
  grantmakingPolicy: 'The council reviews grants each quarter and approves them by majority vote.',
}

export const DEMO_HANDOFF = {
  checkin_interval_days: 30,
  grace_period_days: 14,
  last_checkin_at: new Date(Date.now() - 8 * 86400000).toISOString(),
  successor_name: 'Jordan Turner',
  successor_email: 'jordan@example.com',
  successor_phone: '(555) 014-0284',
  release_enabled: true,
  checklist: { documents: true, accounts: true, successor: true, instructions: true, family_meeting: false, access: false },
}

const daysAgo = (n: number) => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().split('T')[0]
}

export const DEMO_DFO_TRANSACTIONS = [
  { id: 'demo-t1', description: 'Client Invoice Payment', amount: 18500, transaction_date: daysAgo(1), category: 'Income', account_name: 'Business Operating', type: 'credit' },
  { id: 'demo-t2', description: 'Whole Foods Market', amount: -214.32, transaction_date: daysAgo(2), category: 'Groceries', account_name: 'Family Checking', type: 'debit' },
  { id: 'demo-t3', description: 'Dividend Payment', amount: 1240.55, transaction_date: daysAgo(3), category: 'Investment Income', account_name: 'Brokerage Account', type: 'credit' },
  { id: 'demo-t4', description: 'Mortgage Payment', amount: -3850, transaction_date: daysAgo(5), category: 'Housing', account_name: 'Family Checking', type: 'debit' },
  { id: 'demo-t5', description: 'Payroll', amount: -9200, transaction_date: daysAgo(7), category: 'Payroll', account_name: 'Business Operating', type: 'debit' },
  { id: 'demo-t6', description: 'Consulting Revenue', amount: 12000, transaction_date: daysAgo(9), category: 'Income', account_name: 'Business Operating', type: 'credit' },
  { id: 'demo-t7', description: 'Delta Airlines', amount: -486.2, transaction_date: daysAgo(11), category: 'Travel', account_name: 'Family Checking', type: 'debit' },
  { id: 'demo-t8', description: 'Transfer to Savings', amount: -5000, transaction_date: daysAgo(14), category: 'Transfer', account_name: 'Family Checking', type: 'debit' },
]
