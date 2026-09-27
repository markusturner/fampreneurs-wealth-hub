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
  { id: 'demo-a1', name: 'Family Checking', type: 'bank', provider: 'Chase', balance: 48250, lastSync: new Date().toISOString(), status: 'connected', institution: 'Chase' },
  { id: 'demo-a2', name: 'Brokerage Account', type: 'brokerage', provider: 'Fidelity', balance: 1250000, lastSync: new Date().toISOString(), status: 'connected', institution: 'Fidelity' },
  { id: 'demo-a3', name: 'Crypto Wallet', type: 'crypto', provider: 'Coinbase', balance: 145000, lastSync: new Date().toISOString(), status: 'connected', institution: 'Coinbase' },
  { id: 'demo-a4', name: 'Business Operating', type: 'business', provider: 'Wells Fargo', balance: 212400, lastSync: new Date().toISOString(), status: 'connected', institution: 'Wells Fargo' },
]

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
