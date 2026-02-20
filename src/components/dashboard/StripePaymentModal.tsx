import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { X, Calendar } from 'lucide-react'
import { PROGRAMS, type ProgramId } from '@/lib/stripe-programs'
import { useSubscription } from '@/hooks/useSubscription'

interface StripePaymentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  programFilter?: ProgramId
  title?: string
}

export function StripePaymentModal({ open, onOpenChange, programFilter, title }: StripePaymentModalProps) {
  const { createCheckout } = useSubscription()

  const displayPrograms = programFilter
    ? PROGRAMS.filter(p => p.id === programFilter)
    : PROGRAMS.slice(0, 1) // default to first program

  const targetProgram = displayPrograms[0]

  if (!targetProgram) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm border-0 shadow-2xl rounded-2xl p-6 bg-background">
        <button
          onClick={() => onOpenChange(false)}
          className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100 transition-opacity"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>

        <DialogHeader className="text-center space-y-1 pb-4">
          <DialogTitle className="text-2xl font-bold text-foreground">
            {title || 'Subscribe'}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Choose a plan to unlock access.
          </p>
        </DialogHeader>

        {/* Apple Pay style button */}
        <Button
          className="w-full h-12 rounded-xl text-base font-semibold mb-4"
          style={{ backgroundColor: '#000', color: '#fff' }}
          onClick={() => {
            const lowestPrice = targetProgram.pricing.reduce((min, p) => p.amount < min.amount ? p : min, targetProgram.pricing[0])
            createCheckout(lowestPrice.price_id, lowestPrice.mode, targetProgram.name)
            onOpenChange(false)
          }}
        >
          Pay with{' '}
          <svg className="inline h-5 ml-1" viewBox="0 0 60 25" fill="white" aria-label="Apple Pay">
            <path d="M11.5 4.5C10.6 5.5 9.2 6.2 7.9 6.1 7.7 4.7 8.4 3.2 9.2 2.3 10.1 1.3 11.6.7 12.8.8c.2 1.5-.4 2.9-1.3 3.7zm1.3 2c-1.8-.1-3.4 1-4.2 1-1 0-2.4-1-3.9-1-2 0-3.8 1.2-4.8 3-2.1 3.5-.5 8.8 1.5 11.6.9 1.4 2.1 2.9 3.5 2.8 1.4 0 1.9-.9 3.6-.9 1.6 0 2.1.9 3.5.9 1.5 0 2.5-1.4 3.5-2.8.7-1 1-2 1.2-2.5-3.3-1.3-3.8-6.1-.5-7.7-.9-1.3-2.4-2.4-4.4-2.4z"/>
            <text x="22" y="18" fontSize="14" fontFamily="sans-serif" fill="white" fontWeight="600">Pay</text>
          </svg>
        </Button>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground">or pay with a card</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Card fields (visual, actual payment via Stripe checkout) */}
        <div className="space-y-3 mb-4">
          <div className="relative border border-border rounded-xl px-4 py-3 flex items-center justify-between bg-muted/20">
            <span className="text-sm text-muted-foreground">Card number</span>
            <div className="flex items-center gap-1">
              <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" alt="Visa" className="h-4 opacity-60" />
              <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="MC" className="h-4 opacity-60" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="border border-border rounded-xl px-4 py-3 bg-muted/20">
              <span className="text-sm text-muted-foreground">MM / YY</span>
            </div>
            <div className="border border-border rounded-xl px-4 py-3 bg-muted/20">
              <span className="text-sm text-muted-foreground">CVC</span>
            </div>
          </div>
        </div>

        {/* Plan options */}
        <div className="space-y-2 mb-4">
          {targetProgram.pricing.map((option) => (
            <button
              key={option.price_id}
              className="w-full flex items-center justify-between px-4 py-3 border border-border rounded-xl hover:border-[#ffb500]/60 hover:bg-[#ffb500]/5 transition-all text-sm"
              onClick={() => {
                createCheckout(option.price_id, option.mode, targetProgram.name)
                onOpenChange(false)
              }}
            >
              <span className="text-muted-foreground">{option.interval}</span>
              <span className="font-bold text-[#ffb500]">{option.label.split(' ')[0]}</span>
            </button>
          ))}
        </div>

        {/* Pay button */}
        <Button
          className="w-full h-12 rounded-xl text-base font-semibold"
          style={{ backgroundColor: '#ffb500', color: '#290a52' }}
          onClick={() => {
            const lowest = targetProgram.pricing.reduce((min, p) => p.amount < min.amount ? p : min, targetProgram.pricing[0])
            createCheckout(lowest.price_id, lowest.mode, targetProgram.name)
            onOpenChange(false)
          }}
        >
          Pay {targetProgram.pricing[0]?.label.split(' ')[0]}
        </Button>

        <Button
          variant="outline"
          className="w-full mt-2 gap-2 rounded-xl h-10"
          onClick={() => window.open('https://calendly.com/turnermarkus50/the-family-business-accelerator-clone', '_blank')}
        >
          <Calendar className="h-4 w-4" />
          Book a Call to Upgrade
        </Button>
      </DialogContent>
    </Dialog>
  )
}
