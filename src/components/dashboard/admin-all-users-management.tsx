import { useState, useEffect, useCallback, useMemo } from 'react'
import { useDebounce } from '@/hooks/useDebounce'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { Loader2, Users, Search, Pencil, Trash2, Eye, UserCog, Mail, Plus, X, Crown, DollarSign, ArrowLeft, ChevronRight, CheckSquare, Phone, Check, FileText, StickyNote, Calendar } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { useIsMobile } from '@/hooks/use-mobile'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'

interface UserProfile {
  user_id: string
  email: string
  first_name: string | null
  last_name: string | null
  display_name: string | null
  phone: string | null
  mailing_address: string | null
  truheirs_access: boolean
  program_name: string | null
  membership_type: string | null
  is_admin: boolean
  is_moderator: boolean
  created_at: string
  subscription_tier?: string | null
  subscription_period?: string | null
  subscribed?: boolean
  program_contract_value?: number | null
  program_cash_collected?: number | null
  stripe_subscription_id?: string | null
}

export function AdminAllUsersManagement() {
  const isMobile = useIsMobile()
  const [mobileSelectedUser, setMobileSelectedUser] = useState<UserProfile | null>(null)
  const [users, setUsers] = useState<UserProfile[]>([])
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [filterRole, setFilterRole] = useState<string>('all')
  const [filterProgram, setFilterProgram] = useState<string>('all')
  const [filterTruheirs, setFilterTruheirs] = useState<string>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [syncingStripe, setSyncingStripe] = useState(false)
  const [fetchTrigger, setFetchTrigger] = useState(0)
  const debouncedFetchTrigger = useDebounce(fetchTrigger, 800)
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null)
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null)
  const [previewUser, setPreviewUser] = useState<UserProfile | null>(null)
  const [resendingCredentialsId, setResendingCredentialsId] = useState<string | null>(null)
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set())
  const [bulkResending, setBulkResending] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [programOptions, setProgramOptions] = useState<string[]>([
    'The Family Business University',
    'The Family Vault',
    'The Family Business Accelerator',
    'The Family Legacy: VIP Weekend',
    'The Family Fortune Mastermind'
  ])
  const [managingPrograms, setManagingPrograms] = useState(false)
  const [newProgramName, setNewProgramName] = useState('')
  const [editingProgramIndex, setEditingProgramIndex] = useState<number | null>(null)
  const [editingProgramValue, setEditingProgramValue] = useState('')
  const [editingPhoneUserId, setEditingPhoneUserId] = useState<string | null>(null)
  const [editingPhoneValue, setEditingPhoneValue] = useState('')
  const [savingPhone, setSavingPhone] = useState(false)
  // Editable joined date
  const [editingJoinedUserId, setEditingJoinedUserId] = useState<string | null>(null)
  const [editingJoinedValue, setEditingJoinedValue] = useState('')
  const [savingJoined, setSavingJoined] = useState(false)
  // Admin notes
  const [notesUserId, setNotesUserId] = useState<string | null>(null)
  const [notesValue, setNotesValue] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)
  // User forms dialog
  const [formsUserId, setFormsUserId] = useState<string | null>(null)
  const [formsData, setFormsData] = useState<{onboarding: any, agreements: any[], trustForms: any[]}>({ onboarding: null, agreements: [], trustForms: [] })
  const [loadingForms, setLoadingForms] = useState(false)
  // Financial inline editing
  const [editingFinanceUserId, setEditingFinanceUserId] = useState<string | null>(null)
  const [editingFinanceField, setEditingFinanceField] = useState<'contract_value' | 'cash_collected' | 'stripe_sub' | null>(null)
  const [editingFinanceValue, setEditingFinanceValue] = useState('')
  const [savingFinance, setSavingFinance] = useState(false)
  const { toast } = useToast()

  const syncStripeData = async (silent = false) => {
    if (!silent) setSyncingStripe(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-sync-stripe');
      
      if (error) throw error;
      
      console.log('Stripe sync completed:', data);
      
      // Always refresh after sync
      await fetchUsers();
      
      if (!silent) {
        toast({
          title: "Sync Complete",
          description: `Successfully synced ${data.synced} subscriptions`,
        });
      }
    } catch (error) {
      console.error('Error syncing Stripe:', error);
      if (!silent) {
        toast({
          title: "Sync Failed",
          description: "Failed to sync Stripe data",
          variant: "destructive",
        });
      }
    } finally {
      if (!silent) setSyncingStripe(false);
    }
  };

  const fetchUsers = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data: profilesData, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      // Fetch subscription data for all users
      const { data: subscribersData } = await supabase
        .from('subscribers')
        .select('user_id, subscription_tier, subscription_period, subscribed')

      // Merge subscription data with profiles
      const usersWithSubscriptions = (profilesData || []).map(profile => {
        const subscription = subscribersData?.find(sub => sub.user_id === profile.user_id)
        
        return {
          ...profile,
          subscription_tier: subscription?.subscription_tier || null,
          subscription_period: subscription?.subscription_period || null,
          subscribed: subscription?.subscribed === true
        }
      })

      setUsers(usersWithSubscriptions)
      setFilteredUsers(usersWithSubscriptions)
    } catch (error: any) {
      console.error('Error fetching users:', error)
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  useEffect(() => {
    // Start with initial data fetch, then sync in background
    const initializeData = async () => {
      await fetchUsers();
      // Sync Stripe data after initial load (silent)
      await syncStripeData(true);
    };
    
    initializeData();
    
    // Set up realtime subscription for both profiles and subscribers changes
    const profilesChannel = supabase
      .channel('profiles_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles'
        },
        () => {
          setFetchTrigger(prev => prev + 1)
        }
      )
      .subscribe()

    const subscribersChannel = supabase
      .channel('subscribers_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'subscribers'
        },
        () => {
          setFetchTrigger(prev => prev + 1)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(profilesChannel)
      supabase.removeChannel(subscribersChannel)
    }
  }, [fetchUsers])

  // Debounced fetch effect
  useEffect(() => {
    if (debouncedFetchTrigger > 0) {
      fetchUsers()
    }
  }, [debouncedFetchTrigger, fetchUsers])

  useEffect(() => {
    const filtered = users.filter(user => {
      const searchLower = searchQuery.toLowerCase()
      const matchesSearch = !searchQuery || (
        user.email?.toLowerCase().includes(searchLower) ||
        user.first_name?.toLowerCase().includes(searchLower) ||
        user.last_name?.toLowerCase().includes(searchLower) ||
        user.display_name?.toLowerCase().includes(searchLower) ||
        user.program_name?.toLowerCase().includes(searchLower)
      )

      const matchesRole = filterRole === 'all' ||
        (filterRole === 'owner' && user.is_moderator) ||
        (filterRole === 'admin' && user.is_admin) ||
        (filterRole === 'trustee' && (user.membership_type === 'trustee' || (!user.is_admin && !user.is_moderator && user.membership_type !== 'family_member'))) ||
        (filterRole === 'family_member' && user.membership_type === 'family_member')

      const matchesProgram = filterProgram === 'all' || user.program_name === filterProgram

      const matchesTruheirs = filterTruheirs === 'all' ||
        (filterTruheirs === 'yes' && user.truheirs_access !== false) ||
        (filterTruheirs === 'no' && user.truheirs_access === false)

      return matchesSearch && matchesRole && matchesProgram && matchesTruheirs
    })
    setFilteredUsers(filtered)
  }, [searchQuery, users, filterRole, filterProgram, filterTruheirs])
  const handleUpdateUser = async () => {
    if (!editingUser) return

    console.log('Updating user with membership_type:', editingUser.membership_type)

    try {
      // Update profile fields
      const { data: updatedData, error: profileError } = await supabase
        .from('profiles')
        .update({
          first_name: editingUser.first_name,
          last_name: editingUser.last_name,
          display_name: editingUser.display_name,
          phone: editingUser.phone,
          mailing_address: editingUser.mailing_address,
          truheirs_access: editingUser.truheirs_access,
          program_name: editingUser.program_name,
          membership_type: editingUser.membership_type,
          is_admin: editingUser.is_admin,
          is_moderator: editingUser.is_moderator,
        })
        .eq('user_id', editingUser.user_id)
        .select()

      if (profileError) {
        console.error('Profile update error:', profileError)
        throw profileError
      }

      console.log('Profile updated successfully:', updatedData)

      // Auto-assign community group membership based on program
      if (editingUser.program_name) {
        const programToCommunityMap: Record<string, string> = {
          'The Family Business University': 'fbu',
          'The Family Vault': 'tfv',
          'The Family Business Accelerator': 'tfba',
          'The Family Fortune Mastermind': 'tffm',
        }
        const programId = programToCommunityMap[editingUser.program_name]
        if (programId) {
          // Find the community group for this program
          const { data: groups } = await supabase
            .from('community_groups')
            .select('id')
            .eq('program_id', programId)
          
          if (groups && groups.length > 0) {
            for (const group of groups) {
              await supabase
                .from('group_memberships' as any)
                .upsert({
                  user_id: editingUser.user_id,
                  group_id: group.id,
                  role: 'member',
                }, { onConflict: 'user_id,group_id' })
            }
          }
          console.log(`Auto-assigned user to ${programId} community`)
        }
      }

      // Update admin role
      if (editingUser.is_admin) {
        const { error: adminError } = await supabase.rpc('assign_admin_role', {
          target_user_id: editingUser.user_id,
          assigner_user_id: (await supabase.auth.getUser()).data.user?.id
        })
        if (adminError) console.error('Admin role error:', adminError)
      }

      // Update owner role
      if (editingUser.is_moderator) {
        // Add owner role
        const { error: ownerError } = await supabase
          .from('user_roles')
          .upsert({
            user_id: editingUser.user_id,
            role: 'owner',
            assigned_by: (await supabase.auth.getUser()).data.user?.id
          }, {
            onConflict: 'user_id,role'
          })
        if (ownerError) console.error('Owner role error:', ownerError)
      } else {
        // Remove owner role
        const { error: removeOwnerError } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', editingUser.user_id)
          .eq('role', 'owner')
        if (removeOwnerError) console.error('Remove owner role error:', removeOwnerError)
      }

      toast({
        title: "Success",
        description: "User updated successfully"
      })
      
      setEditingUser(null)
      
      // Refresh the user list
      await fetchUsers()
      console.log('Users refreshed after update')
    } catch (error: any) {
      console.error('Error updating user:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to update user",
        variant: "destructive"
      })
    }
  }

  const handleDeleteUser = async () => {
    if (!deletingUserId) return

    try {
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { userId: deletingUserId }
      })

      if (error) throw error
      if (data?.error) throw new Error(data.error)

      toast({
        title: "Success",
        description: "User deleted successfully"
      })
      
      setDeletingUserId(null)
      fetchUsers()
    } catch (error: any) {
      console.error('Error deleting user:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive"
      })
    }
  }

  const handleResendCredentials = async (user: UserProfile) => {
    setResendingCredentialsId(user.user_id)
    try {
      const { data, error } = await supabase.functions.invoke('create-user-with-credentials', {
        body: {
          email: user.email,
          firstName: user.first_name || '',
          lastName: user.last_name || '',
          role: user.membership_type || 'trustee'
        }
      })

      if (error) throw error
      if (data?.error) throw new Error(data.error)

      toast({
        title: "Success",
        description: `Login credentials sent to ${user.email}`
      })
    } catch (error: any) {
      console.error('Error resending credentials:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to resend credentials",
        variant: "destructive"
      })
    } finally {
      setResendingCredentialsId(null)
    }
  }

  // Multi-select helpers
  const toggleSelectUser = (userId: string) => {
    setSelectedUserIds(prev => {
      const s = new Set(prev)
      if (s.has(userId)) s.delete(userId); else s.add(userId)
      return s
    })
  }

  const toggleSelectAll = () => {
    if (selectedUserIds.size === filteredUsers.length) {
      setSelectedUserIds(new Set())
    } else {
      setSelectedUserIds(new Set(filteredUsers.map(u => u.user_id)))
    }
  }

  const handleBulkResendCredentials = async () => {
    if (selectedUserIds.size === 0) return
    setBulkResending(true)
    let successCount = 0
    let failCount = 0
    for (const userId of selectedUserIds) {
      const u = users.find(usr => usr.user_id === userId)
      if (!u) continue
      try {
        const { error } = await supabase.functions.invoke('create-user-with-credentials', {
          body: { email: u.email, firstName: u.first_name || '', lastName: u.last_name || '', role: u.membership_type || 'trustee' }
        })
        if (error) throw error
        successCount++
      } catch {
        failCount++
      }
    }
    setBulkResending(false)
    setSelectedUserIds(new Set())
    toast({
      title: "Bulk Resend Complete",
      description: `Sent to ${successCount} user(s)${failCount > 0 ? `, ${failCount} failed` : ''}`
    })
  }

  const handleBulkDelete = async () => {
    if (selectedUserIds.size === 0) return
    setBulkDeleting(true)
    let successCount = 0
    for (const userId of selectedUserIds) {
      try {
        const { error } = await supabase.functions.invoke('delete-user', { body: { userId } })
        if (!error) successCount++
      } catch {}
    }
    setBulkDeleting(false)
    setSelectedUserIds(new Set())
    fetchUsers()
    toast({ title: "Bulk Delete Complete", description: `Deleted ${successCount} user(s)` })
  }

  const handleAddProgram = () => {
    if (newProgramName.trim() && !programOptions.includes(newProgramName.trim())) {
      setProgramOptions([...programOptions, newProgramName.trim()])
      setNewProgramName('')
      toast({
        title: "Success",
        description: "Program added successfully"
      })
    }
  }

  const handleEditProgram = (index: number) => {
    setEditingProgramIndex(index)
    setEditingProgramValue(programOptions[index])
  }

  const handleSaveEditProgram = () => {
    if (editingProgramIndex !== null && editingProgramValue.trim()) {
      const updatedOptions = [...programOptions]
      updatedOptions[editingProgramIndex] = editingProgramValue.trim()
      setProgramOptions(updatedOptions)
      setEditingProgramIndex(null)
      setEditingProgramValue('')
      toast({
        title: "Success",
        description: "Program updated successfully"
      })
    }
  }

  const handleDeleteProgram = (index: number) => {
    const updatedOptions = programOptions.filter((_, i) => i !== index)
    setProgramOptions(updatedOptions)
    toast({
      title: "Success",
      description: "Program deleted successfully"
    })
  }

  const handleSaveInlinePhone = async (userId: string) => {
    setSavingPhone(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ phone: editingPhoneValue })
        .eq('user_id', userId)
      if (error) throw error
      toast({ title: 'Phone Updated', description: 'Phone number saved successfully' })
      setEditingPhoneUserId(null)
      setEditingPhoneValue('')
      await fetchUsers()
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to save phone', variant: 'destructive' })
    } finally {
      setSavingPhone(false)
    }
  }

  const handleSaveInlineJoined = async (userId: string) => {
    setSavingJoined(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ admin_joined_date: editingJoinedValue || null } as any)
        .eq('user_id', userId)
      if (error) throw error
      toast({ title: 'Joined Date Updated', description: 'Date saved successfully' })
      setEditingJoinedUserId(null)
      setEditingJoinedValue('')
      await fetchUsers()
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to save date', variant: 'destructive' })
    } finally {
      setSavingJoined(false)
    }
  }

  const handleSaveNotes = async (userId: string) => {
    setSavingNotes(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ admin_notes: notesValue || null } as any)
        .eq('user_id', userId)
      if (error) throw error
      toast({ title: 'Notes Saved' })
      setNotesUserId(null)
      setNotesValue('')
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to save notes', variant: 'destructive' })
    } finally {
      setSavingNotes(false)
    }
  }

  const handleOpenForms = async (userId: string) => {
    setFormsUserId(userId)
    setLoadingForms(true)
    try {
      const [onboardingRes, agreementsRes, trustRes] = await Promise.all([
        supabase.from('onboarding_submissions' as any).select('*').eq('user_id', userId).maybeSingle(),
        supabase.from('program_agreements' as any).select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('trust_form_submissions' as any).select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      ])
      setFormsData({
        onboarding: onboardingRes.data,
        agreements: agreementsRes.data || [],
        trustForms: trustRes.data || [],
      })
    } catch (err) {
      console.error('Error fetching forms:', err)
    } finally {
      setLoadingForms(false)
    }
  }

  const handleSaveFinance = async (userId: string) => {
    setSavingFinance(true)
    try {
      const updateData: any = {}
      if (editingFinanceField === 'contract_value') {
        const val = editingFinanceValue.replace(/,/g, '')
        updateData.program_contract_value = val ? Number(val) : null
      } else if (editingFinanceField === 'cash_collected') {
        const val = editingFinanceValue.replace(/,/g, '')
        updateData.program_cash_collected = val ? Number(val) : null
      } else if (editingFinanceField === 'stripe_sub') {
        updateData.stripe_subscription_id = editingFinanceValue || null
      }
      const { error } = await supabase.from('profiles').update(updateData).eq('user_id', userId)
      if (error) throw error
      toast({ title: 'Updated', description: 'Financial data saved' })
      setEditingFinanceUserId(null)
      setEditingFinanceField(null)
      setEditingFinanceValue('')
      await fetchUsers()
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to save', variant: 'destructive' })
    } finally {
      setSavingFinance(false)
    }
  }

  const formatCurrency = (val: number | null | undefined) => {
    if (val === null || val === undefined) return '—'
    return '$' + val.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
  }

  const getRemainingBalance = (user: UserProfile) => {
    const contract = (user as any).program_contract_value ?? 0
    const collected = (user as any).program_cash_collected ?? 0
    return contract - collected
  }

  const syncStripeSubscriptions = async () => {
    setSyncingStripe(true)
    try {
      const { data, error } = await supabase.functions.invoke('admin-sync-stripe')
      
      if (error) throw error

      toast({
        title: "Stripe Sync Complete",
        description: `Synced ${data.synced} trustees successfully. ${data.errors > 0 ? `${data.errors} errors.` : ''}`,
      })

      await fetchUsers()
    } catch (error: any) {
      console.error('Error syncing Stripe:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to sync Stripe subscriptions",
        variant: "destructive"
      })
    } finally {
      setSyncingStripe(false)
    }
  }

  const getRoleBadges = (user: UserProfile) => {
    const badges = []
    if (user.is_moderator) badges.push(
      <Badge key="owner" style={{ backgroundColor: '#22c55e', color: '#ffffff', border: 'none' }}>
        <Crown className="h-3 w-3 mr-1" />
        Owner
      </Badge>
    )
    if (user.is_admin) badges.push(<Badge key="admin" variant="destructive">Admin</Badge>)
    if (user.membership_type === 'trustee') badges.push(
      <Badge key="trustee" style={{ backgroundColor: '#2eb2ff', color: '#290a52', border: 'none' }}>
        Trustee
      </Badge>
    )
    if (user.membership_type === 'family_member') badges.push(
      <Badge key="family" style={{ backgroundColor: '#ffb500', color: '#290a52', border: 'none' }}>
        Family Member
      </Badge>
    )
    if (badges.length === 0) badges.push(
      <Badge key="user" style={{ backgroundColor: '#2eb2ff', color: '#290a52', border: 'none' }}>
        Trustee
      </Badge>
    )
    return badges
  }

  const getPackageInfo = useCallback((user: UserProfile) => {
    // Check for active subscription first - use explicit === true check
    if (user.subscribed === true && user.subscription_tier) {
      // Map tier names from Stripe to display names
      const tierMap: Record<string, string> = {
        'Starter': 'Starter',
        'Professional': 'Professional', 
        'Enterprise': 'Enterprise'
      }

      // Pricing: Starter $97/mo, Professional $247/qtr, Enterprise $897/yr
      const tierPricing: Record<string, string> = {
        'Starter': '$97/mo',
        'Professional': '$247/qtr',
        'Enterprise': '$897/yr'
      }

      const packageName = tierMap[user.subscription_tier] || user.subscription_tier
      const amount = tierPricing[user.subscription_tier] || 'N/A'

      return { package: packageName, amount }
    }

    // No active subscription
    return { package: 'Free', amount: '$0' }
  }, [])

  const getUserViewDescription = (user: UserProfile) => {
    if (user.is_moderator) {
      return "Owner access: Complete control over all platform features including admin management, system settings, and ownership activities. Can manage admins and access Zapier integration."
    }
    if (user.is_admin) {
      return "Full admin access: Can see all users, manage settings, send notifications, and access all features (excluding ownership activities)."
    }
    if (user.membership_type === 'trustee') {
      return "Trustee view: Access to family governance, documents, calendar, investment management, and family constitution features."
    }
    if (user.membership_type === 'family_member') {
      return "Family member view: Limited access to announcements, contacts, document requests, and basic family information."
    }
    return "Standard trustee view: Access to community features, courses, messages, and basic platform functionality."
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" style={{ color: '#ffb500' }} />
            <CardTitle>All Users Management</CardTitle>
          </div>
          <CardDescription>
            View, edit, and manage all trustees and family members in the system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 justify-between">
              <div className="flex items-center gap-2 flex-1">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or program..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="max-w-md"
                />
              </div>
              <Button
                onClick={syncStripeSubscriptions}
                disabled={syncingStripe}
                variant="outline"
                size="sm"
              >
                {syncingStripe ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <DollarSign className="h-4 w-4 mr-2" />
                    Sync Stripe Data
                  </>
                )}
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger className="w-[140px] h-8 text-xs">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="owner">Owner</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="trustee">Trustee</SelectItem>
                  <SelectItem value="family_member">Family Member</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterProgram} onValueChange={setFilterProgram}>
                <SelectTrigger className="w-[200px] h-8 text-xs">
                  <SelectValue placeholder="Program" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Programs</SelectItem>
                  {programOptions.map(p => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterTruheirs} onValueChange={setFilterTruheirs}>
                <SelectTrigger className="w-[140px] h-8 text-xs">
                  <SelectValue placeholder="TruHeirs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All TruHeirs</SelectItem>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>

              {(filterRole !== 'all' || filterProgram !== 'all' || filterTruheirs !== 'all') && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => { setFilterRole('all'); setFilterProgram('all'); setFilterTruheirs('all') }}
                >
                  <X className="h-3 w-3 mr-1" />
                  Clear Filters
                </Button>
              )}

              <span className="text-xs text-muted-foreground ml-auto">
                {filteredUsers.length} of {users.length} users
              </span>
            </div>

            {/* Bulk action bar */}
            {selectedUserIds.size > 0 && (
              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border">
                <Checkbox checked={selectedUserIds.size === filteredUsers.length && filteredUsers.length > 0} onCheckedChange={toggleSelectAll} />
                <span className="text-sm font-medium">{selectedUserIds.size} selected</span>
                <div className="ml-auto flex gap-2">
                  <Button size="sm" variant="outline" onClick={handleBulkResendCredentials} disabled={bulkResending}>
                    {bulkResending ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Mail className="h-3 w-3 mr-1" />}
                    Resend Logins
                  </Button>
                  <Button size="sm" variant="destructive" onClick={handleBulkDelete} disabled={bulkDeleting}>
                    {bulkDeleting ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Trash2 className="h-3 w-3 mr-1" />}
                    Delete
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setSelectedUserIds(new Set())}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : isMobile ? (
              // Mobile: show selected user detail or name list
              mobileSelectedUser ? (
                <div className="space-y-4">
                  <Button variant="ghost" size="sm" onClick={() => setMobileSelectedUser(null)} className="flex items-center gap-1 -ml-2">
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </Button>
                  <div className="space-y-3 p-4 border rounded-lg">
                    <h3 className="font-semibold text-base break-words">
                      {mobileSelectedUser.display_name || `${mobileSelectedUser.first_name || ''} ${mobileSelectedUser.last_name || ''}`.trim() || 'N/A'}
                    </h3>
                    <div className="space-y-2.5 text-sm">
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-muted-foreground shrink-0">Email</span>
                        <span className="text-right break-all text-xs">{mobileSelectedUser.email}</span>
                      </div>
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-muted-foreground shrink-0">Phone</span>
                        {editingPhoneUserId === mobileSelectedUser.user_id ? (
                          <div className="flex items-center gap-1">
                            <Input
                              value={editingPhoneValue}
                              onChange={(e) => setEditingPhoneValue(e.target.value)}
                              placeholder="Enter phone"
                              className="h-7 w-32 text-xs"
                              onKeyDown={(e) => e.key === 'Enter' && handleSaveInlinePhone(mobileSelectedUser.user_id)}
                            />
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleSaveInlinePhone(mobileSelectedUser.user_id)} disabled={savingPhone}>
                              {savingPhone ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3 text-green-600" />}
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditingPhoneUserId(null)}>
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : mobileSelectedUser.phone ? (
                          <span className="text-right text-xs">{mobileSelectedUser.phone}</span>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs text-muted-foreground"
                            onClick={() => { setEditingPhoneUserId(mobileSelectedUser.user_id); setEditingPhoneValue('') }}
                          >
                            <Phone className="h-3 w-3 mr-1" />
                            Add
                          </Button>
                        )}
                      </div>
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-muted-foreground shrink-0">Role</span>
                        <div className="flex gap-1 flex-wrap justify-end">{getRoleBadges(mobileSelectedUser)}</div>
                      </div>
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-muted-foreground shrink-0">TruHeirs</span>
                        <Badge variant={mobileSelectedUser.truheirs_access !== false ? "default" : "secondary"} className={mobileSelectedUser.truheirs_access !== false ? "bg-green-600 text-white" : ""}>
                          {mobileSelectedUser.truheirs_access !== false ? "Yes" : "No"}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-muted-foreground shrink-0">DFO</span>
                        <div className="text-right">
                          <span className="font-medium text-xs">{getPackageInfo(mobileSelectedUser).package}</span>
                          <span className="text-xs text-muted-foreground ml-1">{getPackageInfo(mobileSelectedUser).amount}</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-muted-foreground shrink-0">Contract Value</span>
                        <span className="text-right text-xs">{formatCurrency((mobileSelectedUser as any).program_contract_value)}</span>
                      </div>
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-muted-foreground shrink-0">Cash Collected</span>
                        <span className="text-right text-xs">{formatCurrency((mobileSelectedUser as any).program_cash_collected)}</span>
                      </div>
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-muted-foreground shrink-0">Remaining</span>
                        <span className="text-right text-xs font-medium">{(mobileSelectedUser as any).program_contract_value ? formatCurrency(getRemainingBalance(mobileSelectedUser)) : '—'}</span>
                      </div>
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-muted-foreground shrink-0">Program</span>
                        <span className="text-right text-xs">{mobileSelectedUser.program_name || 'None'}</span>
                      </div>
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-muted-foreground shrink-0">Forms</span>
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => handleOpenForms(mobileSelectedUser.user_id)}>
                          <FileText className="h-3 w-3 mr-1" /> View
                        </Button>
                      </div>
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-muted-foreground shrink-0">Joined</span>
                        <button
                          className="text-xs hover:underline"
                          onClick={() => {
                            setEditingJoinedUserId(mobileSelectedUser.user_id)
                            setEditingJoinedValue((mobileSelectedUser as any).admin_joined_date || mobileSelectedUser.created_at?.split('T')[0] || '')
                          }}
                        >
                          {(mobileSelectedUser as any).admin_joined_date
                            ? new Date((mobileSelectedUser as any).admin_joined_date).toLocaleDateString()
                            : new Date(mobileSelectedUser.created_at).toLocaleDateString()}
                        </button>
                      </div>
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-muted-foreground shrink-0">Notes</span>
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setNotesUserId(mobileSelectedUser.user_id); setNotesValue((mobileSelectedUser as any).admin_notes || '') }}>
                          <StickyNote className="h-3 w-3 mr-1" /> {(mobileSelectedUser as any).admin_notes ? 'Edit' : 'Add'}
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5 pt-3 border-t">
                      <Button size="sm" variant="outline" onClick={() => setPreviewUser(mobileSelectedUser)} className="px-2">
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleResendCredentials(mobileSelectedUser)} disabled={resendingCredentialsId === mobileSelectedUser.user_id} className="px-2">
                        {resendingCredentialsId === mobileSelectedUser.user_id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingUser(mobileSelectedUser)} className="px-2">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setDeletingUserId(mobileSelectedUser.user_id)} className="text-destructive hover:text-destructive px-2">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <ScrollArea className="h-[500px]">
                  <div className="divide-y">
                    {filteredUsers.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">No users found</p>
                    ) : (
                      filteredUsers.map((user) => (
                        <button
                          key={user.user_id}
                          onClick={() => setMobileSelectedUser(user)}
                          className="flex items-center justify-between w-full px-3 py-3 text-left hover:bg-muted/50 transition-colors"
                        >
                          <span className="font-medium text-sm truncate">
                            {user.display_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'N/A'}
                          </span>
                          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                        </button>
                      ))
                    )}
                  </div>
                </ScrollArea>
              )
            ) : (
            <div className="border rounded-lg">
              <ScrollArea className="h-[500px] w-full">
                <div className="min-w-[1800px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox checked={selectedUserIds.size === filteredUsers.length && filteredUsers.length > 0} onCheckedChange={toggleSelectAll} />
                      </TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>TruHeirs</TableHead>
                      <TableHead>DFO</TableHead>
                      <TableHead>Contract Value</TableHead>
                      <TableHead>Cash Collected</TableHead>
                      <TableHead>Remaining</TableHead>
                      <TableHead>Program</TableHead>
                      <TableHead>Stripe Sub</TableHead>
                      <TableHead>Forms</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={16} className="text-center text-muted-foreground py-8">
                          No users found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredUsers.map((user) => {
                        const packageInfo = getPackageInfo(user)
                        return (
                        <TableRow key={user.user_id}>
                          <TableCell className="w-10">
                            <Checkbox checked={selectedUserIds.has(user.user_id)} onCheckedChange={() => toggleSelectUser(user.user_id)} />
                          </TableCell>
                          <TableCell className="font-medium whitespace-nowrap">
                            {user.display_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'N/A'}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {editingPhoneUserId === user.user_id ? (
                              <div className="flex items-center gap-1">
                                <Input
                                  value={editingPhoneValue}
                                  onChange={(e) => setEditingPhoneValue(e.target.value)}
                                  placeholder="Enter phone"
                                  className="h-7 w-32 text-xs"
                                  onKeyDown={(e) => e.key === 'Enter' && handleSaveInlinePhone(user.user_id)}
                                />
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleSaveInlinePhone(user.user_id)} disabled={savingPhone}>
                                  {savingPhone ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3 text-green-600" />}
                                </Button>
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditingPhoneUserId(null)}>
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : user.phone ? (
                              <span className="text-sm">{user.phone}</span>
                            ) : (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs text-muted-foreground"
                                onClick={() => { setEditingPhoneUserId(user.user_id); setEditingPhoneValue('') }}
                              >
                                <Phone className="h-3 w-3 mr-1" />
                                Add
                              </Button>
                            )}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">{user.email}</TableCell>
                          <TableCell>
                            <div className="flex gap-1 flex-wrap">
                              {getRoleBadges(user)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={user.truheirs_access !== false ? "default" : "secondary"} className={user.truheirs_access !== false ? "bg-green-600 text-white" : ""}>
                              {user.truheirs_access !== false ? "Yes" : "No"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col whitespace-nowrap">
                              <span className="font-medium">{packageInfo.package}</span>
                              <span className="text-xs text-muted-foreground">{packageInfo.amount}</span>
                            </div>
                          </TableCell>
                          {/* Contract Value */}
                          <TableCell className="whitespace-nowrap">
                            {editingFinanceUserId === user.user_id && editingFinanceField === 'contract_value' ? (
                              <div className="flex items-center gap-1">
                                <Input value={editingFinanceValue} onChange={(e) => setEditingFinanceValue(e.target.value)} placeholder="0" className="h-7 w-28 text-xs" onKeyDown={(e) => e.key === 'Enter' && handleSaveFinance(user.user_id)} />
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleSaveFinance(user.user_id)} disabled={savingFinance}>
                                  {savingFinance ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3 text-green-600" />}
                                </Button>
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setEditingFinanceUserId(null); setEditingFinanceField(null) }}>
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <button className="text-sm hover:underline" onClick={() => { setEditingFinanceUserId(user.user_id); setEditingFinanceField('contract_value'); setEditingFinanceValue(String((user as any).program_contract_value ?? '')) }}>
                                {formatCurrency((user as any).program_contract_value)}
                              </button>
                            )}
                          </TableCell>
                          {/* Cash Collected */}
                          <TableCell className="whitespace-nowrap">
                            {editingFinanceUserId === user.user_id && editingFinanceField === 'cash_collected' ? (
                              <div className="flex items-center gap-1">
                                <Input value={editingFinanceValue} onChange={(e) => setEditingFinanceValue(e.target.value)} placeholder="0" className="h-7 w-28 text-xs" onKeyDown={(e) => e.key === 'Enter' && handleSaveFinance(user.user_id)} />
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleSaveFinance(user.user_id)} disabled={savingFinance}>
                                  {savingFinance ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3 text-green-600" />}
                                </Button>
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setEditingFinanceUserId(null); setEditingFinanceField(null) }}>
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <button className="text-sm hover:underline" onClick={() => { setEditingFinanceUserId(user.user_id); setEditingFinanceField('cash_collected'); setEditingFinanceValue(String((user as any).program_cash_collected ?? '')) }}>
                                {formatCurrency((user as any).program_cash_collected)}
                              </button>
                            )}
                          </TableCell>
                          {/* Remaining Balance */}
                          <TableCell className="whitespace-nowrap">
                            <span className={`text-sm font-medium ${getRemainingBalance(user) > 0 ? 'text-orange-500' : getRemainingBalance(user) === 0 && (user as any).program_contract_value ? 'text-green-600' : ''}`}>
                              {(user as any).program_contract_value ? formatCurrency(getRemainingBalance(user)) : '—'}
                            </span>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">{user.program_name || 'None'}</TableCell>
                          {/* Stripe Subscription */}
                          <TableCell className="whitespace-nowrap">
                            {editingFinanceUserId === user.user_id && editingFinanceField === 'stripe_sub' ? (
                              <div className="flex items-center gap-1">
                                <Input value={editingFinanceValue} onChange={(e) => setEditingFinanceValue(e.target.value)} placeholder="sub_..." className="h-7 w-36 text-xs" onKeyDown={(e) => e.key === 'Enter' && handleSaveFinance(user.user_id)} />
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleSaveFinance(user.user_id)} disabled={savingFinance}>
                                  {savingFinance ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3 text-green-600" />}
                                </Button>
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setEditingFinanceUserId(null); setEditingFinanceField(null) }}>
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <button className="text-xs hover:underline text-muted-foreground" onClick={() => { setEditingFinanceUserId(user.user_id); setEditingFinanceField('stripe_sub'); setEditingFinanceValue((user as any).stripe_subscription_id || '') }}>
                                {(user as any).stripe_subscription_id ? (user as any).stripe_subscription_id.substring(0, 16) + '...' : 'Assign'}
                              </button>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs"
                              onClick={() => handleOpenForms(user.user_id)}
                            >
                              <FileText className="h-3 w-3 mr-1" />
                              View
                            </Button>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {editingJoinedUserId === user.user_id ? (
                              <div className="flex items-center gap-1">
                                <Input
                                  type="date"
                                  value={editingJoinedValue}
                                  onChange={(e) => setEditingJoinedValue(e.target.value)}
                                  className="h-7 w-32 text-xs"
                                  onKeyDown={(e) => e.key === 'Enter' && handleSaveInlineJoined(user.user_id)}
                                />
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleSaveInlineJoined(user.user_id)} disabled={savingJoined}>
                                  {savingJoined ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3 text-green-600" />}
                                </Button>
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditingJoinedUserId(null)}>
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <button
                                className="text-sm hover:underline cursor-pointer"
                                onClick={() => {
                                  setEditingJoinedUserId(user.user_id)
                                  const dateVal = (user as any).admin_joined_date || user.created_at?.split('T')[0] || ''
                                  setEditingJoinedValue(dateVal)
                                }}
                              >
                                {(user as any).admin_joined_date
                                  ? new Date((user as any).admin_joined_date).toLocaleDateString()
                                  : new Date(user.created_at).toLocaleDateString()}
                              </button>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs"
                              onClick={() => {
                                setNotesUserId(user.user_id)
                                setNotesValue((user as any).admin_notes || '')
                              }}
                            >
                              <StickyNote className="h-3 w-3 mr-1" />
                              {(user as any).admin_notes ? 'Edit' : 'Add'}
                            </Button>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setPreviewUser(user)}
                                title="Preview user view"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleResendCredentials(user)}
                                title="Resend login credentials"
                                disabled={resendingCredentialsId === user.user_id}
                              >
                                {resendingCredentialsId === user.user_id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Mail className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingUser(user)}
                                title="Edit user"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setDeletingUserId(user.user_id)}
                                title="Delete user"
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
                </div>
              </ScrollArea>
            </div>
            )}


          <div className="text-sm text-muted-foreground">
            Total users: {filteredUsers.length}
          </div>
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information and settings
            </DialogDescription>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-first-name">First Name</Label>
                  <Input
                    id="edit-first-name"
                    value={editingUser.first_name || ''}
                    onChange={(e) => setEditingUser({...editingUser, first_name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-last-name">Last Name</Label>
                  <Input
                    id="edit-last-name"
                    value={editingUser.last_name || ''}
                    onChange={(e) => setEditingUser({...editingUser, last_name: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-display-name">Display Name</Label>
                <Input
                  id="edit-display-name"
                  value={editingUser.display_name || ''}
                  onChange={(e) => setEditingUser({...editingUser, display_name: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-email">Email (Read-only)</Label>
                <Input
                  id="edit-email"
                  value={editingUser.email}
                  disabled
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-phone">Phone</Label>
                <Input
                  id="edit-phone"
                  value={editingUser.phone || ''}
                  onChange={(e) => setEditingUser({...editingUser, phone: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-membership">Membership Type</Label>
                <Select
                  value={editingUser.membership_type || ''}
                  onValueChange={(value) => setEditingUser({...editingUser, membership_type: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select membership type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trustee">Trustee</SelectItem>
                    <SelectItem value="family_member">Family Member</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <Label>User Roles</Label>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5 flex items-center gap-2">
                    <Crown className="h-4 w-4" style={{ color: '#ffb500' }} />
                    <div>
                      <Label htmlFor="is-owner">Owner Access</Label>
                      <p className="text-sm text-muted-foreground">Complete ownership control including admin management</p>
                    </div>
                  </div>
                  <Switch
                    id="is-owner"
                    checked={editingUser.is_moderator}
                    onCheckedChange={(checked) => setEditingUser({...editingUser, is_moderator: checked})}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="is-admin">Admin Access</Label>
                    <p className="text-sm text-muted-foreground">Full system access and user management (excluding ownership activities)</p>
                  </div>
                  <Switch
                    id="is-admin"
                    checked={editingUser.is_admin}
                    onCheckedChange={(checked) => setEditingUser({...editingUser, is_admin: checked})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="edit-program">Program Name</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setManagingPrograms(true)}
                  >
                    Manage Programs
                  </Button>
                </div>
                <Select
                  value={editingUser.program_name || ''}
                  onValueChange={(value) => setEditingUser({...editingUser, program_name: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a program" />
                  </SelectTrigger>
                  <SelectContent>
                    {programOptions.map((program) => (
                      <SelectItem key={program} value={program}>
                        {program}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-mailing-address">Mailing Address</Label>
                <Input
                  id="edit-mailing-address"
                  value={editingUser.mailing_address || ''}
                  onChange={(e) => setEditingUser({...editingUser, mailing_address: e.target.value})}
                  placeholder="123 Main St, City, State ZIP"
                />
              </div>

              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5">
                  <Label htmlFor="edit-truheirs-access">TruHeirs Section Access</Label>
                  <p className="text-sm text-muted-foreground">Allow access to TruHeirs dashboard, family office, and related features</p>
                </div>
                <Switch
                  id="edit-truheirs-access"
                  checked={editingUser.truheirs_access !== false}
                  onCheckedChange={(checked) => setEditingUser({...editingUser, truheirs_access: checked})}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>Cancel</Button>
            <Button onClick={handleUpdateUser}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview User View Dialog */}
      <Dialog open={!!previewUser} onOpenChange={(open) => !open && setPreviewUser(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5" />
              User View Preview
            </DialogTitle>
            <DialogDescription>
              What {previewUser?.display_name || previewUser?.first_name || 'this user'} sees
            </DialogDescription>
          </DialogHeader>
          {previewUser && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg space-y-3">
                <div>
                  <p className="text-sm font-medium">User Details:</p>
                  <p className="text-sm text-muted-foreground">
                    {previewUser.display_name || `${previewUser.first_name} ${previewUser.last_name}`}
                  </p>
                  <p className="text-sm text-muted-foreground">{previewUser.email}</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {getRoleBadges(previewUser)}
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium">Access Level:</h4>
                <p className="text-sm text-muted-foreground">
                  {getUserViewDescription(previewUser)}
                </p>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Available Features by Tab:</h4>
                
                {previewUser.is_admin ? (
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium mb-2">🏠 Dashboard</p>
                      <div className="flex flex-wrap gap-1 ml-4">
                        <Badge variant="secondary" className="text-xs">✓ Full Access</Badge>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-2">🏛️ Family Office</p>
                      <div className="flex flex-wrap gap-1 ml-4">
                        <Badge variant="secondary" className="text-xs">✓ Full Access</Badge>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-2">📜 Family Constitution</p>
                      <div className="flex flex-wrap gap-1 ml-4">
                        <Badge variant="secondary" className="text-xs">✓ Full Access</Badge>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-2">📅 Calendar</p>
                      <div className="flex flex-wrap gap-1 ml-4">
                        <Badge variant="secondary" className="text-xs">✓ Full Access</Badge>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-2">👥 Members</p>
                      <div className="flex flex-wrap gap-1 ml-4">
                        <Badge variant="secondary" className="text-xs">✓ Full Access</Badge>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-2">⚙️ Admin Features</p>
                      <div className="flex flex-wrap gap-1 ml-4">
                        <Badge variant="secondary" className="text-xs">✓ User Management</Badge>
                        <Badge variant="secondary" className="text-xs">✓ Mass Notifications</Badge>
                        <Badge variant="secondary" className="text-xs">✓ System Settings</Badge>
                      </div>
                    </div>
                  </div>
                ) : previewUser.membership_type === 'trustee' ? (
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium mb-2">🏠 Dashboard</p>
                      <div className="flex flex-wrap gap-1 ml-4">
                        <Badge variant="secondary" className="text-xs">✓ Overview</Badge>
                        <Badge variant="secondary" className="text-xs">✓ Analytics</Badge>
                        <Badge variant="secondary" className="text-xs">✓ Quick Actions</Badge>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-2">🏛️ Family Office</p>
                      <div className="flex flex-wrap gap-1 ml-4">
                        <Badge variant="secondary" className="text-xs">✓ Governance</Badge>
                        <Badge variant="secondary" className="text-xs">✓ Documents</Badge>
                        <Badge variant="secondary" className="text-xs">✓ Investments</Badge>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-2">📜 Family Constitution</p>
                      <div className="flex flex-wrap gap-1 ml-4">
                        <Badge variant="secondary" className="text-xs">✓ Setup & Edit</Badge>
                        <Badge variant="secondary" className="text-xs">✓ View & Review</Badge>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-2">📅 Calendar</p>
                      <div className="flex flex-wrap gap-1 ml-4">
                        <Badge variant="secondary" className="text-xs">✓ Meetings</Badge>
                        <Badge variant="secondary" className="text-xs">✓ Events</Badge>
                        <Badge variant="secondary" className="text-xs">✓ Scheduling</Badge>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-2">👥 Members</p>
                      <div className="flex flex-wrap gap-1 ml-4">
                        <Badge variant="secondary" className="text-xs">✓ Family Directory</Badge>
                        <Badge variant="secondary" className="text-xs">✓ Scoreboard</Badge>
                      </div>
                    </div>
                  </div>
                ) : previewUser.membership_type === 'family_member' ? (
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium mb-2">🏠 Dashboard</p>
                      <div className="flex flex-wrap gap-1 ml-4">
                        <Badge variant="outline" className="text-xs">✓ View Only</Badge>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-2">🏛️ Family Office</p>
                      <div className="flex flex-wrap gap-1 ml-4">
                        <Badge variant="outline" className="text-xs">✓ View Only</Badge>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-2">📜 Family Constitution</p>
                      <div className="flex flex-wrap gap-1 ml-4">
                        <Badge variant="outline" className="text-xs">✓ View Only</Badge>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-2">📅 Calendar</p>
                      <div className="flex flex-wrap gap-1 ml-4">
                        <Badge variant="outline" className="text-xs">✓ View Only</Badge>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-2">👥 Members</p>
                      <div className="flex flex-wrap gap-1 ml-4">
                        <Badge variant="outline" className="text-xs">✓ View Only</Badge>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium mb-2">🏠 Dashboard</p>
                      <div className="flex flex-wrap gap-1 ml-4">
                        <Badge variant="secondary" className="text-xs">✓ Overview</Badge>
                        <Badge variant="secondary" className="text-xs">✓ Analytics</Badge>
                        <Badge variant="secondary" className="text-xs">✓ Quick Actions</Badge>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-2">🏛️ Family Office</p>
                      <div className="flex flex-wrap gap-1 ml-4">
                        <Badge variant="secondary" className="text-xs">✓ Governance</Badge>
                        <Badge variant="secondary" className="text-xs">✓ Documents</Badge>
                        <Badge variant="secondary" className="text-xs">✓ Investments</Badge>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-2">📜 Family Constitution</p>
                      <div className="flex flex-wrap gap-1 ml-4">
                        <Badge variant="secondary" className="text-xs">✓ Setup & Edit</Badge>
                        <Badge variant="secondary" className="text-xs">✓ View & Review</Badge>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-2">📅 Calendar</p>
                      <div className="flex flex-wrap gap-1 ml-4">
                        <Badge variant="secondary" className="text-xs">✓ Meetings</Badge>
                        <Badge variant="secondary" className="text-xs">✓ Events</Badge>
                        <Badge variant="secondary" className="text-xs">✓ Scheduling</Badge>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-2">👥 Members</p>
                      <div className="flex flex-wrap gap-1 ml-4">
                        <Badge variant="secondary" className="text-xs">✓ Family Directory</Badge>
                        <Badge variant="secondary" className="text-xs">✓ Scoreboard</Badge>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setPreviewUser(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingUserId} onOpenChange={(open) => !open && setDeletingUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this user and all their associated data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Manage Programs Dialog */}
      <Dialog open={managingPrograms} onOpenChange={setManagingPrograms}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Program Options</DialogTitle>
            <DialogDescription>
              Add, edit, or delete program options for the dropdown menu
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Add New Program */}
            <div className="flex gap-2">
              <Input
                placeholder="Enter new program name"
                value={newProgramName}
                onChange={(e) => setNewProgramName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddProgram()}
              />
              <Button onClick={handleAddProgram} size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Program List */}
            <ScrollArea className="h-[300px] border rounded-lg p-2">
              <div className="space-y-2">
                {programOptions.map((program, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 rounded hover:bg-accent">
                    {editingProgramIndex === index ? (
                      <>
                        <Input
                          value={editingProgramValue}
                          onChange={(e) => setEditingProgramValue(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSaveEditProgram()}
                          className="flex-1"
                        />
                        <Button onClick={handleSaveEditProgram} size="sm" variant="ghost">
                          Save
                        </Button>
                        <Button onClick={() => setEditingProgramIndex(null)} size="sm" variant="ghost">
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 text-sm">{program}</span>
                        <Button onClick={() => handleEditProgram(index)} size="sm" variant="ghost">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          onClick={() => handleDeleteProgram(index)} 
                          size="sm" 
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          <DialogFooter>
            <Button onClick={() => setManagingPrograms(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Admin Notes Dialog */}
      <Dialog open={!!notesUserId} onOpenChange={(open) => !open && setNotesUserId(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <StickyNote className="h-5 w-5" />
              Admin Notes
            </DialogTitle>
            <DialogDescription>
              Add notes or descriptions for this user (supports rich text formatting)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={notesValue}
              onChange={(e) => setNotesValue(e.target.value)}
              placeholder="Enter notes about this user... (supports **bold**, *italic*, - lists)"
              rows={8}
              className="font-mono text-sm"
            />
            <div className="text-xs text-muted-foreground">
              Tip: Use **bold**, *italic*, - for lists, # for headings
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotesUserId(null)}>Cancel</Button>
            <Button onClick={() => notesUserId && handleSaveNotes(notesUserId)} disabled={savingNotes}>
              {savingNotes ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Save Notes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Forms Dialog */}
      <Dialog open={!!formsUserId} onOpenChange={(open) => !open && setFormsUserId(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              User Forms & Submissions
            </DialogTitle>
            <DialogDescription>
              {users.find(u => u.user_id === formsUserId)?.display_name || 'User'}'s onboarding form, agreements, and trust forms
            </DialogDescription>
          </DialogHeader>
          {loadingForms ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Onboarding Form */}
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <Badge variant="secondary">Onboarding Form</Badge>
                  {formsData.onboarding ? (
                    <Badge className="bg-green-600 text-white">Completed</Badge>
                  ) : (
                    <Badge variant="outline">Not Submitted</Badge>
                  )}
                </h4>
                {formsData.onboarding && (
                  <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
                    {Object.entries(formsData.onboarding).filter(([key]) => !['id', 'user_id', 'created_at', 'updated_at'].includes(key)).map(([key, value]) => (
                      <div key={key} className="flex justify-between gap-4 border-b border-border/30 pb-1">
                        <span className="text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</span>
                        <span className="text-right font-medium">{String(value || 'N/A')}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Program Agreements */}
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <Badge variant="secondary">Program Agreements</Badge>
                  <Badge className={formsData.agreements.length > 0 ? "bg-green-600 text-white" : ""} variant={formsData.agreements.length > 0 ? "default" : "outline"}>
                    {formsData.agreements.length > 0 ? `${formsData.agreements.length} Signed` : 'None'}
                  </Badge>
                </h4>
                {formsData.agreements.map((agreement: any) => (
                  <div key={agreement.id} className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
                    {Object.entries(agreement).filter(([key]) => !['id', 'user_id'].includes(key)).map(([key, value]) => (
                      <div key={key} className="flex justify-between gap-4 border-b border-border/30 pb-1">
                        <span className="text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</span>
                        <span className="text-right font-medium max-w-[60%] break-words">{String(value || 'N/A')}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              {/* Trust Forms */}
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <Badge variant="secondary">Trust Forms</Badge>
                  <Badge className={formsData.trustForms.length > 0 ? "bg-green-600 text-white" : ""} variant={formsData.trustForms.length > 0 ? "default" : "outline"}>
                    {formsData.trustForms.length > 0 ? `${formsData.trustForms.length} Submitted` : 'None'}
                  </Badge>
                </h4>
                {formsData.trustForms.map((form: any) => (
                  <div key={form.id} className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
                    {Object.entries(form).filter(([key]) => !['id', 'user_id'].includes(key)).map(([key, value]) => (
                      <div key={key} className="flex justify-between gap-4 border-b border-border/30 pb-1">
                        <span className="text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</span>
                        <span className="text-right font-medium max-w-[60%] break-words">
                          {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value || 'N/A')}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setFormsUserId(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
