import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Settings, DollarSign, Gift } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'

interface UserSessionQuotaDialogProps {
  onQuotaUpdated: () => void
}

interface User {
  user_id: string
  display_name: string | null
  first_name: string | null
  last_name: string | null
}

interface Program {
  id: string
  name: string
  monthly_individual_calls: number | null
}

interface SessionQuota {
  id: string
  user_id: string
  program_id: string | null
  monthly_complimentary_sessions: number
  complimentary_sessions_used: number
  period_start: string
  period_end: string
  profiles?: {
    display_name: string | null
  } | null
  programs?: {
    name: string
  } | null
}

export function UserSessionQuotaDialog({ onQuotaUpdated }: UserSessionQuotaDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [programs, setPrograms] = useState<Program[]>([])
  const [quotas, setQuotas] = useState<SessionQuota[]>([])
  const [formData, setFormData] = useState({
    user_id: '',
    program_id: '',
    monthly_complimentary_sessions: '3'
  })
  const { toast } = useToast()

  useEffect(() => {
    if (open) {
      loadData()
    }
  }, [open])

  const loadData = async () => {
    try {
      // Load users
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('user_id, display_name, first_name, last_name')
        .order('display_name')

      if (usersError) throw usersError

      // Load programs
      const { data: programsData, error: programsError } = await supabase
        .from('programs')
        .select('*')
        .eq('is_active', true)
        .order('name')

      if (programsError) throw programsError

      // Load existing quotas for current month
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

      const { data: quotasData, error: quotasError } = await supabase
        .from('user_session_quotas')
        .select(`
          *,
          profiles:user_id (display_name),
          programs:program_id (name)
        `)
        .gte('period_start', startOfMonth.toISOString().split('T')[0])
        .lte('period_end', endOfMonth.toISOString().split('T')[0])

      if (quotasError) throw quotasError

      setUsers(usersData || [])
      setPrograms(programsData || [])
      setQuotas((quotasData as any) || [])
    } catch (error: any) {
      toast({
        title: "Error loading data",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

      const { error } = await supabase
        .from('user_session_quotas')
        .upsert({
          user_id: formData.user_id,
          program_id: formData.program_id || null,
          monthly_complimentary_sessions: parseInt(formData.monthly_complimentary_sessions),
          complimentary_sessions_used: 0,
          period_start: startOfMonth.toISOString().split('T')[0],
          period_end: endOfMonth.toISOString().split('T')[0]
        }, {
          onConflict: 'user_id,program_id,period_start'
        })

      if (error) throw error

      toast({
        title: "Session quota updated",
        description: "User session quota has been successfully configured.",
      })

      setFormData({
        user_id: '',
        program_id: '',
        monthly_complimentary_sessions: '3'
      })
      
      loadData() // Reload data to show updated quotas
      onQuotaUpdated()
    } catch (error: any) {
      toast({
        title: "Error updating quota",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Settings className="h-4 w-4 mr-2" />
          Manage Session Quotas
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage User Session Quotas</DialogTitle>
          <DialogDescription>
            Configure complimentary 1-on-1 session quotas for users based on their programs.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Add New Quota Form */}
          <Card>
            <CardHeader>
              <CardTitle>Add/Update Session Quota</CardTitle>
              <CardDescription>
                Set the number of complimentary 1-on-1 sessions for a user this month.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="user_id">User</Label>
                  <Select value={formData.user_id} onValueChange={(value) => setFormData({ ...formData, user_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a user" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.user_id} value={user.user_id}>
                          {user.display_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Unknown User'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="program_id">Program (optional)</Label>
                  <Select value={formData.program_id} onValueChange={(value) => setFormData({ ...formData, program_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a program (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No specific program</SelectItem>
                      {programs.map((program) => (
                        <SelectItem key={program.id} value={program.id}>
                          {program.name} ({program.monthly_individual_calls || 0} sessions/month)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="monthly_complimentary_sessions">Monthly Complimentary Sessions</Label>
                  <Input
                    id="monthly_complimentary_sessions"
                    type="number"
                    min="0"
                    max="50"
                    value={formData.monthly_complimentary_sessions}
                    onChange={(e) => setFormData({ ...formData, monthly_complimentary_sessions: e.target.value })}
                    required
                  />
                </div>

                <Button type="submit" disabled={loading}>
                  {loading ? 'Saving...' : 'Save Quota'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Current Quotas */}
          <Card>
            <CardHeader>
              <CardTitle>Current Month Quotas</CardTitle>
              <CardDescription>
                Session quotas for the current month.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {quotas.length === 0 ? (
                  <p className="text-muted-foreground">No quotas configured for this month.</p>
                ) : (
                  quotas.map((quota) => (
                    <div key={quota.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">
                          {(quota.profiles as any)?.display_name || 'Unknown User'}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Program: {(quota.programs as any)?.name || 'No specific program'}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="flex items-center space-x-1">
                          <Gift className="h-3 w-3" />
                          <span>{quota.complimentary_sessions_used}/{quota.monthly_complimentary_sessions} used</span>
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}