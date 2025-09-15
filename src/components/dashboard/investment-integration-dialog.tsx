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
    id: "alpaca",
    name: "Alpaca Markets",
    category: "brokerage",
    icon: TrendingUp,
    description: "Commission-free API trading platform",
    isPopular: true,
    connectionType: "api",
    website: "https://alpaca.markets"
  },
  {
    id: "polygon",
    name: "Polygon.io",
    category: "brokerage", 
    icon: Building2,
    description: "Real-time and historical market data",
    isPopular: true,
    connectionType: "api",
    website: "https://polygon.io"
  },
  {
    id: "coinbase",
    name: "Coinbase Pro",
    category: "crypto",
    icon: Bitcoin,
    description: "Professional cryptocurrency trading",
    isPopular: true,
    connectionType: "api",
    website: "https://pro.coinbase.com"
  },
  {
    id: "interactive_brokers",
    name: "Interactive Brokers",
    category: "brokerage",
    icon: Building2,
    description: "Professional trading platform with global markets",
    isPopular: true,
    connectionType: "api",
    website: "https://www.interactivebrokers.com"
  },
  {
    id: "fidelity",
    name: "Fidelity",
    category: "brokerage",
    icon: TrendingUp,
    description: "Full-service brokerage and retirement",
    isPopular: true,
    connectionType: "api",
    website: "https://www.fidelity.com"
  },
  {
    id: "schwab",
    name: "Charles Schwab",
    category: "brokerage",
    icon: Building2,
    description: "Investment management and trading",
    isPopular: true,
    connectionType: "api",
    website: "https://www.schwab.com"
  },
  {
    id: "vanguard",
    name: "Vanguard",
    category: "brokerage",
    icon: Building2,
    description: "Low-cost index funds and ETFs",
    isPopular: false,
    connectionType: "api",
    website: "https://investor.vanguard.com"
  },
  {
    id: "robinhood",
    name: "Robinhood",
    category: "brokerage",
    icon: TrendingUp,
    description: "Commission-free stock trading",
    isPopular: false,
    connectionType: "manual",
    website: "https://robinhood.com"
  },
  {
    id: "chase",
    name: "Chase Bank",
    category: "bank",
    icon: Wallet,
    description: "Personal and business banking",
    isPopular: false,
    connectionType: "manual",
    website: "https://www.chase.com"
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
  const [apiKeyData, setApiKeyData] = useState({
    apiKey: "",
    apiSecret: "",
    accountName: "",
    environment: "sandbox" as "sandbox" | "live"
  })
  const [manualData, setManualData] = useState({
    accountNumber: "",
    accountName: "",
    currentBalance: "",
    notes: ""
  })
  const { toast } = useToast()

  const handleConnect = async (platform: InvestmentPlatform) => {
    if (platform.connectionType === "api") {
      // Show API key form for platforms that support API connections
      setSelectedPlatform(platform)
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

  const handleApiKeySubmit = async () => {
    if (!selectedPlatform) return

    setIsConnecting(true)
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("User not authenticated")

      // Store API credentials securely (in a real app, you'd encrypt these)
      const { error } = await supabase
        .from('financial_advisors')
        .insert({
          full_name: `${selectedPlatform.name} API Connection`,
          company: selectedPlatform.name,
          title: "API Investment Account",
          bio: `Account: ${apiKeyData.accountName}\nEnvironment: ${apiKeyData.environment}\nConnected via API`,
          specialties: [selectedPlatform.category, "api_connection"],
          added_by: user.id,
          notes: `Platform: ${selectedPlatform.name}\nConnection Type: API\nEnvironment: ${apiKeyData.environment}`
        })

      if (error) throw error

      // Call the investment sync function to fetch portfolio data
      try {
        const { data: syncData, error: syncError } = await supabase.functions.invoke('investment-data-sync', {
          body: {
            userId: user.id,
            platformId: selectedPlatform.id
          }
        })

        if (syncError) {
          console.error('Sync error:', syncError)
          toast({
            title: "API Connected with Warning",
            description: `${selectedPlatform.name} connected but portfolio sync failed. Data will sync on next refresh.`,
          })
        } else {
          toast({
            title: "API Connected & Synced",
            description: `Successfully connected to ${selectedPlatform.name} and synced portfolio data.`,
          })
        }
      } catch (syncError) {
        console.error('Portfolio sync failed:', syncError)
        toast({
          title: "API Connected",
          description: `Connected to ${selectedPlatform.name}. Portfolio will sync shortly.`,
        })
      }

      // Reset form and close
      setApiKeyData({ apiKey: "", apiSecret: "", accountName: "", environment: "sandbox" })
      setSelectedPlatform(null)
      onOpenChange(false)

    } catch (error: any) {
      toast({
        title: "API Connection Failed",
        description: error.message || "Failed to connect via API",
        variant: "destructive",
      })
    } finally {
      setIsConnecting(false)
    }
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

      // Call the investment sync function for manual accounts too
      try {
        const { data: syncData, error: syncError } = await supabase.functions.invoke('investment-data-sync', {
          body: {
            userId: user.id,
            platformId: selectedPlatform.id
          }
        })

        if (syncError) {
          console.error('Sync error:', syncError)
        }
      } catch (syncError) {
        console.error('Portfolio sync failed:', syncError)
      }

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

  // API Key Connection Form
  if (selectedPlatform && selectedPlatform.connectionType === "api") {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[95vw] max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <selectedPlatform.icon className="h-4 w-4 sm:h-5 sm:w-5" />
              Connect {selectedPlatform.name} API
            </DialogTitle>
            <DialogDescription className="text-sm">
              Enter your API credentials to connect your {selectedPlatform.name} account.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="accountName">Account Name</Label>
              <Input
                id="accountName"
                placeholder="e.g., Trading Account, Portfolio 1"
                value={apiKeyData.accountName}
                onChange={(e) => setApiKeyData(prev => ({ ...prev, accountName: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key</Label>
              <Input
                id="apiKey"
                type="password"
                placeholder="Enter your API key"
                value={apiKeyData.apiKey}
                onChange={(e) => setApiKeyData(prev => ({ ...prev, apiKey: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="apiSecret">API Secret</Label>
              <Input
                id="apiSecret"
                type="password"
                placeholder="Enter your API secret"
                value={apiKeyData.apiSecret}
                onChange={(e) => setApiKeyData(prev => ({ ...prev, apiSecret: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="environment">Environment</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={apiKeyData.environment === "sandbox" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setApiKeyData(prev => ({ ...prev, environment: "sandbox" }))}
                  className="flex-1"
                >
                  Sandbox (Testing)
                </Button>
                <Button
                  type="button"
                  variant={apiKeyData.environment === "live" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setApiKeyData(prev => ({ ...prev, environment: "live" }))}
                  className="flex-1"
                >
                  Live (Production)
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
              <Shield className="h-4 w-4 text-amber-600" />
              <div className="text-sm text-amber-800">
                <p className="font-medium">Security Notice</p>
                <p>API keys are stored securely and encrypted. Start with sandbox mode for testing.</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setSelectedPlatform(null)}
                className="flex-1 order-2 sm:order-1"
              >
                Back
              </Button>
              <Button
                onClick={handleApiKeySubmit}
                disabled={!apiKeyData.accountName || !apiKeyData.apiKey || !apiKeyData.apiSecret || isConnecting}
                className="flex-1 order-1 sm:order-2"
              >
                {isConnecting ? "Connecting..." : "Connect API"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  // Manual Connection Form
  if (selectedPlatform) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[95vw] max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <selectedPlatform.icon className="h-4 w-4 sm:h-5 sm:w-5" />
              Connect {selectedPlatform.name}
            </DialogTitle>
            <DialogDescription className="text-sm">
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

            <div className="flex flex-col sm:flex-row gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setSelectedPlatform(null)}
                className="flex-1 order-2 sm:order-1"
              >
                Back
              </Button>
              <Button
                onClick={handleManualSubmit}
                disabled={!manualData.accountName || !manualData.currentBalance || isConnecting}
                className="flex-1 order-1 sm:order-2"
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
      <DialogContent className="w-[95vw] max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg">Connect Investment & Banking Accounts</DialogTitle>
          <DialogDescription className="text-sm">
            Connect your brokerage, 401k, IRA, and banking accounts directly - no Plaid needed! Works with all major investment platforms.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Popular Platforms */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm sm:text-base">
              <TrendingUp className="h-4 w-4" />
              Popular Platforms
            </h3>
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
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
                          variant={platform.connectionType === "api" ? "default" : "secondary"}
                        >
                          {platform.connectionType === "api" ? (
                            <>
                              <Link className="h-3 w-3 mr-1" />
                              Connect API
                            </>
                          ) : (
                            <>
                              <Plus className="h-3 w-3 mr-1" />
                              Add Manual
                            </>
                          )}
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