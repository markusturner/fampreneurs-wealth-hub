import { Badge } from "@/components/ui/badge"
import { Building2, Calendar, DollarSign, PieChart, Users, FileText, ArrowUpRight, ArrowDownRight, UserPlus, CreditCard } from "lucide-react"
import { useEffect, useState } from "react"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/contexts/AuthContext"
import { DEMO_DFO_ACCOUNTS, DEMO_OFFICE_MEMBERS, DEMO_FAMILY_MEMBERS, DEMO_DOCUMENTS, useDfoDemo } from '@/lib/dfo-demo'
import { displayEntityName } from "@/lib/entities"

const DATE_RANGES = [
  { value: 'mtd', label: 'Month-to-date', compare: 'last month' },
  { value: 'qtd', label: 'Quarter-to-date', compare: 'last quarter' },
  { value: 'ytd', label: 'Year-to-date', compare: 'last year' },
  { value: 'l12m', label: 'Last 12 months', compare: 'the prior 12 months' },
]

export function DashboardStats() {
  const { user } = useAuth()
  const demoMode = useDfoDemo()
  const [documentCount, setDocumentCount] = useState(0)
  const [familyOfficeMemberCount, setFamilyOfficeMemberCount] = useState(0)
  const [familyMemberCount, setFamilyMemberCount] = useState(0)
  const [connectedAccountsCount, setConnectedAccountsCount] = useState(0)
  const [accountsData, setAccountsData] = useState<{ balance: number; account_type?: string; owner_entity?: string | null }[]>([])
  const [selectedTrust, setSelectedTrust] = useState('all')
  const [selectedRange, setSelectedRange] = useState('qtd')
  const financialAdvisorCount = familyOfficeMemberCount
  const [portfolioData, setPortfolioData] = useState({
    totalValue: 0,
    dayChange: 0,
    dayChangePercent: 0,
    activeInvestments: 0,
    connectedAccounts: 0
  })

  useEffect(() => {
    if (!user) return

    const fetchCounts = async () => {
      if (user?.id) {
        const userDocumentKey = `uploadedDocuments_${user.id}`
        const globalDocumentKey = 'uploadedDocuments'
        let uploadedDocuments = localStorage.getItem(userDocumentKey)
        if (!uploadedDocuments) {
          uploadedDocuments = localStorage.getItem(globalDocumentKey)
        }
        if (uploadedDocuments) {
          try {
            const parsed = JSON.parse(uploadedDocuments)
            setDocumentCount(Object.keys(parsed).length)
          } catch {
            setDocumentCount(0)
          }
        } else {
          setDocumentCount(0)
        }
      }

      const { data: allMembers, error: membersError } = await supabase
        .from('family_members')
        .select('office_role, family_position, status')
        .eq('added_by', user.id)
      
      if (!membersError && allMembers) {
        const officeList = allMembers.filter((m: any) => m.office_role !== null || m.family_position === 'Family Office Team')
        const familyList = allMembers.filter((m: any) => m.office_role === null && m.family_position !== 'Family Office Team' && m.status !== 'inactive')
        setFamilyOfficeMemberCount(officeList.length)
        setFamilyMemberCount(familyList.length)
      }

      const { count: accountsCount, error: accountsError } = await supabase
        .from('connected_accounts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
      
      if (!accountsError && accountsCount !== null) {
        setConnectedAccountsCount(accountsCount)
      }

      const { data: accountsDataResult, error: accountsDataError } = await supabase
        .from('connected_accounts')
        .select('balance, account_type, owner_entity')
        .eq('user_id', user.id)

      if (!accountsDataError && accountsDataResult) {
        // Cash & Bank only: exclude brokerage/investment accounts so they are not counted twice
        setAccountsData(accountsDataResult as any[])
      }

      const { data: portfolios, error: portfolioError } = await supabase
        .from('investment_portfolios')
        .select('total_value, day_change, day_change_percent, positions')
        .eq('user_id', user.id)
      
      if (!portfolioError && portfolios) {
        const totalValue = portfolios.reduce((sum, p) => sum + Number(p.total_value), 0)
        const totalDayChange = portfolios.reduce((sum, p) => sum + Number(p.day_change || 0), 0)
        const totalPositions = portfolios.reduce((sum, p) => sum + (Array.isArray(p.positions) ? p.positions.length : 0), 0)
        const weightedChangePercent = totalValue > 0 
          ? (totalDayChange / (totalValue - totalDayChange)) * 100
          : 0

        setPortfolioData({
          totalValue,
          dayChange: totalDayChange,
          dayChangePercent: weightedChangePercent,
          activeInvestments: totalPositions,
          connectedAccounts: portfolios.length
        })
      }
    }

    fetchCounts()
  }, [user])

  const isInvestmentAccount = (a: any) => {
    const t = (a.account_type || a.type || '').toLowerCase()
    return t === 'brokerage' || t === 'investment'
  }
  const entityOf = (a: any) => a.owner_entity ?? 'Personal (No Entity)'
  const matchesTrust = (a: any) => selectedTrust === 'all' || entityOf(a) === selectedTrust

  const demoAccounts = DEMO_DFO_ACCOUNTS.filter(matchesTrust)
  const liveAccounts = accountsData.filter(matchesTrust)
  const investmentValue = demoMode
    ? demoAccounts.filter(isInvestmentAccount).reduce((s: number, a: any) => s + Number(a.balance || 0), 0)
    : selectedTrust === 'all'
      ? portfolioData.totalValue
      : liveAccounts.filter(isInvestmentAccount).reduce((s: number, a: any) => s + Number(a.balance || 0), 0)
  const cashAndBank = demoMode
    ? demoAccounts.filter((a) => !isInvestmentAccount(a)).reduce((sum, account) => sum + account.balance, 0)
    : selectedTrust === 'all'
      ? accountsData.filter((a: any) => !isInvestmentAccount(a)).reduce((s: number, a: any) => s + Number(a.balance || 0), 0)
      : liveAccounts.filter((a: any) => !isInvestmentAccount(a)).reduce((s: number, a: any) => s + Number(a.balance || 0), 0)
  // Hero value is always the sum of the two sections, so the numbers never double-count
  const combinedTotal = investmentValue + cashAndBank
  const hasFinancialData = combinedTotal > 0

  const trustOptions = Array.from(
    new Set(
      (demoMode ? DEMO_DFO_ACCOUNTS : accountsData).map((a: any) => entityOf(a))
    )
  )
  const selectedRangeMeta = DATE_RANGES.find((r) => r.value === selectedRange) || DATE_RANGES[1]
  const investmentTrend = demoMode || portfolioData.dayChangePercent >= 0 ? 'up' : 'down'
  const investmentChangeLabel = demoMode ? '+3% today' : `${Math.abs(portfolioData.dayChangePercent).toFixed(1)}% today`

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const hero = {
    title: "Net Worth",
    value: hasFinancialData ? formatCurrency(combinedTotal) : "$0",
    change: hasFinancialData ? formatCurrency(demoMode ? 12840 : portfolioData.dayChange) : "Connect accounts",
    trend: demoMode || portfolioData.dayChange >= 0 ? "up" : "down",
    icon: DollarSign,
    description: hasFinancialData ? "Connected accounts & investments" : "Connect accounts to see your value",
  }

  const stats = [
    {
      title: "Investments",
      value: demoMode ? '4' : connectedAccountsCount > 0 ? `${portfolioData.activeInvestments + connectedAccountsCount}` : "0",
      icon: PieChart,
    },
    {
      title: "Office Members",
      value: demoMode ? String(DEMO_OFFICE_MEMBERS.length) : familyOfficeMemberCount.toString(),
      icon: Users,
    },
    {
      title: "Family Members",
      value: demoMode ? String(DEMO_FAMILY_MEMBERS.length) : familyMemberCount.toString(),
      icon: UserPlus,
    },
    {
      title: "Documents",
      value: demoMode ? String(DEMO_DOCUMENTS.length) : documentCount.toString(),
      icon: FileText,
    },
  ]

  const TrendIcon = hero.trend === "up" ? ArrowUpRight : ArrowDownRight
  const InvestmentTrendIcon = investmentTrend === "up" ? ArrowUpRight : ArrowDownRight

  return (
    <div className="space-y-4">
      {/* Trust + date filters, above the value cards */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="glass-card rounded-xl px-3 py-2 flex items-center gap-2">
          <Building2 className="h-4 w-4 text-primary" />
          <select
            value={selectedTrust}
            onChange={(e) => setSelectedTrust(e.target.value)}
            className="bg-transparent text-sm font-medium text-foreground outline-none cursor-pointer"
            aria-label="Filter by trust"
          >
            <option value="all">All Trusts</option>
            {trustOptions.map((t) => (
              <option key={t} value={t}>{displayEntityName(t) || t}</option>
            ))}
          </select>
        </div>
        <div className="glass-card rounded-xl px-3 py-2 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-accent" />
          <select
            value={selectedRange}
            onChange={(e) => setSelectedRange(e.target.value)}
            className="bg-transparent text-sm font-medium text-foreground outline-none cursor-pointer"
            aria-label="Date range"
          >
            {DATE_RANGES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Top row: Net Worth + Investment Value + Cash & Bank */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Primary metric */}
        <div className="glass-card rounded-2xl p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <hero.icon className="h-4 w-4 text-primary" />
            </div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {hero.title}
            </p>
          </div>
          <div className="text-3xl font-bold text-foreground">{hero.value}</div>
          <div className="mt-2 flex items-center gap-2">
            <Badge variant="secondary" className="text-xs px-2 py-0.5 border-0">
              <TrendIcon className="h-3 w-3 mr-0.5" />
              {hero.change}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-2">{hero.description}</p>
        </div>

        {/* Investment Value */}
        <div className="glass-card rounded-2xl p-5 sm:p-6 flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 rounded-xl bg-accent/10">
              <PieChart className="h-4 w-4 text-accent" />
            </div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Investment Value
            </p>
          </div>
          <div>
            <div className="text-3xl font-bold text-foreground">{formatCurrency(investmentValue)}</div>
            <div className="mt-2 flex items-center gap-2">
              <Badge variant="secondary" className="text-xs px-2 py-0.5 border-0">
                <InvestmentTrendIcon className="h-3 w-3 mr-0.5" />
                {investmentChangeLabel}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              vs {formatCurrency(investmentValue * 0.92)} {selectedRangeMeta.compare}
            </p>
          </div>
        </div>

        {/* Cash & Bank */}
        <div className="glass-card rounded-2xl p-5 sm:p-6 flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 rounded-xl bg-success/10">
              <CreditCard className="h-4 w-4 text-success" />
            </div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Cash & Bank
            </p>
          </div>
          <div>
            <div className="text-3xl font-bold text-foreground">{formatCurrency(cashAndBank)}</div>
            <div className="mt-2 flex items-center gap-2">
              <Badge variant="secondary" className="text-xs px-2 py-0.5 border-0">
                <ArrowUpRight className="h-3 w-3 mr-0.5" />
                +5% today
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              vs {formatCurrency(cashAndBank * 0.95)} {selectedRangeMeta.compare}
            </p>
          </div>
        </div>
      </div>

      {/* Supporting metrics, quiet and compact */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div
              key={stat.title}
              className="glass-card rounded-2xl p-4 flex flex-col justify-between transition-smooth hover:shadow-medium"
            >
              <Icon className="h-4 w-4 text-muted-foreground" />
              <div className="mt-4">
                <div className="text-2xl font-bold text-foreground leading-none">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1.5">{stat.title}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

