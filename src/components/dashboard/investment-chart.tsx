import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts"
import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/integrations/supabase/client"

const initialPortfolioData = [
  { 
    month: "Jan", 
    crypto: 850000, 
    stocks: 4200000, 
    etfs: 2800000, 
    houseEquity: 1900000, 
    business: 450000,
    total: 10200000
  },
  { 
    month: "Feb", 
    crypto: 920000, 
    stocks: 4380000, 
    etfs: 2950000, 
    houseEquity: 1920000, 
    business: 480000,
    total: 10650000
  },
  { 
    month: "Mar", 
    crypto: 780000, 
    stocks: 4150000, 
    etfs: 2880000, 
    houseEquity: 1940000, 
    business: 430000,
    total: 10180000
  },
  { 
    month: "Apr", 
    crypto: 1120000, 
    stocks: 4650000, 
    etfs: 3100000, 
    houseEquity: 1960000, 
    business: 490000,
    total: 11320000
  },
  { 
    month: "May", 
    crypto: 1180000, 
    stocks: 4890000, 
    etfs: 3250000, 
    houseEquity: 1980000, 
    business: 500000,
    total: 11800000
  },
  { 
    month: "Jun", 
    crypto: 1350000, 
    stocks: 5150000, 
    etfs: 3380000, 
    houseEquity: 2000000, 
    business: 520000,
    total: 12400000
  },
  { 
    month: "Jul", 
    crypto: 1480000, 
    stocks: 5420000, 
    etfs: 3550000, 
    houseEquity: 2020000, 
    business: 530000,
    total: 13000000
  },
  { 
    month: "Aug", 
    crypto: 1620000, 
    stocks: 5680000, 
    etfs: 3720000, 
    houseEquity: 2040000, 
    business: 540000,
    total: 13600000
  },
]

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-medium min-w-[200px]">
        <p className="font-medium text-foreground mb-2">{`${label} 2024`}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm font-medium" style={{ color: entry.color }}>
            {`${entry.name}: $${entry.value.toLocaleString()}`}
          </p>
        ))}
      </div>
    )
  }
  return null
}

export function InvestmentChart() {
  const { user } = useAuth()
  const [portfolioData, setPortfolioData] = useState(initialPortfolioData)
  const [realPortfolios, setRealPortfolios] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [hasRealData, setHasRealData] = useState(false)

  const fetchPortfolioData = async () => {
    if (!user) {
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('investment_portfolios')
        .select('*')
        .eq('user_id', user.id)
        .order('last_updated', { ascending: false })

      if (error) {
        console.error('Error fetching portfolio data:', error)
        setHasRealData(false)
      } else if (data && data.length > 0) {
        setRealPortfolios(data)
        setHasRealData(true)
      } else {
        setHasRealData(false)
      }
    } catch (error) {
      console.error('Error fetching portfolio data:', error)
      setHasRealData(false)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPortfolioData()
  }, [user])

  const currentData = portfolioData[portfolioData.length - 1]
  const previousData = portfolioData[portfolioData.length - 2]
  
  let currentTotal, previousTotal, growth

  if (hasRealData && realPortfolios.length > 0) {
    // Use real portfolio data
    currentTotal = realPortfolios.reduce((sum, portfolio) => sum + Number(portfolio.total_value), 0)
    previousTotal = currentTotal * 0.95 // Simulate 5% growth for display
    growth = ((currentTotal - previousTotal) / previousTotal) * 100
  } else {
    // Use mock data
    currentTotal = currentData.total
    previousTotal = previousData.total
    growth = ((currentTotal - previousTotal) / previousTotal) * 100
  }

  if (loading) {
    return (
      <Card className="shadow-soft w-full">
        <CardHeader>
          <CardTitle className="text-xl font-bold">Portfolio Performance</CardTitle>
          <CardDescription>Loading your investment data...</CardDescription>
        </CardHeader>
        <CardContent className="pt-0 p-2 sm:p-6">
          <div className="h-[250px] sm:h-[350px] flex items-center justify-center">
            <div className="text-muted-foreground">Loading...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!user) {
    return (
      <Card className="shadow-soft w-full">
        <CardHeader>
          <CardTitle className="text-xl font-bold">Portfolio Performance</CardTitle>
          <CardDescription>
            Sign in to view your real investment data
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0 p-2 sm:p-6">
          <div className="h-[250px] sm:h-[350px] flex flex-col items-center justify-center text-center">
            <div className="text-muted-foreground mb-4">
              Connect your investment accounts to see real portfolio performance
            </div>
            <div className="text-sm text-muted-foreground">
              Sign in and link your brokerage accounts to get started
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!hasRealData) {
    // Show mock data when no real data is available
    return (
      <Card className="shadow-soft w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-bold">Portfolio Performance</CardTitle>
              <CardDescription>
                Sample portfolio data - connect your accounts to see real data
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-foreground">
                ${currentTotal.toLocaleString()}
              </div>
              <Badge variant="outline" className="text-muted-foreground">
                Demo Data
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0 p-2 sm:p-6">
          <div className="h-[250px] sm:h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={portfolioData}>
                <defs>
                  <linearGradient id="totalGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="month" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="hsl(var(--primary))"
                  fillOpacity={1}
                  fill="url(#totalGradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Real data view
  return (
    <Card className="shadow-soft w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-bold">Portfolio Performance</CardTitle>
            <CardDescription>
              Your real investment portfolio ({realPortfolios.length} {realPortfolios.length === 1 ? 'account' : 'accounts'})
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-foreground">
              ${currentTotal.toLocaleString()}
            </div>
            <Badge variant="default" className="bg-green-500 text-white">
              Live Data
            </Badge>
          </div>
        </div>
        
        {/* Portfolio breakdown */}
        <div className="mt-4 pt-4 border-t border-border">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {realPortfolios.map((portfolio, index) => (
              <div key={portfolio.id} className="text-center">
                <div className="text-sm text-muted-foreground">{portfolio.platform_id}</div>
                <div className="font-medium">${Number(portfolio.total_value).toLocaleString()}</div>
                {portfolio.day_change && (
                  <div className={`text-xs ${Number(portfolio.day_change) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {Number(portfolio.day_change) >= 0 ? '+' : ''}${Number(portfolio.day_change).toFixed(2)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 p-2 sm:p-6">
        <div className="h-[250px] sm:h-[350px] flex items-center justify-center">
          <div className="text-center">
            <div className="text-lg font-medium text-foreground mb-2">
              Total Portfolio Value
            </div>
            <div className="text-3xl font-bold text-foreground mb-4">
              ${currentTotal.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">
              Last updated: {new Date(realPortfolios[0]?.last_updated).toLocaleString()}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}