import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { PROGRAM_OPTIONS, ProgramCode } from '@/lib/programs'

interface Props {
  value: string[]
  onChange: (next: string[]) => void
  label?: string
  helper?: string
}

export function ProgramRestrictPicker({ value, onChange, label = 'Restrict to programs', helper }: Props) {
  const toggle = (code: ProgramCode) => {
    onChange(value.includes(code) ? value.filter(c => c !== code) : [...value, code])
  }
  return (
    <div className="space-y-2">
      <Label>
        {label} <span className="text-muted-foreground font-normal">(optional)</span>
      </Label>
      <p className="text-xs text-muted-foreground">
        {helper || 'Leave all unchecked to make this available to everyone. Selected programs will be the only ones with access (admins always bypass).'}
      </p>
      <div className="rounded-md border border-border divide-y divide-border">
        {PROGRAM_OPTIONS.map(p => (
          <label
            key={p.code}
            className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-muted/40 transition-colors"
          >
            <Checkbox
              checked={value.includes(p.code)}
              onCheckedChange={() => toggle(p.code)}
            />
            <span className="text-sm">{p.label}</span>
          </label>
        ))}
      </div>
      {value.length > 0 && (
        <p className="text-xs font-medium" style={{ color: '#290a52' }}>
          Locked to {value.length} {value.length === 1 ? 'program' : 'programs'}
        </p>
      )}
    </div>
  )
}
