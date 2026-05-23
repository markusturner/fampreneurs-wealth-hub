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
  onClick: () => void
}

const STATUS_META: Record<ProgressStatus, { label: string; icon: LucideIcon; className: string }> = {
  not_started: { label: 'Not Started', icon: Circle, className: 'border-muted-foreground/40 text-muted-foreground' },
  in_progress: { label: 'In Progress', icon: Clock, className: 'border-[#ffb500]/60 text-[#ffb500]' },
  complete: { label: 'Complete', icon: CheckCircle2, className: 'border-emerald-500/60 text-emerald-600' },
}

export function SuccessionItemCard({ label, description, icon: Icon, status, badge, onClick }: Props) {
  const meta = STATUS_META[status]
  const StatusIcon = meta.icon
  return (
    <Card
      className="cursor-pointer transition-all duration-200 hover:border-accent hover:shadow-lg hover:shadow-accent/10"
      onClick={onClick}
    >
      <CardHeader className="text-center pb-2">
        <div className="mx-auto mb-2">
          <Icon className="h-10 w-10 text-accent" />
        </div>
        <CardTitle className="text-base">{label}</CardTitle>
        {badge && (
          <Badge variant="outline" className="mx-auto mt-1 border-[#290a52]/40 text-[#290a52]">{badge}</Badge>
        )}
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground text-center min-h-[2.5rem]">{description}</p>
        <Badge variant="outline" className={`w-full justify-center mt-3 ${meta.className}`}>
          <StatusIcon className="h-3 w-3 mr-1" /> {meta.label}
        </Badge>
      </CardContent>
    </Card>
  )
}
