import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Copy, Handshake } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

const INTRO_MESSAGE = `Hey [Name], I want to introduce you to [Coach Name]. I just started building out my family trust with them and I'm loving it. [Coach Name], I got you added here so [Name] can ask you anything directly. No pressure, no pitch, just wanted you two connected.`

export function AffiliateProgram() {
  const { toast } = useToast()

  const copyMessage = () => {
    navigator.clipboard.writeText(INTRO_MESSAGE)
    toast({
      title: 'Message copied',
      description: 'Paste it into your group text.',
    })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Handshake className="h-5 w-5" />
            Family Cosign
          </CardTitle>
          <CardDescription>Share the legacy, get rewarded.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Know a family who needs this? Send us a quick intro. No pitch, no pressure, just connect them with us and we'll take it from there.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>How it Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>• Think of a family member or friend who may want this</p>
            <p>• Add them and us into a group text</p>
            <p>• Send the intro message below</p>
            <p>• We take it from there and book the call on your behalf</p>
            <p>• When they join and close, you earn 10% commission</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Intro Message Template</CardTitle>
          <CardDescription>Copy this into your group text.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm leading-relaxed">
            {INTRO_MESSAGE}
          </div>
          <Button
            onClick={copyMessage}
            className="w-full"
            style={{ backgroundColor: '#ffb500', color: '#290a52', transition: 'background-color 0.2s' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#2eb2ff')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#ffb500')}
          >
            <Copy className="h-4 w-4 mr-2" />
            Copy Message
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your Commission</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            All cosigns earn a fixed <span className="font-semibold text-foreground">10% commission</span> on any closed deal.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
