import React from 'react'

interface AssetAllocationData {
  name: string
  value: number
  color: string
}

interface AssetAllocationProps {
  data?: AssetAllocationData[]
  accountsData?: any[]
  totalBalance?: number
}

export function AssetAllocation({ data, accountsData = [], totalBalance = 0 }: AssetAllocationProps) {
  // Generate allocation data from actual accounts
  const generateAccountAllocation = () => {
    if (accountsData.length === 0 || totalBalance === 0) {
      return [
        { name: "No accounts connected", value: 100, color: "hsl(var(--muted-foreground))" }
      ]
    }

    return accountsData
      .filter(account => account.balance > 0)
      .map((account, index) => {
        const percentage = ((account.balance / totalBalance) * 100)
        const colors = [
          "#ffb500", // Gold
          "hsl(var(--primary))", 
          "hsl(var(--accent))", 
          "hsl(var(--secondary))",
          "hsl(var(--muted-foreground))"
        ]
        
        return {
          name: account.account_name?.replace('VNCI, LLC - ', '') || `Account ${index + 1}`,
          value: Math.round(percentage * 10) / 10, // Round to 1 decimal
          balance: account.balance,
          color: colors[index % colors.length]
        }
      })
      .sort((a, b) => b.balance - a.balance) // Sort by balance descending
  }

  const defaultData: AssetAllocationData[] = [
    { name: "Checking", value: 45, color: "#ffb500" },
    { name: "Savings", value: 30, color: "hsl(var(--primary))" },
    { name: "Business", value: 20, color: "hsl(var(--accent))" },
    { name: "Reserve", value: 5, color: "hsl(var(--secondary))" },
  ]

  const assetData = data || (accountsData.length > 0 ? generateAccountAllocation() : defaultData)
  
  return (
    <div className="space-y-4">
      {assetData.map((asset) => (
        <div key={asset.name} className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{asset.name}</span>
            <div className="text-right">
              <span className="text-sm font-medium">{asset.value}%</span>
              {(asset as any).balance && (
                <div className="text-xs text-muted-foreground">
                  ${(asset as any).balance.toLocaleString()}
                </div>
              )}
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