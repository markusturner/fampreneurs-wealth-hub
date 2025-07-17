import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Copy, Link, RefreshCw } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export function AffiliateProgram() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [customCode, setCustomCode] = useState('')
  const [affiliateLink, setAffiliateLink] = useState('')

  // Generate default affiliate link using user ID
  const generateDefaultLink = () => {
    if (user?.id) {
      const baseUrl = window.location.origin
      const defaultCode = user.id.slice(0, 8)
      return `${baseUrl}?ref=${defaultCode}`
    }
    return ''
  }

  // Generate custom affiliate link
  const generateCustomLink = () => {
    if (customCode.trim()) {
      const baseUrl = window.location.origin
      const sanitizedCode = customCode.trim().toLowerCase().replace(/[^a-z0-9]/g, '')
      return `${baseUrl}?ref=${sanitizedCode}`
    }
    return generateDefaultLink()
  }

  const handleGenerateLink = () => {
    const link = customCode ? generateCustomLink() : generateDefaultLink()
    setAffiliateLink(link)
    toast({
      title: "Affiliate link generated",
      description: "Your affiliate link is ready to share!",
    })
  }

  const copyToClipboard = () => {
    if (affiliateLink) {
      navigator.clipboard.writeText(affiliateLink)
      toast({
        title: "Link copied",
        description: "Affiliate link copied to clipboard!",
      })
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link className="h-5 w-5" />
            Affiliate Program
          </CardTitle>
          <CardDescription>
            Create your custom affiliate link to earn commissions when people sign up through your referral.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="custom-code">Custom Affiliate Code (optional)</Label>
            <Input
              id="custom-code"
              placeholder="Enter custom code (e.g., 'myname', 'coach123')"
              value={customCode}
              onChange={(e) => setCustomCode(e.target.value)}
              maxLength={20}
            />
            <p className="text-xs text-muted-foreground">
              Leave empty to use your default code. Only letters and numbers allowed.
            </p>
          </div>

          <Button onClick={handleGenerateLink} className="w-full">
            <RefreshCw className="h-4 w-4 mr-2" />
            Generate Affiliate Link
          </Button>

          {affiliateLink && (
            <div className="space-y-2">
              <Label>Your Affiliate Link</Label>
              <div className="flex gap-2">
                <Input value={affiliateLink} readOnly className="flex-1" />
                <Button variant="outline" size="icon" onClick={copyToClipboard}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>How it Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>• Share your affiliate link with friends and family</p>
            <p>• When someone signs up using your link, you earn a commission</p>
            <p>• Track your referrals and earnings in your dashboard</p>
            <p>• Customize your link to make it more memorable</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}