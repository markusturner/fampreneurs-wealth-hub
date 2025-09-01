import React from 'react'

interface AssetAllocationData {
  name: string
  value: number
  color: string
}

interface AssetAllocationProps {
  data?: AssetAllocationData[]
}

export function AssetAllocation({ data }: AssetAllocationProps) {
  const defaultData: AssetAllocationData[] = [
    { name: "Equities", value: 65, color: "hsl(var(--primary))" },
    { name: "Bonds", value: 20, color: "hsl(var(--accent))" },
    { name: "Real Estate", value: 10, color: "hsl(var(--secondary))" },
    { name: "Alternatives", value: 5, color: "hsl(var(--muted-foreground))" },
  ]

  const assetData = data || defaultData
  
  return (
    <div className="space-y-4">
      {assetData.map((asset) => (
        <div key={asset.name} className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{asset.name}</span>
            <div className="text-right">
              <span className="text-sm font-medium">{asset.value}%</span>
            </div>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div 
              className="h-2 rounded-full transition-all duration-300" 
              style={{ 
                width: `${asset.value}%`,
                backgroundColor: asset.color
              }}
            ></div>
          </div>
        </div>
      ))}
    </div>
  )
}