import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useEffect, useState } from "react"

interface AssetData {
  name: string
  percentage: number
  color: string
  value: number
}

export function AssetAllocation() {
  const [assetData, setAssetData] = useState<AssetData[]>([
    { name: "Equities", percentage: 65, color: "hsl(var(--primary))", value: 8092500 },
    { name: "Bonds", percentage: 20, color: "hsl(var(--accent))", value: 2490000 },
    { name: "Real Estate", percentage: 10, color: "hsl(var(--secondary))", value: 1245000 },
    { name: "Alternatives", percentage: 5, color: "hsl(var(--muted-foreground))", value: 622500 },
  ])

  useEffect(() => {
    // Simulate real-time investment API data updates
    const updateAssetAllocation = () => {
      const totalPortfolio = 12450000 // This would come from your investment API
      
      setAssetData([
        { 
          name: "Equities", 
          percentage: 65, 
          color: "hsl(var(--primary))", 
          value: totalPortfolio * 0.65 
        },
        { 
          name: "Bonds", 
          percentage: 20, 
          color: "hsl(var(--accent))", 
          value: totalPortfolio * 0.20 
        },
        { 
          name: "Real Estate", 
          percentage: 10, 
          color: "hsl(var(--secondary))", 
          value: totalPortfolio * 0.10 
        },
        { 
          name: "Alternatives", 
          percentage: 5, 
          color: "hsl(var(--muted-foreground))", 
          value: totalPortfolio * 0.05 
        },
      ])
    }

    updateAssetAllocation()
    
    // Update every 30 seconds to simulate API updates
    const interval = setInterval(updateAssetAllocation, 30000)
    return () => clearInterval(interval)
  }, [])
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
                <div className="text-right">
                  <span className="text-sm font-medium">{asset.percentage}%</span>
                  <div className="text-xs text-muted-foreground">
                    ${(asset.value / 1000000).toFixed(1)}M
                  </div>
                </div>
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