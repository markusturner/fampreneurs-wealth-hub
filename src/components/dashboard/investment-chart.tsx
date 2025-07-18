import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts"
import { useEffect, useState } from "react"

const initialPortfolioData = [
  { 
    month: "Jan", 
    crypto: 850000, 
    stocks: 4200000, 
    etfs: 2800000, 
    houseEquity: 1900000, 
    business: 450000 
  },
  { 
    month: "Feb", 
    crypto: 920000, 
    stocks: 4380000, 
    etfs: 2950000, 
    houseEquity: 1920000, 
    business: 480000 
  },
  { 
    month: "Mar", 
    crypto: 780000, 
    stocks: 4150000, 
    etfs: 2880000, 
    houseEquity: 1940000, 
    business: 430000 
  },
  { 
    month: "Apr", 
    crypto: 1120000, 
    stocks: 4650000, 
    etfs: 3100000, 
    houseEquity: 1960000, 
    business: 490000 
  },
  { 
    month: "May", 
    crypto: 1180000, 
    stocks: 4890000, 
    etfs: 3250000, 
    houseEquity: 1980000, 
    business: 500000 
  },
  { 
    month: "Jun", 
    crypto: 1350000, 
    stocks: 5150000, 
    etfs: 3380000, 
    houseEquity: 2000000, 
    business: 520000 
  },
  { 
    month: "Jul", 
    crypto: 1480000, 
    stocks: 5420000, 
    etfs: 3550000, 
    houseEquity: 2020000, 
    business: 530000 
  },
  { 
    month: "Aug", 
    crypto: 1620000, 
    stocks: 5680000, 
    etfs: 3720000, 
    houseEquity: 2040000, 
    business: 540000 
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
  const [portfolioData, setPortfolioData] = useState(initialPortfolioData)

  useEffect(() => {
    // Simulate real-time investment API data updates
    const updatePortfolioData = () => {
      // This would come from your investment API
      const latestData = {
        month: "Current",
        crypto: 1620000,
        stocks: 5680000,
        etfs: 3720000,
        houseEquity: 2040000,
        business: 540000
      }
      
      setPortfolioData(prev => [...prev.slice(-7), latestData])
    }

    updatePortfolioData()
    
    // Update every 60 seconds to simulate API updates
    const interval = setInterval(updatePortfolioData, 60000)
    return () => clearInterval(interval)
  }, [])

  const currentData = portfolioData[portfolioData.length - 1]
  const previousData = portfolioData[portfolioData.length - 2]
  
  const currentTotal = currentData.crypto + currentData.stocks + currentData.etfs + currentData.houseEquity + currentData.business
  const previousTotal = previousData.crypto + previousData.stocks + previousData.etfs + previousData.houseEquity + previousData.business
  const growth = ((currentTotal - previousTotal) / previousTotal) * 100

  return (
    <Card className="shadow-soft w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-bold">Portfolio Performance</CardTitle>
            <CardDescription>
              Your investment growth over the past 8 months
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-foreground">
              ${currentTotal.toLocaleString()}
            </div>
            <Badge variant="default" className="bg-accent text-accent-foreground">
              +{growth.toFixed(1)}% this month
            </Badge>
          </div>
        </div>
        
        {/* Legend */}
        <div className="flex flex-wrap gap-2 sm:gap-4 mt-4 pt-4 border-t border-border">
          <div className="flex items-center gap-1 sm:gap-2">
            <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full" style={{ backgroundColor: '#2eb2ff' }}></div>
            <span className="text-xs sm:text-sm font-medium">Stocks</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full" style={{ backgroundColor: 'hsl(var(--accent))' }}></div>
            <span className="text-xs sm:text-sm font-medium">ETFs</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full" style={{ backgroundColor: 'hsl(var(--secondary))' }}></div>
            <span className="text-xs sm:text-sm font-medium">Crypto</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full" style={{ backgroundColor: 'hsl(270 50% 60%)' }}></div>
            <span className="text-xs sm:text-sm font-medium">House Equity</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full" style={{ backgroundColor: 'hsl(0 70% 50%)' }}></div>
            <span className="text-xs sm:text-sm font-medium">Business</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 p-2 sm:p-6">
        <div className="h-[250px] sm:h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={portfolioData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="month" 
                className="text-foreground"
                tick={{ fontSize: 10, fill: 'hsl(var(--foreground))' }}
                interval={0}
              />
              <YAxis 
                className="text-foreground"
                tick={{ fontSize: 10, fill: 'hsl(var(--foreground))' }}
                tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`}
                width={50}
              />
              <Tooltip content={<CustomTooltip />} />
              
              {/* Stocks Line */}
              <Line
                type="monotone"
                dataKey="stocks"
                stroke="#2eb2ff"
                strokeWidth={3}
                dot={false}
                name="Stocks"
              />
              
              {/* ETFs Line */}
              <Line
                type="monotone"
                dataKey="etfs"
                stroke="hsl(var(--accent))"
                strokeWidth={3}
                dot={false}
                name="ETFs"
              />
              
              {/* Crypto Line */}
              <Line
                type="monotone"
                dataKey="crypto"
                stroke="hsl(var(--secondary))"
                strokeWidth={3}
                dot={false}
                name="Crypto"
              />
              
              {/* House Equity Line */}
              <Line
                type="monotone"
                dataKey="houseEquity"
                stroke="hsl(270 50% 60%)"
                strokeWidth={3}
                dot={false}
                name="House Equity"
              />
              
              {/* Business Line */}
              <Line
                type="monotone"
                dataKey="business"
                stroke="hsl(0 70% 50%)"
                strokeWidth={3}
                dot={false}
                name="Business"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}