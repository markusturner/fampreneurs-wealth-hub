import { Button } from '@/components/ui/button'
import { setDfoDemo, useDfoDemo } from '@/lib/dfo-demo'

export function DfoDemoToggle() {
  const demoMode = useDfoDemo()

  return (
    <div className="inline-flex items-center rounded-full border border-border bg-muted p-0.5 shadow-sm" aria-label="Digital Family Office view">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setDfoDemo(false)}
        className={`h-8 rounded-full px-4 text-xs ${!demoMode ? 'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground' : 'text-muted-foreground'}`}
      >
        Live
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setDfoDemo(true)}
        className={`h-8 rounded-full px-4 text-xs ${demoMode ? 'bg-accent text-accent-foreground hover:bg-accent/90 hover:text-accent-foreground' : 'text-muted-foreground'}`}
      >
        Demo
      </Button>
    </div>
  )
}