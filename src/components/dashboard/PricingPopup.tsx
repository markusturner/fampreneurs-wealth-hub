import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Check, Crown, Zap, Rocket, CreditCard, Calendar, Lock } from 'lucide-react'
import { PROGRAMS } from '@/lib/stripe-programs'
import { useSubscription } from '@/hooks/useSubscription'
import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'

interface PricingPopupProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PricingPopup({ open, onOpenChange }: PricingPopupProps) {
  const { createCheckout } = useSubscription()
  const [upgradeVideoUrl, setUpgradeVideoUrl] = useState<string | null>(null)

  useEffect(() => {
    const fetchUpgradeVideo = async () => {
      try {
        const { data } = await supabase
          .from('app_settings')
          .select('upgrade_video_url')
          .single()
        if (data?.upgrade_video_url) {
          setUpgradeVideoUrl(data.upgrade_video_url)
        }
      } catch (e) { /* ignore */ }
    }
    if (open) fetchUpgradeVideo()
  }, [open])

  const getEmbedUrl = (url: string): string => {
    if (url.includes("youtube.com") || url.includes("youtu.be")) {
      const videoId = url.includes("youtu.be")
        ? url.split("youtu.be/")[1]?.split("?")[0]
        : new URLSearchParams(url.split("?")[1]).get("v")
      return `https://www.youtube.com/embed/${videoId}`
    }
    if (url.includes("loom.com")) {
      const loomId = url.split("loom.com/share/")[1]?.split("?")[0]
      return `https://www.loom.com/embed/${loomId}`
    }
    if (url.includes("vimeo.com")) {
      const vimeoId = url.split("vimeo.com/")[1]?.split("?")[0]
      return `https://player.vimeo.com/video/${vimeoId}`
    }
    return url
  }

  const icons = [Zap, Crown, Rocket]
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1']

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl">
            Unlock <span className="text-[#ffb500]">TruHeirs</span> Access
          </DialogTitle>
          <DialogDescription className="text-center text-sm">
            Subscribe to one of our programs to access the TruHeirs family office suite.
          </DialogDescription>
        </DialogHeader>

        {/* Upgrade Video */}
        {upgradeVideoUrl && (
          <div className="aspect-video w-full rounded-lg overflow-hidden mb-4">
            {(upgradeVideoUrl.includes('youtube') || upgradeVideoUrl.includes('loom') || upgradeVideoUrl.includes('vimeo')) ? (
              <iframe
                src={getEmbedUrl(upgradeVideoUrl)}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <video src={upgradeVideoUrl} controls className="w-full h-full" />
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          {PROGRAMS.map((program, index) => {
            const Icon = icons[index]
            const color = colors[index]

            return (
              <div
                key={program.id}
                className="border border-border rounded-xl p-4 space-y-4 hover:border-[#ffb500]/50 transition-colors"
              >
                <div className="text-center space-y-2">
                  <div
                    className="w-10 h-10 mx-auto rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${color}20` }}
                  >
                    <Icon className="w-5 h-5" style={{ color }} />
                  </div>
                  <h3 className="font-semibold text-sm">{program.name}</h3>
                </div>

                <div className="space-y-2">
                  {program.pricing.map((option) => (
                    <Button
                      key={option.price_id}
                      variant="outline"
                      size="sm"
                      className="w-full text-xs justify-between hover:border-[#ffb500]/50"
                      onClick={() => {
                        createCheckout(option.price_id, option.mode, program.name)
                        onOpenChange(false)
                      }}
                    >
                      <span>{option.interval}</span>
                      <span className="font-semibold text-[#ffb500]">{option.label.split(' ')[0]}</span>
                    </Button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* Auto Upgrade + Book a Call buttons */}
        <div className="mt-6 space-y-3 border-t border-border pt-4">
          <Button 
            className="w-full gap-2" 
            size="lg"
            onClick={() => {
              // Auto upgrade to the first program's lowest price
              const firstProgram = PROGRAMS[0]
              if (firstProgram?.pricing.length) {
                const lowest = firstProgram.pricing.reduce((min, p) => p.amount < min.amount ? p : min, firstProgram.pricing[0])
                createCheckout(lowest.price_id, lowest.mode, firstProgram.name)
                onOpenChange(false)
              }
            }}
          >
            <CreditCard className="h-4 w-4" />
            Auto Upgrade Now
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            ⚠️ Clicking "Auto Upgrade Now" will charge the card on file for your account.
          </p>
          
          <Button 
            variant="outline" 
            className="w-full gap-2" 
            size="lg"
            onClick={() => window.open('https://calendly.com/turnermarkus50/the-family-business-accelerator-clone', '_blank')}
          >
            <Calendar className="h-4 w-4" />
            Book a Call to Upgrade
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
