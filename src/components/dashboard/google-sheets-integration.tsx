import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { FileSpreadsheet, ExternalLink, Upload } from 'lucide-react'

interface GoogleSheetsIntegrationProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function GoogleSheetsIntegration({ open, onOpenChange }: GoogleSheetsIntegrationProps) {
  const [loading, setLoading] = useState(false)
  const [spreadsheetUrl, setSpreadsheetUrl] = useState<string | null>(null)
  const { toast } = useToast()

  const handleGoogleAuth = async () => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          scopes: 'https://www.googleapis.com/auth/spreadsheets',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
          redirectTo: `${window.location.origin}/dashboard`
        }
      })

      if (error) {
        console.error('Google auth error:', error)
        toast({
          title: "Authentication Failed",
          description: "Unable to authenticate with Google. Please try again.",
          variant: "destructive"
        })
        return
      }

      // The user will be redirected to Google for authentication
      // After successful auth, they'll be redirected back to create the spreadsheet
      
    } catch (error) {
      console.error('Error during Google authentication:', error)
      toast({
        title: "Error",
        description: "An unexpected error occurred during authentication.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const createSpreadsheet = async () => {
    try {
      setLoading(true)

      const { data: session } = await supabase.auth.getSession()
      
      if (!session?.session?.provider_token) {
        toast({
          title: "Authentication Required",
          description: "Please authenticate with Google first.",
          variant: "destructive"
        })
        return
      }

      const { data, error } = await supabase.functions.invoke('google-sheets-integration', {
        body: {
          action: 'create_sheet',
          accessToken: session.session.provider_token
        }
      })

      if (error) {
        throw error
      }

      setSpreadsheetUrl(data.spreadsheetUrl)
      
      toast({
        title: "Success!",
        description: "Portfolio tracking spreadsheet created successfully!",
      })

    } catch (error) {
      console.error('Error creating spreadsheet:', error)
      toast({
        title: "Error",
        description: "Failed to create spreadsheet. Please try again.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const updatePortfolioData = async () => {
    try {
      setLoading(true)

      const { data: session } = await supabase.auth.getSession()
      
      if (!session?.session?.provider_token) {
        toast({
          title: "Authentication Required",
          description: "Please authenticate with Google first.",
          variant: "destructive"
        })
        return
      }

      // Sample portfolio data - in a real app, this would come from your database
      const portfolioData = {
        stocks: 5420000,
        etfs: 3550000,
        crypto: 1480000,
        houseEquity: 2020000,
        business: 530000,
        date: new Date().toISOString().split('T')[0]
      }

      const spreadsheetId = spreadsheetUrl?.split('/d/')[1]?.split('/')[0]
      
      if (!spreadsheetId) {
        toast({
          title: "Error",
          description: "No spreadsheet found. Please create one first.",
          variant: "destructive"
        })
        return
      }

      const { data, error } = await supabase.functions.invoke('google-sheets-integration', {
        body: {
          action: 'update_portfolio',
          accessToken: session.session.provider_token,
          spreadsheetId,
          portfolioData
        }
      })

      if (error) {
        throw error
      }

      toast({
        title: "Success!",
        description: "Portfolio data updated in Google Sheets!",
      })

    } catch (error) {
      console.error('Error updating portfolio:', error)
      toast({
        title: "Error",
        description: "Failed to update portfolio data. Please try again.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Google Sheets Integration
          </DialogTitle>
          <DialogDescription>
            Connect your portfolio to Google Sheets for automatic tracking and reporting.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">What you'll get:</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">Auto-sync</Badge>
                <span className="text-sm">Real-time portfolio updates</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">Reports</Badge>
                <span className="text-sm">Automated performance tracking</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">Sharing</Badge>
                <span className="text-sm">Easy collaboration with advisors</span>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3">
            <Button 
              onClick={handleGoogleAuth}
              disabled={loading}
              className="w-full"
              variant="outline"
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              {loading ? "Connecting..." : "Connect Google Account"}
            </Button>

            <Button 
              onClick={createSpreadsheet}
              disabled={loading || !spreadsheetUrl}
              className="w-full"
            >
              <Upload className="h-4 w-4 mr-2" />
              {loading ? "Creating..." : "Create Portfolio Spreadsheet"}
            </Button>

            {spreadsheetUrl && (
              <div className="space-y-2">
                <Button
                  onClick={updatePortfolioData}
                  disabled={loading}
                  className="w-full"
                  variant="secondary"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {loading ? "Updating..." : "Update Portfolio Data"}
                </Button>
                
                <Button
                  asChild
                  variant="outline"
                  className="w-full"
                >
                  <a href={spreadsheetUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Spreadsheet
                  </a>
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}