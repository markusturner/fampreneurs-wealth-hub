import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'

interface InvestmentChartProps {
  accountsData?: any[]
  totalValue?: number
}

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

export function InvestmentChart({ accountsData = [], totalValue = 0 }: InvestmentChartProps) {
  // Generate demo chart data with current total as the end point
  const generateChartData = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const currentMonth = new Date().getMonth()
    const chartMonths = months.slice(0, currentMonth + 1).slice(-8) // Show last 8 months
    
    return chartMonths.map((month, index) => {
      // Create a growth curve ending at current total
      const progress = (index + 1) / chartMonths.length
      const baseValue = totalValue * 0.7 // Start at 70% of current value
      const growth = (totalValue - baseValue) * progress
      const value = Math.round(baseValue + growth)
      
      return {
        month,
        total: value
      }
    })
  }

  const chartData = generateChartData()
  const hasData = accountsData.length > 0 && totalValue > 0

  if (!hasData) {
    return (
      <div className="h-[250px] sm:h-[350px] flex items-center justify-center">
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
    <div className="h-[250px] sm:h-[350px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="totalGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ffb500" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#ffb500" stopOpacity={0}/>
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge> 
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
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
            tickFormatter={(value) => {
              if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
              if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`
              return `$${value}`
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="total"
            stroke="#ffb500"
            fillOpacity={1}
            fill="url(#totalGradient)"
            strokeWidth={3}
            filter="url(#glow)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}