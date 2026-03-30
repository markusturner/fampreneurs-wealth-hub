import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Zap, Crown, Rocket, Star, CreditCard, Calendar } from 'lucide-react'
import { PROGRAMS, type ProgramId } from '@/lib/stripe-programs'
import { useSubscription } from '@/hooks/useSubscription'
import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'

interface PricingPopupProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  programFilter?: ProgramId  // when set, only show that program's pricing
}

export function PricingPopup({ open, onOpenChange, programFilter }: PricingPopupProps) {
  const { createCheckout } = useSubscription()
  const [upgradeVideoUrl, setUpgradeVideoUrl] = useState<string | null>(null)

  useEffect(() => {
    const fetchUpgradeVideo = async () => {
      try {
        const { data } = await supabase.from('app_settings').select('upgrade_video_url').single()
        if (data?.upgrade_video_url) setUpgradeVideoUrl(data.upgrade_video_url)
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
    // Tella.tv
    if (url.includes("tella.tv")) {
      if (url.includes("/embed")) return url
      const tellaMatch = url.match(/tella\.tv\/(?:video|share)\/([a-zA-Z0-9_-]+)/)
      if (tellaMatch) return `https://www.tella.tv/video/${tellaMatch[1]}/embed`
    }
    return url
  }

  const icons = [Zap, Crown, Rocket, Star]
  const gradients = [
    'from-orange-500/20 to-red-500/20',
    'from-emerald-500/20 to-teal-500/20',
    'from-blue-500/20 to-indigo-500/20',
    'from-purple-500/20 to-pink-500/20',
  ]
  const iconColors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#9b59b6']

  // Filter programs based on programFilter prop
  const displayPrograms = programFilter
    ? PROGRAMS.filter(p => p.id === programFilter)
    : PROGRAMS

  // Determine title based on filter
  const getTitle = () => {
    if (!programFilter) return { highlight: 'TruHeirs', rest: 'Access' }
    if (programFilter === 'fbu') return { highlight: 'Family Business University', rest: '' }
    const program = PROGRAMS.find(p => p.id === programFilter)
    return { highlight: program?.name || 'Program', rest: '' }
  }

  const title = getTitle()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto border-0 shadow-2xl">
        <DialogHeader className="text-center pb-2">
          <DialogTitle className="text-2xl font-bold">
            Unlock <span className="text-[#ffb500]">{title.highlight}</span> {title.rest}
          </DialogTitle>
          <DialogDescription className="text-sm">
            {programFilter
              ? `Choose your preferred pricing plan for ${displayPrograms[0]?.name}.`
              : 'Subscribe to one of our programs to access the TruHeirs family office suite.'
            }
          </DialogDescription>
        </DialogHeader>

        {/* Upgrade Video */}
        {upgradeVideoUrl && (
          <div className="aspect-video w-full rounded-xl overflow-hidden mb-2 border">
            {(upgradeVideoUrl.includes('youtube') || upgradeVideoUrl.includes('loom') || upgradeVideoUrl.includes('vimeo') || upgradeVideoUrl.includes('tella.tv')) ? (
              <iframe src={getEmbedUrl(upgradeVideoUrl)} className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
            ) : (
              <video src={upgradeVideoUrl} controls className="w-full h-full" />
            )}
          </div>
        )}

        <div className={`grid gap-4 mt-2 ${displayPrograms.length === 1 ? 'grid-cols-1 max-w-sm mx-auto' : displayPrograms.length <= 3 ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'}`}>
          {displayPrograms.map((program, index) => {
            const globalIndex = PROGRAMS.findIndex(p => p.id === program.id)
            const Icon = icons[globalIndex] || Zap
            const gradient = gradients[globalIndex] || gradients[0]
            const iconColor = iconColors[globalIndex] || iconColors[0]

            return (
              <div
                key={program.id}
                className="relative border border-border rounded-2xl p-5 space-y-4 hover:border-[#ffb500]/60 transition-all duration-300 hover:shadow-lg hover:shadow-[#ffb500]/10 bg-gradient-to-br from-background to-muted/30"
              >
                <div className="text-center space-y-3">
                  <div
                    className={`w-12 h-12 mx-auto rounded-xl flex items-center justify-center bg-gradient-to-br ${gradient}`}
                  >
                    <Icon className="w-6 h-6" style={{ color: iconColor }} />
                  </div>
                  <h3 className="font-bold text-sm">{program.name}</h3>
                </div>

                <div className="space-y-2">
                  {program.pricing.map((option) => (
                    <Button
                      key={option.price_id}
                      variant="outline"
                      size="sm"
                      className="w-full text-xs justify-between hover:border-[#ffb500]/60 hover:bg-[#ffb500]/5 rounded-lg h-10"
                      onClick={() => {
                        createCheckout(option.price_id, option.mode, program.name)
                        onOpenChange(false)
                      }}
                    >
                      <span className="text-muted-foreground">{option.interval}</span>
                      <span className="font-bold text-[#ffb500]">{option.label.split(' ')[0]}</span>
                    </Button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* Auto Upgrade + Book a Call buttons */}
        <div className="mt-4 space-y-3 border-t pt-4">
          <Button
            className="w-full gap-2 rounded-xl h-12 text-base font-semibold"
            style={{ backgroundColor: '#ffb500', color: '#290a52' }}
            size="lg"
            onClick={() => {
              const targetProgram = programFilter ? PROGRAMS.find(p => p.id === programFilter) : PROGRAMS[0]
              if (targetProgram?.pricing.length) {
                const lowest = targetProgram.pricing.reduce((min, p) => p.amount < min.amount ? p : min, targetProgram.pricing[0])
                createCheckout(lowest.price_id, lowest.mode, targetProgram.name)
                onOpenChange(false)
              }
            }}
          >
            <CreditCard className="h-5 w-5" />
            Auto Upgrade Now
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            ⚠️ Clicking "Auto Upgrade Now" will charge the card on file for your account.
          </p>

          <Button
            variant="outline"
            className="w-full gap-2 rounded-xl h-12"
            size="lg"
            onClick={() => window.open('https://calendly.com/turnermarkus50/the-family-business-accelerator-clone', '_blank')}
          >
            <Calendar className="h-5 w-5" />
            Book a Call to Upgrade
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
