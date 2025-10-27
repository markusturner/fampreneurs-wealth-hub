import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { Loader2, Shield, Lock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

interface RolePermission {
  id: string
  role: string
  permission_key: string
  permission_name: string
  permission_description: string | null
  is_granted: boolean
}

// Master list of all possible permissions
const ALL_PERMISSIONS = [
  { key: 'view_all_users', name: 'View All Users', description: 'Can view all user accounts and profiles' },
  { key: 'manage_users', name: 'Manage Users', description: 'Can edit and delete user accounts' },
  { key: 'send_notifications', name: 'Send Notifications', description: 'Can send mass notifications to users' },
  { key: 'view_analytics', name: 'View Analytics', description: 'Can view platform analytics and metrics' },
  { key: 'manage_meetings', name: 'Manage Meetings', description: 'Can manage all meetings and sessions' },
  { key: 'access_admin_panel', name: 'Access Admin Panel', description: 'Can access the admin panel' },
  { key: 'view_dashboard', name: 'View Dashboard', description: 'Can access main dashboard' },
  { key: 'manage_family', name: 'Manage Family', description: 'Can manage family members and governance' },
  { key: 'view_documents', name: 'View Documents', description: 'Can access family documents' },
  { key: 'manage_investments', name: 'Manage Investments', description: 'Can manage investment accounts' },
  { key: 'view_calendar', name: 'View Calendar', description: 'Can access family calendar' },
  { key: 'create_meetings', name: 'Create Meetings', description: 'Can schedule family meetings' },
  { key: 'view_announcements', name: 'View Announcements', description: 'Can view family announcements' },
  { key: 'view_contacts', name: 'View Contacts', description: 'Can view family contact information' },
  { key: 'request_documents', name: 'Request Documents', description: 'Can request access to documents' },
  { key: 'manage_roles', name: 'Manage Roles', description: 'Can manage role permissions' },
  { key: 'zapier_integration', name: 'Zapier Integration', description: 'Can access Zapier integration' },
  { key: 'full_system_access', name: 'Full System Access', description: 'Complete control over all platform features' },
]

const ALL_ROLES = ['owner', 'admin', 'trustee', 'family_member']

const roleColors: Record<string, { bg: string; text: string }> = {
  owner: { bg: '#22c55e', text: '#ffffff' },
  admin: { bg: '#ef4444', text: '#ffffff' },
  trustee: { bg: '#2eb2ff', text: '#290a52' },
  family_member: { bg: '#ffb500', text: '#290a52' }
}

const roleDescriptions: Record<string, string> = {
  owner: 'Complete control over all platform features including role management',
  admin: 'Full administrative access to user management and platform settings',
  trustee: 'Access to family governance, documents, and investment management',
  family_member: 'Limited access to announcements, contacts, and document requests'
}

export function RolePermissionsManager() {
  const [permissions, setPermissions] = useState<RolePermission[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [savingPermissions, setSavingPermissions] = useState<Set<string>>(new Set())
  const { toast } = useToast()

  useEffect(() => {
    fetchPermissions()
  }, [])

  const fetchPermissions = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('role_permissions')
        .select('*')
        .order('role', { ascending: true })
        .order('permission_name', { ascending: true })

      if (error) throw error

      setPermissions(data || [])
    } catch (error: any) {
      console.error('Error fetching permissions:', error)
      toast({
        title: "Error",
        description: "Failed to load role permissions",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handlePermissionToggle = async (role: string, permissionKey: string, currentPermission: RolePermission | undefined) => {
    const permId = currentPermission?.id || `temp-${role}-${permissionKey}`
    setSavingPermissions(prev => new Set(prev).add(permId))
    
    try {
      if (currentPermission) {
        // Update existing permission
        const { error } = await supabase
          .from('role_permissions')
          .update({ is_granted: !currentPermission.is_granted })
          .eq('id', currentPermission.id)

        if (error) throw error

        setPermissions(prev => 
          prev.map(p => p.id === currentPermission.id ? { ...p, is_granted: !currentPermission.is_granted } : p)
        )
      } else {
        // Create new permission
        const masterPerm = ALL_PERMISSIONS.find(p => p.key === permissionKey)
        if (!masterPerm) return

        const { data, error } = await supabase
          .from('role_permissions')
          .insert({
            role,
            permission_key: permissionKey,
            permission_name: masterPerm.name,
            permission_description: masterPerm.description,
            is_granted: true
          })
          .select()
          .single()

        if (error) throw error

        setPermissions(prev => [...prev, data])
      }

      toast({
        title: "Success",
        description: "Permission updated successfully"
      })
    } catch (error: any) {
      console.error('Error updating permission:', error)
      toast({
        title: "Error",
        description: "Failed to update permission",
        variant: "destructive"
      })
    } finally {
      setSavingPermissions(prev => {
        const next = new Set(prev)
        next.delete(permId)
        return next
      })
    }
  }

  const groupedPermissions = permissions.reduce((acc, perm) => {
    if (!acc[perm.role]) {
      acc[perm.role] = []
    }
    acc[perm.role].push(perm)
    return acc
  }, {} as Record<string, RolePermission[]>)

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <CardTitle>Role Permissions Management</CardTitle>
        </div>
        <CardDescription>
          Configure what each role can access and do in the platform. Changes take effect immediately.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-lg bg-muted p-4 flex items-start gap-3">
          <Lock className="h-5 w-5 text-primary mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium">Owner-Only Access</p>
            <p className="text-sm text-muted-foreground">
              Only users with the Owner role can view and modify these permission settings.
              Be careful when adjusting permissions as they directly affect user access.
            </p>
          </div>
        </div>

        <Accordion type="single" collapsible className="w-full space-y-4">
          {ALL_ROLES.map((role) => {
            const rolePerms = groupedPermissions[role] || []
            const grantedCount = rolePerms.filter(p => p.is_granted).length
            const colors = roleColors[role] || { bg: '#6b7280', text: '#ffffff' }

            return (
              <AccordionItem key={role} value={role} className="border rounded-lg">
                <AccordionTrigger className="px-4 hover:no-underline">
                  <div className="flex items-center justify-between w-full pr-4">
                    <div className="flex items-center gap-3">
                      <Badge 
                        style={{ 
                          backgroundColor: colors.bg, 
                          color: colors.text,
                          border: 'none'
                        }}
                        className="text-sm"
                      >
                        {role.replace('_', ' ').toUpperCase()}
                      </Badge>
                      <div className="text-left">
                        <p className="text-sm font-medium">
                          {grantedCount} of {ALL_PERMISSIONS.length} permissions enabled
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {roleDescriptions[role] || 'Custom role'}
                        </p>
                      </div>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Permission</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">Access</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {ALL_PERMISSIONS.map((masterPerm) => {
                          const existingPerm = rolePerms.find(p => p.permission_key === masterPerm.key)
                          const permId = existingPerm?.id || `temp-${role}-${masterPerm.key}`
                          const isSaving = savingPermissions.has(permId)
                          const isGranted = existingPerm?.is_granted || false

                          return (
                            <TableRow key={masterPerm.key}>
                              <TableCell className="font-medium">
                                {masterPerm.name}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {masterPerm.description}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  {isSaving && (
                                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                  )}
                                  <Switch
                                    checked={isGranted}
                                    onCheckedChange={() => handlePermissionToggle(role, masterPerm.key, existingPerm)}
                                    disabled={isSaving}
                                  />
                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </AccordionContent>
              </AccordionItem>
            )
          })}
        </Accordion>
      </CardContent>
    </Card>
  )
}
