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
      const value = Math.round(baseValue + growth)
      
      // Create a secondary line for visual depth
      const secondaryValue = Math.round(value * (0.6 + Math.sin(index * 0.8) * 0.15))
      
      return {
        month,
        total: value,
        secondary: secondaryValue,
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
            <linearGradient id="totalGradientNew" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity={0.4}/>
              <stop offset="50%" stopColor="hsl(var(--accent))" stopOpacity={0.15}/>
              <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="secondaryGradientNew" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.2}/>
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
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
            dataKey="secondary"
            stroke="hsl(var(--primary))"
            fillOpacity={1}
            fill="url(#secondaryGradientNew)"
            strokeWidth={2}
            strokeOpacity={0.5}
            dot={false}
            activeDot={false}
          />
          <Area
            type="monotone"
            dataKey="total"
            stroke="hsl(var(--accent))"
            fillOpacity={1}
            fill="url(#totalGradientNew)"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 5, fill: 'hsl(var(--accent))', stroke: 'hsl(var(--background))', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
