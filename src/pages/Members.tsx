import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'
import { AddFamilyMemberDialog } from '@/components/dashboard/add-family-member-dialog'
import { EditFamilyMemberDialog } from '@/components/dashboard/edit-family-member-dialog'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { 
  UserPlus, Mail, Phone, Edit, Trash2, Users, Crown, Clock, Activity
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface FamilyMember {
  id: string
  added_by: string
  full_name: string
  family_position: string
  relationship_to_family: string | null
  email: string | null
  phone: string | null
  birthday: string | null
  trust_positions: string[] | null
  status: string | null
  is_invited: boolean | null
  notes: string | null
  created_at: string
  updated_at: string | null
  joined_at: string | null
  invitation_sent_at: string | null
  last_accessed: string | null
}

function getRelativeTime(dateStr: string | null): string {
  if (!dateStr) return 'Never'
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true })
  } catch {
    return 'Unknown'
  }
}

// Simple daily activity chart for last 7 days
function DailyActivityChart({ memberId }: { memberId: string }) {
  const [activity, setActivity] = useState<number[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchActivity = async () => {
      // Generate activity from audit logs for this member
      const days: number[] = []
      const now = new Date()
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now)
        date.setDate(date.getDate() - i)
        const dayStart = new Date(date.setHours(0, 0, 0, 0)).toISOString()
        const dayEnd = new Date(date.setHours(23, 59, 59, 999)).toISOString()
        
        const { count } = await supabase
          .from('family_office_audit_logs')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', dayStart)
          .lte('created_at', dayEnd)
          .eq('record_id', memberId)

        days.push(count || 0)
      }
      setActivity(days)
      setLoading(false)
    }

    fetchActivity()
  }, [memberId])

  const dayLabels = useMemo(() => {
    const labels: string[] = []
    const now = new Date()
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      labels.push(d.toLocaleDateString('en', { weekday: 'short' }))
    }
    return labels
  }, [])

  const maxVal = Math.max(...activity, 1)

  if (loading) {
    return <div className="h-24 flex items-center justify-center text-xs text-muted-foreground">Loading activity...</div>
  }

  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
        <Activity className="h-3 w-3" /> Daily Activity (Last 7 Days)
      </p>
      <div className="flex items-end gap-1 h-16">
        {activity.map((val, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div
              className="w-full rounded-sm bg-accent/70 transition-all min-h-[2px]"
              style={{ height: `${Math.max((val / maxVal) * 100, 5)}%` }}
              title={`${val} actions`}
            />
            <span className="text-[9px] text-muted-foreground">{dayLabels[i]}</span>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground mt-1 text-center">
        {activity.reduce((a, b) => a + b, 0)} total actions this week
      </p>
    </div>
  )
}

export default function Members() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([])
  const [inviterNames, setInviterNames] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [showAddFamilyDialog, setShowAddFamilyDialog] = useState(false)
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null)
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set())
  const [viewingMember, setViewingMember] = useState<FamilyMember | null>(null)
  const [now, setNow] = useState(new Date())

  // Live-update relative timestamps every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    fetchMembers()
    const channel = supabase
      .channel('family_members_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'family_members' }, () => fetchMembers())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user?.id])

  useEffect(() => {
    const handleFamilyMemberAdded = () => fetchMembers()
    window.addEventListener('familyMemberAdded', handleFamilyMemberAdded)
    return () => window.removeEventListener('familyMemberAdded', handleFamilyMemberAdded)
  }, [])

  const fetchMembers = async () => {
    if (!user?.id) { setLoading(false); return }
    try {
      const { data: familyData, error: membersError } = await supabase
        .from('family_members')
        .select('*')
        .eq('added_by', user.id)
        .is('office_role', null)
        .order('created_at', { ascending: false })

      const inviterIds = [...new Set((familyData || []).map(m => m.added_by))]
      let inviterMap: Record<string, string> = {}
      if (inviterIds.length > 0) {
        const { data: inviterProfiles } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name, display_name')
          .in('user_id', inviterIds)
        if (inviterProfiles) {
          inviterMap = Object.fromEntries(inviterProfiles.map(p => [
            p.user_id,
            p.display_name || `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Unknown'
          ]))
        }
      }
      if (membersError) throw membersError
      setFamilyMembers(familyData || [])
      setInviterNames(inviterMap)
    } catch (error) {
      console.error('Error fetching members:', error)
      toast({ title: "Error", description: "Failed to fetch members", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (member: FamilyMember) => {
    if (member.joined_at) return <Badge variant="default" className="bg-green-100 text-green-800">Accepted</Badge>
    if (member.invitation_sent_at || member.is_invited) return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Invited</Badge>
    if (member.status === 'pending') return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Pending</Badge>
    return <Badge variant="outline" className="bg-gray-100 text-gray-800">Not Invited</Badge>
  }

  const handleDeleteFamilyMember = async (memberId: string) => {
    try {
      const memberToDelete = familyMembers.find(m => m.id === memberId)
      if (!memberToDelete) throw new Error('Family member not found')

      const { error } = await supabase.from('family_members').delete().eq('id', memberId)
      if (error) throw error

      if (memberToDelete.email) {
        try {
          const { data: profiles } = await supabase.from('profiles').select('user_id').eq('email', memberToDelete.email).maybeSingle()
          if (profiles?.user_id) await supabase.functions.invoke('delete-user', { body: { userId: profiles.user_id } })
        } catch {}
      }

      setFamilyMembers(prev => prev.filter(m => m.id !== memberId))
      setSelectedMembers(prev => { const s = new Set(prev); s.delete(memberId); return s })
      toast({ title: "Success", description: "Family member deleted successfully" })
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete family member", variant: "destructive" })
    }
  }

  const handleDeleteSelected = async () => {
    if (selectedMembers.size === 0) return
    try {
      const memberIds = Array.from(selectedMembers)
      const { error } = await supabase.from('family_members').delete().in('id', memberIds)
      if (error) throw error

      for (const memberId of memberIds) {
        const member = familyMembers.find(m => m.id === memberId)
        if (member?.email) {
          try {
            const { data: profiles } = await supabase.from('profiles').select('user_id').eq('email', member.email).maybeSingle()
            if (profiles?.user_id) await supabase.functions.invoke('delete-user', { body: { userId: profiles.user_id } })
          } catch {}
        }
      }

      setFamilyMembers(prev => prev.filter(m => !selectedMembers.has(m.id)))
      setSelectedMembers(new Set())
      toast({ title: "Success", description: `${memberIds.length} member(s) deleted successfully` })
    } catch {
      toast({ title: "Error", description: "Failed to delete selected members", variant: "destructive" })
    }
  }

  const toggleSelectMember = (memberId: string) => {
    setSelectedMembers(prev => {
      const s = new Set(prev)
      if (s.has(memberId)) s.delete(memberId); else s.add(memberId)
      return s
    })
  }

  const toggleSelectAll = () => {
    if (selectedMembers.size === familyMembers.length) setSelectedMembers(new Set())
    else setSelectedMembers(new Set(familyMembers.map(m => m.id)))
  }

  const handleUpdateFamilyMember = async (updatedMember: Partial<FamilyMember> & { id: string }) => {
    try {
      const { error } = await supabase
        .from('family_members')
        .update({
          full_name: updatedMember.full_name,
          email: updatedMember.email,
          phone: updatedMember.phone,
          family_position: updatedMember.family_position,
          relationship_to_family: updatedMember.relationship_to_family,
          trust_positions: updatedMember.trust_positions,
          governance_branch: (updatedMember as any).governance_branch,
          notes: updatedMember.notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', updatedMember.id)
      if (error) throw error

      setFamilyMembers(prev => prev.map(m => m.id === updatedMember.id ? { ...m, ...updatedMember, updated_at: new Date().toISOString() } : m))
      setEditingMember(null)
      toast({ title: "Success", description: "Family member updated successfully" })
    } catch {
      toast({ title: "Error", description: "Failed to update family member", variant: "destructive" })
    }
  }

  const handleResendInvitation = async (member: FamilyMember) => {
    if (!member.email) {
      toast({ title: "Error", description: "No email address available", variant: "destructive" })
      return
    }
    try {
      const { data, error } = await supabase.functions.invoke('send-family-member-invitation', {
        body: {
          familyMemberId: member.id,
          email: member.email,
          firstName: member.full_name.split(' ')[0],
          lastName: member.full_name.split(' ').slice(1).join(' '),
          familyPosition: member.family_position || 'Family Member',
          isResend: true
        }
      })
      if (data && (data as any).success === false) {
        toast({ title: 'Email not sent', description: (data as any).hint || 'Email service not configured.', variant: 'destructive' })
        return
      }
      if (error) throw error

      await supabase.from('family_members').update({ invitation_sent_at: new Date().toISOString(), is_invited: true }).eq('id', member.id)
      setFamilyMembers(prev => prev.map(m => m.id === member.id ? { ...m, invitation_sent_at: new Date().toISOString(), is_invited: true } : m))
      toast({ title: "Invitation Resent", description: `Invitation resent to ${member.full_name}` })
    } catch {
      toast({ title: "Error", description: "Failed to resend invitation.", variant: "destructive" })
    }
  }

  const getTrustPositionColor = (position: string) => {
    const colors: Record<string, string> = {
      'Trustee': 'bg-blue-100 text-blue-800',
      'Beneficiary': 'bg-green-100 text-green-800',
      'Protector': 'bg-purple-100 text-purple-800',
      'Investment Committee Member': 'bg-orange-100 text-orange-800',
      'Distribution Committee Member': 'bg-red-100 text-red-800',
      'Advisory Board Member': 'bg-gray-100 text-gray-800'
    }
    return colors[position] || 'bg-gray-100 text-gray-800'
  }

  const getMostRecentActivity = (member: FamilyMember): string => {
    const dates = [member.updated_at, member.last_accessed, member.joined_at, member.invitation_sent_at].filter(Boolean) as string[]
    if (dates.length === 0) return member.created_at
    return dates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0]
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6 max-w-5xl">
        <div className="flex flex-col gap-2">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Members</h1>
          <p className="text-sm text-muted-foreground">Manage your family and professional team members</p>
        </div>

        <div className="space-y-4 sm:space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base sm:text-lg font-semibold">Family Members</h2>
              <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Manage your family directory and relationships</p>
            </div>
            <Button onClick={() => setShowAddFamilyDialog(true)} className="flex items-center gap-2 text-sm h-9" size="sm">
              <UserPlus className="h-4 w-4" />
              <span className="hidden xs:inline">Add Family Member</span>
              <span className="xs:hidden">Add Member</span>
            </Button>
          </div>

          {familyMembers.length > 0 && (
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <Checkbox id="select-all" checked={selectedMembers.size === familyMembers.length && familyMembers.length > 0} onCheckedChange={toggleSelectAll} />
                <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                  Select All ({selectedMembers.size}/{familyMembers.length})
                </label>
              </div>
              {selectedMembers.size > 0 && (
                <Button variant="destructive" size="sm" onClick={handleDeleteSelected} className="ml-auto">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Selected ({selectedMembers.size})
                </Button>
              )}
            </div>
          )}

          <div className="grid gap-4">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-4"><div className="h-4 bg-muted rounded w-1/3 mb-4" /><div className="h-3 bg-muted rounded w-2/3" /></CardContent>
                  </Card>
                ))}
              </div>
            ) : familyMembers.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <Users className="h-8 w-8 mx-auto mb-3 text-muted-foreground opacity-50" />
                  <h3 className="text-base font-medium mb-2">No family members added</h3>
                  <p className="text-sm text-muted-foreground">Start building your family directory</p>
                </CardContent>
              </Card>
            ) : (
              familyMembers.map((member) => (
                <Card key={member.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setViewingMember(member)}>
                  <CardContent className="p-2 sm:p-3 md:p-4">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
                      <div className="flex items-center gap-3 sm:items-start">
                        <Checkbox
                          checked={selectedMembers.has(member.id)}
                          onCheckedChange={() => toggleSelectMember(member.id)}
                          className="mt-1"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <Avatar className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0">
                          <AvatarImage src="" />
                          <AvatarFallback className="bg-primary/10 text-xs sm:text-sm">
                            {member.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-sm sm:text-base truncate">{member.full_name}</h3>
                            {member.family_position === 'Head of Family' && <Crown className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-500 flex-shrink-0" />}
                            {getStatusBadge(member)}
                          </div>
                          <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-xs sm:text-sm text-muted-foreground mt-1">
                            {member.family_position && <Badge variant="secondary" className="text-xs">{member.family_position}</Badge>}
                            {member.relationship_to_family && <span className="text-xs">• {member.relationship_to_family}</span>}
                            {inviterNames[member.added_by] && (
                              <span className="text-xs">• Invited by <span className="font-medium">{inviterNames[member.added_by]}</span></span>
                            )}
                          </div>
                          {/* Live relative timestamp */}
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1" key={now.getTime()}>
                            <Clock className="h-3 w-3" />
                            <span>Active {getRelativeTime(getMostRecentActivity(member))}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 sm:ml-auto sm:flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                        {member.email && (
                          <Button variant="outline" size="sm" onClick={() => handleResendInvitation(member)} className="text-xs h-8 px-2" disabled={!!member.joined_at}>
                            <Mail className="h-3 w-3 sm:mr-1" />
                            <span className="hidden sm:inline">{member.joined_at ? 'Accepted' : 'Resend'}</span>
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => setEditingMember(member)} className="h-8 w-8 p-0">
                          <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteFamilyMember(member.id)} className="h-8 w-8 p-0">
                          <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                      </div>
                    </div>

                    {member.trust_positions && member.trust_positions.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {member.trust_positions.map(position => (
                          <Badge key={position} variant="outline" className={`text-xs ${getTrustPositionColor(position)}`}>{position}</Badge>
                        ))}
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground mt-3">
                      {member.email && <div className="flex items-center gap-1 min-w-0"><Mail className="h-3 w-3 flex-shrink-0" /><span className="truncate">{member.email}</span></div>}
                      {member.phone && <div className="flex items-center gap-1"><Phone className="h-3 w-3 flex-shrink-0" /><span>{member.phone}</span></div>}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Member Profile Dialog */}
        <Dialog open={!!viewingMember} onOpenChange={() => setViewingMember(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/10">
                    {viewingMember?.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p>{viewingMember?.full_name}</p>
                  <p className="text-xs font-normal text-muted-foreground">{viewingMember?.family_position}</p>
                </div>
              </DialogTitle>
              <DialogDescription>Member profile and activity overview</DialogDescription>
            </DialogHeader>

            {viewingMember && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Status</p>
                    <div className="mt-1">{getStatusBadge(viewingMember)}</div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Last Active</p>
                    <p className="font-medium flex items-center gap-1 mt-1">
                      <Clock className="h-3 w-3" /> {getRelativeTime(getMostRecentActivity(viewingMember))}
                    </p>
                  </div>
                  {viewingMember.email && (
                    <div className="col-span-2">
                      <p className="text-xs text-muted-foreground">Email</p>
                      <p className="font-medium">{viewingMember.email}</p>
                    </div>
                  )}
                  {viewingMember.phone && (
                    <div>
                      <p className="text-xs text-muted-foreground">Phone</p>
                      <p className="font-medium">{viewingMember.phone}</p>
                    </div>
                  )}
                  {viewingMember.relationship_to_family && (
                    <div>
                      <p className="text-xs text-muted-foreground">Relationship</p>
                      <p className="font-medium">{viewingMember.relationship_to_family}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-muted-foreground">Added</p>
                    <p className="font-medium">{getRelativeTime(viewingMember.created_at)}</p>
                  </div>
                </div>

                {viewingMember.trust_positions && viewingMember.trust_positions.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Trust Positions</p>
                    <div className="flex flex-wrap gap-1">
                      {viewingMember.trust_positions.map(p => (
                        <Badge key={p} variant="outline" className={`text-xs ${getTrustPositionColor(p)}`}>{p}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Daily Activity Chart */}
                <DailyActivityChart memberId={viewingMember.id} />

                {viewingMember.notes && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Notes</p>
                    <p className="text-sm bg-muted/50 rounded-lg p-3">{viewingMember.notes}</p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        <AddFamilyMemberDialog open={showAddFamilyDialog} onOpenChange={setShowAddFamilyDialog} />
        <EditFamilyMemberDialog member={editingMember} onClose={() => setEditingMember(null)} onUpdate={handleUpdateFamilyMember} />
      </div>
    </div>
  )
}
