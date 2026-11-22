import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Briefcase, CheckCircle2, Download } from 'lucide-react'

// The bookkeeping columns come from migration 20261122000000_bookkeeping_review.sql
// and are not in the generated Supabase types yet, so rows are typed locally.
interface BkAccount {
  id: string
  account_name: string
  account_purpose: 'personal' | 'business'
}

interface BkTransaction {
  id: string
  account_id: string
  description: string | null
  merchant_name: string | null
  amount: number
  transaction_type: string | null
  category: string | null
  transaction_date: string
  review_status: 'needs_review' | 'reviewed'
}

const DEFAULT_CATEGORIES = [
  'Income', 'Business', 'Food & Dining', 'Shopping', 'Transportation', 'Utilities',
  'Insurance', 'Taxes', 'Loans', 'Education', 'Healthcare', 'Home', 'Other',
]

// Single place that decides money direction. credit = money in, debit = money out.
// If Teller's sign convention needs flipping, fix it in _shared/teller.ts, not here.
const isIncome = (t: BkTransaction) => t.transaction_type === 'credit'
const isExpense = (t: BkTransaction) => t.transaction_type === 'debit'

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

function monthOptions() {
  const out: { value: string; label: string }[] = []
  const d = new Date()
  d.setDate(1)
  for (let i = 0; i < 12; i++) {
    out.push({
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleString('en-US', { month: 'long', year: 'numeric' }),
    })
    d.setMonth(d.getMonth() - 1)
  }
  return out
}

export function BookkeepingReview() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [accounts, setAccounts] = useState<BkAccount[]>([])
  const [txns, setTxns] = useState<BkTransaction[]>([])
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES)
  const [loading, setLoading] = useState(true)
  const months = useMemo(monthOptions, [])
  const [month, setMonth] = useState(months[0].value)
  const db = supabase as any

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const yearStart = new Date(Date.now() - 366 * 86400000).toISOString().split('T')[0]
    const [acc, tx, cats] = await Promise.all([
      db.from('connected_accounts').select('id, account_name, account_purpose').eq('user_id', user.id),
      db.from('account_transactions')
        .select('id, account_id, description, merchant_name, amount, transaction_type, category, transaction_date, review_status')
        .eq('user_id', user.id)
        .gte('transaction_date', yearStart)
        .order('transaction_date', { ascending: false })
        .limit(3000),
      db.from('transaction_categories').select('name'),
    ])
    if (acc.error || tx.error) {
      toast({ title: 'Bookkeeping unavailable', description: 'Run the latest database migration, then refresh.', variant: 'destructive' })
    }
    setAccounts((acc.data || []) as BkAccount[])
    setTxns((tx.data || []) as BkTransaction[])
    const names = (cats.data || []).map((c: { name: string }) => c.name).filter(Boolean)
    if (names.length) setCategories(Array.from(new Set([...names, 'Other'])))
    setLoading(false)
  }, [user, db, toast])

  useEffect(() => { load() }, [load])

  const businessIds = useMemo(
    () => new Set(accounts.filter(a => a.account_purpose === 'business').map(a => a.id)),
    [accounts],
  )
  const businessTxns = useMemo(() => txns.filter(t => businessIds.has(t.account_id)), [txns, businessIds])
  const queue = businessTxns.filter(t => t.review_status === 'needs_review').slice(0, 50)

  const setPurpose = async (id: string, purpose: 'personal' | 'business') => {
    setAccounts(prev => prev.map(a => (a.id === id ? { ...a, account_purpose: purpose } : a)))
    const { error } = await db.from('connected_accounts').update({ account_purpose: purpose }).eq('id', id)
    if (error) {
      toast({ title: 'Could not update account', description: error.message, variant: 'destructive' })
      load()
    }
  }

  const approve = async (ids: string[], category?: string) => {
    if (!ids.length) return
    const patch: Record<string, unknown> = { review_status: 'reviewed', reviewed_at: new Date().toISOString() }
    if (category) patch.category = category
    const { error } = await db.from('account_transactions').update(patch).in('id', ids)
    if (error) {
      toast({ title: 'Could not save review', description: error.message, variant: 'destructive' })
      return
    }
    setTxns(prev =>
      prev.map(t => (ids.includes(t.id)
        ? { ...t, review_status: 'reviewed', category: category ?? t.category }
        : t)),
    )
  }

  const monthTxns = businessTxns.filter(t => t.transaction_date.startsWith(month))
  const income: Record<string, number> = {}
  const expenses: Record<string, number> = {}
  let totalIncome = 0
  let totalExpenses = 0
  monthTxns.forEach(t => {
    const cat = t.category || 'Uncategorized'
    const amt = Math.abs(Number(t.amount) || 0)
    if (isIncome(t)) { income[cat] = (income[cat] || 0) + amt; totalIncome += amt }
    else if (isExpense(t)) { expenses[cat] = (expenses[cat] || 0) + amt; totalExpenses += amt }
  })
  const unreviewedInMonth = monthTxns.filter(t => t.review_status === 'needs_review').length

  const exportCsv = () => {
    const rows = [['Date', 'Description', 'Category', 'Type', 'Amount', 'Status']].concat(
      monthTxns.map(t => [
        t.transaction_date,
        `"${(t.description || t.merchant_name || '').replace(/"/g, '""')}"`,
        t.category || 'Uncategorized',
        isIncome(t) ? 'Income' : isExpense(t) ? 'Expense' : 'Other',
        String(Math.abs(Number(t.amount) || 0)),
        t.review_status,
      ]),
    )
    const blob = new Blob([rows.map(r => r.join(',')).join('\n')], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `business-transactions-${month}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const lines = (data: Record<string, number>) =>
    Object.entries(data).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => (
      <div key={cat} className="flex justify-between text-sm py-1">
        <span className="truncate pr-2">{cat}</span>
        <span className="tabular-nums">{fmt(amt)}</span>
      </div>
    ))

  if (loading) return <Card><CardContent className="p-6 text-sm text-muted-foreground">Loading bookkeeping…</CardContent></Card>

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base"><Briefcase className="h-4 w-4" /> Which accounts are business?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {accounts.length === 0 && <p className="text-sm text-muted-foreground">Connect a bank account first, then mark it business or personal here.</p>}
          {accounts.map(a => (
            <div key={a.id} className="flex items-center justify-between gap-2">
              <span className="text-sm truncate">{a.account_name}</span>
              <Select value={a.account_purpose} onValueChange={v => setPurpose(a.id, v as 'personal' | 'business')}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="personal">Personal</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ))}
        </CardContent>
      </Card>

      {businessIds.size > 0 && (
        <>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base">Needs review <Badge variant="secondary">{businessTxns.filter(t => t.review_status === 'needs_review').length}</Badge></CardTitle>
                {queue.length > 0 && (
                  <Button size="sm" variant="outline" onClick={() => approve(queue.map(t => t.id))}>
                    <CheckCircle2 className="h-4 w-4 mr-1" /> Approve {queue.length}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {queue.length === 0 && <p className="text-sm text-muted-foreground">All caught up.</p>}
              {queue.map(t => (
                <div key={t.id} className="rounded-lg border p-3 space-y-2">
                  <div className="flex justify-between gap-2 text-sm">
                    <span className="truncate">{t.merchant_name || t.description || 'Transaction'}</span>
                    <span className={`tabular-nums ${isIncome(t) ? 'text-green-600' : ''}`}>
                      {isIncome(t) ? '+' : '-'}{fmt(Math.abs(Number(t.amount) || 0))}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">{t.transaction_date}</div>
                  <div className="flex gap-2">
                    <Select value={t.category || 'Other'} onValueChange={v => approve([t.id], v)}>
                      <SelectTrigger className="h-8 flex-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button size="sm" onClick={() => approve([t.id])}>Approve</Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base">Business P&amp;L</CardTitle>
                <div className="flex gap-2">
                  <Select value={month} onValueChange={setMonth}>
                    <SelectTrigger className="w-40 h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="outline" onClick={exportCsv}><Download className="h-4 w-4" /></Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="font-medium text-sm mb-1">Income <span className="float-right tabular-nums">{fmt(totalIncome)}</span></div>
                {lines(income)}
              </div>
              <div>
                <div className="font-medium text-sm mb-1">Expenses <span className="float-right tabular-nums">{fmt(totalExpenses)}</span></div>
                {lines(expenses)}
              </div>
              <div className="border-t pt-2 font-semibold flex justify-between">
                <span>Net profit</span>
                <span className={`tabular-nums ${totalIncome - totalExpenses < 0 ? 'text-red-600' : ''}`}>{fmt(totalIncome - totalExpenses)}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {unreviewedInMonth > 0
                  ? `${unreviewedInMonth} transaction(s) this month are still unreviewed, so these numbers may change. `
                  : ''}
                Categories are automatic and have not been reviewed by a CPA. Not tax advice.
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
