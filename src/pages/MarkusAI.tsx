import { CoachMarkusChat } from '@/components/community/CoachMarkusChat'
import { MarkusMobileTabs, useShowMarkusNav } from '@/components/markus/MarkusNav'

export default function MarkusAI() {
  // In the Markus member area the chat opens like a fresh welcome screen, and calls live on the Voice Call page.
  const markusArea = useShowMarkusNav()
  return (
    <div className="community-shell">
      <div className="community-center flex-1">
        <div className="community-message-header">
          <div className="flex min-w-0 items-center gap-2.5">
            <img src="/lovable-uploads/f9de210b-406b-4d7d-9a44-c0e6e5114825.png" alt="" className="h-9 w-9 object-contain" />
            <div className="min-w-0">
              <h1 className="text-base font-bold">Markus AI</h1>
              <p className="text-[11px] leading-tight text-muted-foreground">Your TruHeirs guide</p>
            </div>
          </div>
        </div>
        <MarkusMobileTabs />
        <CoachMarkusChat welcome={markusArea} hideVoice={markusArea} tools={markusArea} />
      </div>
    </div>
  )
}
