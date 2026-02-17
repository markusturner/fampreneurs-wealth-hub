import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { FileText, Users, DollarSign, Shield, Calendar, UserPlus, Bell } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/contexts/AuthContext"

interface ActivityItem {
  id: string
  title: string
  description: string
  time: string
  icon: any
  type: 'member' | 'document' | 'financial' | 'governance' | 'notification'
  created_at: string
}

export function DashboardRecentActivity() {
  const { user } = useAuth()
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.id) return
    fetchActivities()
  }, [user?.id])

  const fetchActivities = async () => {
    if (!user?.id) return
    const items: ActivityItem[] = []

    try {
      // Fetch recent notifications (TruHeirs app notifications)
      const [
        { data: notifications },
        { data: familyMembers },
        { data: documents },
        { data: governance }
      ] = await Promise.all([
        supabase
          .from('notifications')
          .select('id, title, message, created_at, notification_type')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('family_members')
          .select('id, full_name, family_position, office_role, created_at')
          .eq('added_by', user.id)
          .order('created_at', { ascending: false })
          .limit(3),
        supabase
          .from('family_documents')
          .select('id, document_name, category, uploaded_at')
          .eq('user_id', user.id)
          .order('uploaded_at', { ascending: false })
          .limit(3),
        supabase
          .from('family_governance_policies')
          .select('id, title, policy_type, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(2)
      ])

      notifications?.forEach(n => {
        items.push({
          id: `notif-${n.id}`,
          title: n.title,
          description: n.message || n.notification_type,
          time: formatTimeAgo(n.created_at),
          icon: Bell,
          type: 'notification',
          created_at: n.created_at
        })
      })

      familyMembers?.forEach(m => {
        items.push({
          id: `member-${m.id}`,
          title: m.office_role ? "Office Member Added" : "Family Member Added",
          description: `${m.full_name} — ${m.office_role || m.family_position || 'Member'}`,
          time: formatTimeAgo(m.created_at || ''),
          icon: m.office_role ? Users : UserPlus,
          type: 'member',
          created_at: m.created_at || ''
        })
      })

      documents?.forEach(d => {
        items.push({
          id: `doc-${d.id}`,
          title: "Document Uploaded",
          description: `${d.document_name} — ${d.category}`,
          time: formatTimeAgo(d.uploaded_at),
          icon: FileText,
          type: 'document',
          created_at: d.uploaded_at
        })
      })

      governance?.forEach(g => {
        items.push({
          id: `gov-${g.id}`,
          title: "Governance Policy",
          description: `${g.title} — ${g.policy_type}`,
          time: formatTimeAgo(g.created_at || ''),
          icon: Shield,
          type: 'governance',
          created_at: g.created_at || ''
        })
      })

      items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      setActivities(items.slice(0, 8))
    } catch (err) {
      console.error('Error fetching activities:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatTimeAgo = (dateString: string) => {
    if (!dateString) return ''
    const diff = Date.now() - new Date(dateString).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  const typeColors: Record<string, string> = {
    member: 'bg-blue-500/10 text-blue-500',
    document: 'bg-emerald-500/10 text-emerald-500',
    financial: 'bg-amber-500/10 text-amber-500',
    governance: 'bg-purple-500/10 text-purple-500',
    notification: 'bg-primary/10 text-primary',
  }

  if (loading) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-lg">Recent Activity</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="h-9 w-9 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-muted rounded w-1/3" />
                  <div className="h-3 bg-muted rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-bold">Recent Activity</CardTitle>
        <p className="text-sm text-muted-foreground">Latest updates from your TruHeirs pages</p>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Bell className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No recent activity yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activities.map(activity => {
              const Icon = activity.icon
              return (
                <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className={`p-2 rounded-full flex-shrink-0 ${typeColors[activity.type] || 'bg-muted text-muted-foreground'}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{activity.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{activity.description}</p>
                  </div>
                  <span className="text-xs text-muted-foreground flex-shrink-0 whitespace-nowrap">{activity.time}</span>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
