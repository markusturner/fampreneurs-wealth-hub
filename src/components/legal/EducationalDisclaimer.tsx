import { Info } from 'lucide-react'
import { Link } from 'react-router-dom'
import { EDUCATIONAL_DISCLAIMER } from '@/lib/legal'
import { cn } from '@/lib/utils'

/** Shown on every trust, succession, and wealth screen. */
export function EducationalDisclaimer({ className }: { className?: string }) {
  return (
    <p
      role="note"
      className={cn(
        'flex items-start gap-2 rounded-md border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground',
        className,
      )}
    >
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>
        {EDUCATIONAL_DISCLAIMER}{' '}
        <Link to="/disclaimer" className="underline underline-offset-2 hover:text-foreground">
          Learn more
        </Link>
      </span>
    </p>
  )
}
