import { CoachMarkusChat } from '@/components/community/CoachMarkusChat'

export default function MarkusAI() {
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
        <CoachMarkusChat />
      </div>
    </div>
  )
}
