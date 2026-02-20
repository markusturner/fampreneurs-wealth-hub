import { useState } from 'react'
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
    : PROGRAMS.slice(0, 1)

  const targetProgram = displayPrograms[0]

  const [selectedPriceId, setSelectedPriceId] = useState<string>(
    targetProgram?.pricing[0]?.price_id ?? ''
  )

  if (!targetProgram) return null

  const selectedOption = targetProgram.pricing.find(p => p.price_id === selectedPriceId) ?? targetProgram.pricing[0]

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

        {/* Plan options */}
        <div className="space-y-2 mb-6">
          {targetProgram.pricing.map((option) => (
            <button
              key={option.price_id}
              className={`w-full flex items-center justify-between px-4 py-3 border rounded-xl transition-all text-sm ${
                selectedPriceId === option.price_id
                  ? 'border-[#ffb500] bg-[#ffb500]/10'
                  : 'border-border hover:border-[#ffb500]/60 hover:bg-[#ffb500]/5'
              }`}
              onClick={() => setSelectedPriceId(option.price_id)}
            >
              <span className="text-foreground font-medium">{option.interval}</span>
              <span className="font-bold text-[#ffb500]">{option.label.split(' ')[0]}</span>
            </button>
          ))}
        </div>

        {/* Upgrade button */}
        <Button
          className="w-full h-12 rounded-xl text-base font-semibold"
          style={{ backgroundColor: '#ffb500', color: '#290a52' }}
          onClick={() => {
            createCheckout(selectedOption.price_id, selectedOption.mode, targetProgram.name)
            onOpenChange(false)
          }}
        >
          Upgrade — {selectedOption.label.split(' ')[0]}
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

