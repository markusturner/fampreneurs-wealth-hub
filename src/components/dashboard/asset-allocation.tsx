import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const assetData = [
  { name: "Equities", percentage: 65, color: "hsl(var(--primary))" },
  { name: "Bonds", percentage: 20, color: "hsl(var(--accent))" },
  { name: "Real Estate", percentage: 10, color: "hsl(var(--secondary))" },
  { name: "Alternatives", percentage: 5, color: "hsl(var(--muted-foreground))" },
]

export function AssetAllocation() {
  return (
    <Card className="shadow-soft lg:col-span-1 h-full">
      <CardHeader className="p-4 lg:p-6">
        <CardTitle className="text-lg font-bold">Asset Allocation</CardTitle>
        <CardDescription>
          Current portfolio distribution
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 lg:p-6">
        <div className="space-y-4">
          {assetData.map((asset) => (
            <div key={asset.name} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{asset.name}</span>
                <span className="text-sm text-muted-foreground">{asset.percentage}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="h-2 rounded-full transition-all duration-300" 
                  style={{ 
                    width: `${asset.percentage}%`,
                    backgroundColor: asset.color
                  }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}