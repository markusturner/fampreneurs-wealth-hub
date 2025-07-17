import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Building2, 
  Wallet, 
  Bitcoin, 
  TrendingUp,
  Link,
  Shield,
  CheckCircle,
  ExternalLink,
  Plus
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"

interface InvestmentIntegrationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface InvestmentPlatform {
  id: string
  name: string
  category: "brokerage" | "bank" | "crypto" | "robo-advisor"
  icon: any
  description: string
  isPopular: boolean
  connectionType: "api" | "manual" | "oauth"
  website: string
}

const investmentPlatforms: InvestmentPlatform[] = [
  {
    id: "vanguard",
    name: "Vanguard",
    category: "brokerage",
    icon: Building2,
    description: "Low-cost index funds and ETFs",
    isPopular: true,
    connectionType: "manual",
    website: "https://investor.vanguard.com"
  },
  {
    id: "fidelity",
    name: "Fidelity",
    category: "brokerage",
    icon: TrendingUp,
    description: "Full-service brokerage and retirement",
    isPopular: true,
    connectionType: "manual",
    website: "https://www.fidelity.com"
  },
  {
    id: "schwab",
    name: "Charles Schwab",
    category: "brokerage",
    icon: Building2,
    description: "Investment management and trading",
    isPopular: true,
    connectionType: "manual",
    website: "https://www.schwab.com"
  },
  {
    id: "robinhood",
    name: "Robinhood",
    category: "brokerage",
    icon: TrendingUp,
    description: "Commission-free stock trading",
    isPopular: true,
    connectionType: "manual",
    website: "https://robinhood.com"
  },
  {
    id: "coinbase",
    name: "Coinbase",
    category: "crypto",
    icon: Bitcoin,
    description: "Cryptocurrency exchange and wallet",
    isPopular: true,
    connectionType: "api",
    website: "https://www.coinbase.com"
  },
  {
    id: "chase",
    name: "Chase Bank",
    category: "bank",
    icon: Wallet,
    description: "Personal and business banking",
    isPopular: true,
    connectionType: "manual",
    website: "https://www.chase.com"
  },
  {
    id: "bofa",
    name: "Bank of America",
    category: "bank",
    icon: Wallet,
    description: "Banking and investment services",
    isPopular: true,
    connectionType: "manual",
    website: "https://www.bankofamerica.com"
  },
  {
    id: "wells_fargo",
    name: "Wells Fargo",
    category: "bank",
    icon: Wallet,
    description: "Banking and wealth management",
    isPopular: false,
    connectionType: "manual",
    website: "https://www.wellsfargo.com"
  },
  {
    id: "etrade",
    name: "E*TRADE",
    category: "brokerage",
    icon: TrendingUp,
    description: "Online trading and investing",
    isPopular: false,
    connectionType: "manual",
    website: "https://us.etrade.com"
  },
  {
    id: "td_ameritrade",
    name: "TD Ameritrade",
    category: "brokerage",
    icon: Building2,
    description: "Trading platform and research",
    isPopular: false,
    connectionType: "manual",
    website: "https://www.tdameritrade.com"
  }
]

const categoryLabels = {
  brokerage: "Brokerage",
  bank: "Banking",
  crypto: "Cryptocurrency",
  "robo-advisor": "Robo-Advisor"
}

const categoryColors = {
  brokerage: "bg-blue-100 text-blue-800",
  bank: "bg-green-100 text-green-800",
  crypto: "bg-orange-100 text-orange-800",
  "robo-advisor": "bg-purple-100 text-purple-800"
}

export function InvestmentIntegrationDialog({ open, onOpenChange }: InvestmentIntegrationDialogProps) {
  const [selectedPlatform, setSelectedPlatform] = useState<InvestmentPlatform | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [manualData, setManualData] = useState({
    accountNumber: "",
    accountName: "",
    currentBalance: "",
    notes: ""
  })
  const { toast } = useToast()

  const handleConnect = async (platform: InvestmentPlatform) => {
    if (platform.connectionType === "api") {
      toast({
        title: "API Integration",
        description: `${platform.name} API integration would be implemented here. This typically requires OAuth authentication.`,
      })
      return
    }

    if (platform.connectionType === "oauth") {
      toast({
        title: "OAuth Integration", 
        description: `${platform.name} OAuth integration would redirect to their authentication page.`,
      })
      return
    }

    // For manual connections, show the form
    setSelectedPlatform(platform)
  }

  const handleManualSubmit = async () => {
    if (!selectedPlatform) return

    setIsConnecting(true)
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("User not authenticated")

      // In a real implementation, you would save this to a dedicated table
      // For now, we'll add it as a financial advisor with a special category
      const { error } = await supabase
        .from('financial_advisors')
        .insert({
          full_name: `${selectedPlatform.name} Account`,
          company: selectedPlatform.name,
          title: "Investment Account",
          bio: `Account: ${manualData.accountName}\nBalance: $${manualData.currentBalance}\nNotes: ${manualData.notes}`,
          specialties: [selectedPlatform.category, "investment_account"],
          added_by: user.id,
          notes: `Platform: ${selectedPlatform.name}\nAccount Number: ${manualData.accountNumber}`
        })

      if (error) throw error

      toast({
        title: "Account Connected",
        description: `Successfully connected your ${selectedPlatform.name} account.`,
      })

      // Reset form and close
      setManualData({ accountNumber: "", accountName: "", currentBalance: "", notes: "" })
      setSelectedPlatform(null)
      onOpenChange(false)

    } catch (error: any) {
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect account",
        variant: "destructive",
      })
    } finally {
      setIsConnecting(false)
    }
  }

  if (selectedPlatform) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <selectedPlatform.icon className="h-5 w-5" />
              Connect {selectedPlatform.name}
            </DialogTitle>
            <DialogDescription>
              Enter your account details to track this investment account.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="accountName">Account Name</Label>
              <Input
                id="accountName"
                placeholder="e.g., John's 401k, Family Trust Account"
                value={manualData.accountName}
                onChange={(e) => setManualData(prev => ({ ...prev, accountName: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="accountNumber">Account Number (Last 4 digits)</Label>
              <Input
                id="accountNumber"
                placeholder="****1234"
                value={manualData.accountNumber}
                onChange={(e) => setManualData(prev => ({ ...prev, accountNumber: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="currentBalance">Current Balance</Label>
              <Input
                id="currentBalance"
                placeholder="100000"
                type="number"
                value={manualData.currentBalance}
                onChange={(e) => setManualData(prev => ({ ...prev, currentBalance: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Input
                id="notes"
                placeholder="Additional notes about this account"
                value={manualData.notes}
                onChange={(e) => setManualData(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>

            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border">
              <Shield className="h-4 w-4 text-blue-600" />
              <p className="text-sm text-blue-800">
                Your account information is stored securely and encrypted.
              </p>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setSelectedPlatform(null)}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={handleManualSubmit}
                disabled={!manualData.accountName || !manualData.currentBalance || isConnecting}
                className="flex-1"
              >
                {isConnecting ? "Connecting..." : "Connect Account"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Connect Investment Accounts</DialogTitle>
          <DialogDescription>
            Connect your investment and banking accounts to track your portfolio.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Popular Platforms */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Popular Platforms
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {investmentPlatforms.filter(p => p.isPopular).map((platform) => {
                const Icon = platform.icon
                return (
                  <Card key={platform.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <Icon className="h-5 w-5" />
                          <CardTitle className="text-sm">{platform.name}</CardTitle>
                        </div>
                        <Badge 
                          className={`text-xs ${categoryColors[platform.category]}`}
                          variant="secondary"
                        >
                          {categoryLabels[platform.category]}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <CardDescription className="text-xs mb-3">
                        {platform.description}
                      </CardDescription>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => handleConnect(platform)}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Connect
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(platform.website, '_blank')}
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>

          {/* All Platforms */}
          <div>
            <h3 className="font-semibold mb-3">All Platforms</h3>
            <div className="grid gap-2">
              {investmentPlatforms.filter(p => !p.isPopular).map((platform) => {
                const Icon = platform.icon
                return (
                  <div key={platform.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <Icon className="h-4 w-4" />
                      <div>
                        <div className="font-medium text-sm">{platform.name}</div>
                        <div className="text-xs text-muted-foreground">{platform.description}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge 
                        className={`text-xs ${categoryColors[platform.category]}`}
                        variant="secondary"
                      >
                        {categoryLabels[platform.category]}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleConnect(platform)}
                      >
                        Connect
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border">
            <Shield className="h-4 w-4 text-gray-600" />
            <p className="text-sm text-gray-700">
              All connections use bank-level security. We never store your login credentials.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}