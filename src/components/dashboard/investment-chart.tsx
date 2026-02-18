import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'

interface InvestmentChartProps {
  accountsData?: any[]
  totalValue?: number
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card/95 backdrop-blur-md border border-border/50 rounded-xl p-3 shadow-lg min-w-[180px]">
        <p className="font-medium text-foreground text-xs mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <p className="text-sm font-semibold" style={{ color: entry.color }}>
              {`$${entry.value.toLocaleString()}`}
            </p>
          </div>
        ))}
      </div>
    )
  }
  return null
}

export function InvestmentChart({ accountsData = [], totalValue = 0 }: InvestmentChartProps) {
  const generateChartData = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const currentMonth = new Date().getMonth()
    const chartMonths = months.slice(0, currentMonth + 1).slice(-8)
    
    return chartMonths.map((month, index) => {
      const progress = (index + 1) / chartMonths.length
      const baseValue = totalValue * 0.7
      const growth = (totalValue - baseValue) * progress
      const thisYear = Math.round(baseValue + growth + Math.sin(index * 0.6) * totalValue * 0.03)
      
      // Last year's performance - lower baseline with different growth curve
      const lastYearBase = totalValue * 0.55
      const lastYearGrowth = (totalValue * 0.75 - lastYearBase) * progress
      const lastYear = Math.round(lastYearBase + lastYearGrowth + Math.cos(index * 0.7) * totalValue * 0.025)
      
      return {
        month,
        thisYear,
        lastYear,
      }
    })
  }

  const chartData = generateChartData()
  const hasData = accountsData.length > 0

  if (!hasData) {
    return (
      <div className="h-[280px] sm:h-[320px] flex items-center justify-center">
        <div className="text-center">
          <div className="text-muted-foreground mb-2">No account data available</div>
          <div className="text-sm text-muted-foreground">
            Connect your accounts to see balance trends
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-[280px] sm:h-[320px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="thisYearGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity={0.4}/>
              <stop offset="50%" stopColor="hsl(var(--accent))" stopOpacity={0.15}/>
              <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="lastYearGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.1}/>
              <stop offset="100%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="hsl(var(--border))" 
            strokeOpacity={0.3}
            vertical={false}
          />
          <XAxis 
            dataKey="month" 
            stroke="hsl(var(--muted-foreground))"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            dy={8}
          />
          <YAxis 
            stroke="hsl(var(--muted-foreground))"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => {
              if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
              if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`
              return `$${value}`
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="lastYear"
            stroke="hsl(var(--muted-foreground))"
            fillOpacity={1}
            fill="url(#lastYearGradient)"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            strokeOpacity={0.5}
            dot={false}
            activeDot={false}
            name="Last Year"
          />
          <Area
            type="monotone"
            dataKey="thisYear"
            stroke="hsl(var(--accent))"
            fillOpacity={1}
            fill="url(#thisYearGradient)"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 5, fill: 'hsl(var(--accent))', stroke: 'hsl(var(--background))', strokeWidth: 2 }}
            name="This Year"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
