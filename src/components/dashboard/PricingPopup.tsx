import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Check, Crown, Zap, Rocket } from 'lucide-react'
import { PROGRAMS } from '@/lib/stripe-programs'
import { useSubscription } from '@/hooks/useSubscription'

interface PricingPopupProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PricingPopup({ open, onOpenChange }: PricingPopupProps) {
  const { createCheckout } = useSubscription()

  const icons = [Zap, Crown, Rocket]
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1']

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl">
            Unlock <span className="text-[#ffb500]">TruHeirs</span> Access
          </DialogTitle>
          <p className="text-center text-muted-foreground text-sm">
            Subscribe to one of our programs to access the TruHeirs family office suite.
          </p>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          {PROGRAMS.map((program, index) => {
            const Icon = icons[index]
            const color = colors[index]
            const lowestPrice = program.pricing.reduce((min, p) => p.amount < min.amount ? p : min, program.pricing[0])

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
      </DialogContent>
    </Dialog>
  )
}
