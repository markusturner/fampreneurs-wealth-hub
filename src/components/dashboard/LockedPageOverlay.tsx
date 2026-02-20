import { useState } from 'react'
import { Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StripePaymentModal } from '@/components/dashboard/StripePaymentModal'
import type { ProgramId } from '@/lib/stripe-programs'

interface LockedPageOverlayProps {
  locked: boolean
  programFilter?: ProgramId
  title?: string
  children: React.ReactNode
}

export function LockedPageOverlay({ locked, programFilter, title, children }: LockedPageOverlayProps) {
  const [paymentOpen, setPaymentOpen] = useState(false)

  if (!locked) return <>{children}</>

  return (
    <div className="relative h-full min-h-[calc(100vh-4rem)] overflow-hidden">
      {/* Blurred page content */}
      <div className="blur-md pointer-events-none select-none opacity-50">
        {children}
      </div>

      {/* Dark overlay + lock UI — fixed so it's always centered in viewport */}
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-40" style={{ top: 0, left: 0 }}>
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-[#ffb500]/20 flex items-center justify-center mx-auto">
            <Lock className="h-8 w-8 text-[#ffb500]" />
          </div>
          <div className="space-y-1">
            <h3 className="text-white text-xl font-bold">{title || 'This page is locked'}</h3>
            <p className="text-white/70 text-sm">Upgrade to unlock full access</p>
          </div>
          <Button
            className="rounded-xl px-8 h-11 font-semibold"
            style={{ backgroundColor: '#ffb500', color: '#290a52' }}
            onClick={() => setPaymentOpen(true)}
          >
            Unlock Now
          </Button>
        </div>
      </div>

      <StripePaymentModal
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        programFilter={programFilter}
        title={title || 'Unlock TruHeirs'}
      />
    </div>
  )
}
