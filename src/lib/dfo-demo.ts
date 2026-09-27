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
  { id: 'demo-a4', name: 'Business Operating', account_name: 'Business Operating', type: 'business', account_type: 'business', provider: 'Wells Fargo', balance: 1462400, lastSync: new Date().toISOString(), status: 'connected', institution: 'Wells Fargo', owner_entity: 'Legacy Holdings LLC' },
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

const demoNow = () => new Date().toISOString()

export const DEMO_OFFICE_MEMBERS = [
  { id: 'demo-m1', full_name: 'Sarah Mitchell', email: 'sarah@mitchelladvisory.com', phone: '(555) 210-3345', family_position: 'Family Office Team', office_role: 'Financial Advisor', relationship_to_family: 'Financial Advisor', trust_positions: null, status: 'active', is_invited: true, invitation_sent_at: demoNow(), joined_at: demoNow(), notes: null, added_by: 'demo', created_at: demoNow(), updated_at: demoNow() },
  { id: 'demo-m2', full_name: 'David Chen, Esq.', email: 'dchen@chenlaw.com', phone: '(555) 884-1290', family_position: 'Family Office Team', office_role: 'Estate Attorney', relationship_to_family: 'Estate Attorney', trust_positions: null, status: 'active', is_invited: true, invitation_sent_at: demoNow(), joined_at: demoNow(), notes: null, added_by: 'demo', created_at: demoNow(), updated_at: demoNow() },
  { id: 'demo-m3', full_name: 'Priya Patel, CPA', email: 'priya@patelcpa.com', phone: '(555) 302-7781', family_position: 'Family Office Team', office_role: 'Accountant', relationship_to_family: 'Accountant', trust_positions: null, status: 'active', is_invited: true, invitation_sent_at: demoNow(), joined_at: demoNow(), notes: null, added_by: 'demo', created_at: demoNow(), updated_at: demoNow() },
]

export const DEMO_FAMILY_MEMBERS = [
  { id: 'demo-f1', full_name: 'Mark Turner', email: 'mark@turnerfamily.com', phone: '(555) 101-2001', family_position: 'Head of Family', governance_branch: 'family_council', office_role: null, relationship_to_family: 'Self', trust_positions: ['Chairman'], status: 'active', is_invited: true, invitation_sent_at: demoNow(), joined_at: demoNow(), notes: null, added_by: 'demo', created_at: demoNow(), updated_at: demoNow() },
  { id: 'demo-f2', full_name: 'Angela Turner', email: 'angela@turnerfamily.com', phone: '(555) 101-2002', family_position: 'Spouse', governance_branch: 'family_council', office_role: null, relationship_to_family: 'Spouse', trust_positions: ['Vice Chair'], status: 'active', is_invited: true, invitation_sent_at: demoNow(), joined_at: demoNow(), notes: null, added_by: 'demo', created_at: demoNow(), updated_at: demoNow() },
  { id: 'demo-f3', full_name: 'Jordan Turner', email: 'jordan@turnerfamily.com', phone: '(555) 101-2003', family_position: 'Adult Child', governance_branch: 'family_council', office_role: null, relationship_to_family: 'Son', trust_positions: ['Council Member'], status: 'active', is_invited: true, invitation_sent_at: demoNow(), joined_at: demoNow(), notes: null, added_by: 'demo', created_at: demoNow(), updated_at: demoNow() },
  { id: 'demo-f4', full_name: 'Maya Turner', email: 'maya@turnerfamily.com', phone: '(555) 101-2004', family_position: 'Adult Child', governance_branch: 'family_assembly', office_role: null, relationship_to_family: 'Daughter', trust_positions: ['Voting Member'], status: 'active', is_invited: true, invitation_sent_at: demoNow(), joined_at: demoNow(), notes: null, added_by: 'demo', created_at: demoNow(), updated_at: demoNow() },
  { id: 'demo-f5', full_name: 'Robert Turner Sr.', email: 'robert@turnerfamily.com', phone: '(555) 101-2005', family_position: 'Grandparent', governance_branch: 'council_elders', office_role: null, relationship_to_family: 'Father', trust_positions: ['Elder Advisor'], status: 'active', is_invited: true, invitation_sent_at: demoNow(), joined_at: demoNow(), notes: null, added_by: 'demo', created_at: demoNow(), updated_at: demoNow() },
  { id: 'demo-f6', full_name: 'Elena Turner', email: 'elena@turnerfamily.com', phone: '(555) 101-2006', family_position: 'Grandchild', governance_branch: 'family_assembly', office_role: null, relationship_to_family: 'Granddaughter', trust_positions: ['Voting Member'], status: 'active', is_invited: true, invitation_sent_at: demoNow(), joined_at: demoNow(), notes: null, added_by: 'demo', created_at: demoNow(), updated_at: demoNow() },
]

export const DEMO_DOCUMENTS = [
  'Turner Family Trust Document.pdf', 'Business Trust Document.pdf', 'Tax-Exempt Trust Document.pdf',
  'Power of Attorney.pdf', 'Family Constitution.pdf', 'Trademark Certificate.pdf',
  'Family Trust EIN Letter.pdf', 'Business Trust EIN Letter.pdf', 'Tax-Exempt EIN Letter.pdf',
  'Investment Policy Statement.pdf', 'Estate Plan Summary.pdf', 'Insurance Policies Bundle.pdf',
  'Property Deeds.pdf', 'Operating Agreement - Legacy Holdings LLC.pdf', 'Buy-Sell Agreement.pdf',
  'Legacy Video.mp4', 'The Life-Legacy Letter.pdf', 'Annual Meeting Minutes 2025.pdf',
].map((name, i) => ({
  id: `demo-d${i + 1}`,
  original_filename: name,
  encrypted_filename: `demo/${name}`,
  mime_type: name.endsWith('.mp4') ? 'video/mp4' : 'application/pdf',
  file_size: 500000 + i * 137000,
  classification_level: i % 3 === 0 ? 'confidential' : i % 3 === 1 ? 'restricted' : 'internal',
  created_at: demoNow(),
  last_accessed: demoNow(),
  access_count: (i % 5) + 1,
}))

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
