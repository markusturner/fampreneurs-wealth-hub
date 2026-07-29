import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, Clock, Circle, type LucideIcon } from "lucide-react"

export type ProgressStatus = 'not_started' | 'in_progress' | 'complete'

interface Props {
  label: string
  description: string
  icon: LucideIcon
  status: ProgressStatus
  badge?: string
  doneForYou?: boolean
  onClick: () => void
}

const STATUS_META: Record<ProgressStatus, { label: string; icon: LucideIcon; className: string }> = {
  not_started: { label: 'Not Started', icon: Circle, className: 'border-muted-foreground/40 text-muted-foreground' },
  in_progress: { label: 'In Progress', icon: Clock, className: 'border-[#ffb500]/60 text-[#ffb500]' },
  complete: { label: 'Complete', icon: CheckCircle2, className: 'border-emerald-500/60 text-emerald-600' },
}

export function SuccessionItemCard({ label, description, icon: Icon, status, badge, doneForYou, onClick }: Props) {
  const meta = STATUS_META[status]
  const StatusIcon = meta.icon
  return (
    <Card
      className="cursor-pointer transition-all duration-200 hover:border-accent hover:shadow-md hover:shadow-accent/10"
      onClick={onClick}
    >
      <CardHeader className="text-center p-2 pb-1">
        <div className="mx-auto mb-1">
          <Icon className="h-6 w-6 text-accent" />
        </div>
        <CardTitle className="text-xs leading-tight">{label}</CardTitle>
        {badge && (
          <Badge variant="outline" className="mx-auto mt-1 border-[#290a52]/40 text-[#290a52] text-[10px] px-1.5 py-0">{badge}</Badge>
        )}
      </CardHeader>
      <CardContent className="p-2 pt-0">
        {doneForYou && (
          <Badge variant="outline" className={`w-full justify-center text-[10px] px-1 py-0 ${meta.className}`}>
            <StatusIcon className="h-2.5 w-2.5 mr-1" /> {meta.label}
          </Badge>
        )}
      </CardContent>
    </Card>
  )
}
