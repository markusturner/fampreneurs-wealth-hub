import { useState } from 'react'
import { AGREEMENT_TEXT_MAP } from '@/lib/agreement-texts'
import { useIsAdminOrOwner } from '@/hooks/useIsAdminOrOwner'
import { Loader2 } from 'lucide-react'

// Read-only view of every program agreement. Does not touch onboarding.
export default function AgreementTemplates() {
  const { isAdminOrOwner, isLoading } = useIsAdminOrOwner()
  const names = Object.keys(AGREEMENT_TEXT_MAP)
  const [selected, setSelected] = useState(names.find(n => /vip/i.test(n)) || names[0])

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin" /></div>
  if (!isAdminOrOwner) return <div className="p-8 text-center text-muted-foreground">Only admins can view this page.</div>

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold text-foreground">Program Agreements</h1>
      <div className="flex flex-wrap gap-2">
        {names.map(n => (
          <button
            key={n}
            onClick={() => setSelected(n)}
            className={`rounded-full px-4 py-1.5 text-sm border transition-colors ${selected === n ? 'bg-foreground text-background' : 'bg-card text-muted-foreground hover:text-foreground'}`}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="rounded-lg border border-border bg-card p-6 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
        {AGREEMENT_TEXT_MAP[selected]}
      </div>
    </div>
  )
}
