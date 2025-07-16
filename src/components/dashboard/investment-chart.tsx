import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts"

const portfolioData = [
  { month: "Jan", value: 10200000, growth: 2.1 },
  { month: "Feb", value: 10450000, growth: 2.5 },
  { month: "Mar", value: 10180000, growth: -2.6 },
  { month: "Apr", value: 10820000, growth: 6.3 },
  { month: "May", value: 11200000, growth: 3.5 },
  { month: "Jun", value: 11680000, growth: 4.3 },
  { month: "Jul", value: 12100000, growth: 3.6 },
  { month: "Aug", value: 12450000, growth: 2.9 },
]

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-medium">
        <p className="font-medium text-foreground">{`${label} 2024`}</p>
        <p className="text-primary font-semibold">
          {`Portfolio: $${payload[0].value.toLocaleString()}`}
        </p>
        <p className={`text-sm ${payload[0].payload.growth > 0 ? 'text-accent' : 'text-destructive'}`}>
          {`Growth: ${payload[0].payload.growth > 0 ? '+' : ''}${payload[0].payload.growth}%`}
        </p>
      </div>
    )
  }
  return null
}

export function InvestmentChart() {
  const currentValue = portfolioData[portfolioData.length - 1].value
  const previousValue = portfolioData[portfolioData.length - 2].value
  const growth = ((currentValue - previousValue) / previousValue) * 100

  return (
    <Card className="col-span-4 shadow-soft">
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
              ${currentValue.toLocaleString()}
            </div>
            <Badge variant="default" className="bg-accent text-accent-foreground">
              +{growth.toFixed(1)}% this month
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={portfolioData}>
              <defs>
                <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0.05}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="month" 
                className="text-muted-foreground"
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                className="text-muted-foreground"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="value"
                stroke="hsl(var(--accent))"
                strokeWidth={3}
                fill="url(#portfolioGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}