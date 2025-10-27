import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
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

  const handlePermissionToggle = async (permissionId: string, currentValue: boolean) => {
    setSavingPermissions(prev => new Set(prev).add(permissionId))
    
    try {
      const { error } = await supabase
        .from('role_permissions')
        .update({ is_granted: !currentValue })
        .eq('id', permissionId)

      if (error) throw error

      setPermissions(prev => 
        prev.map(p => p.id === permissionId ? { ...p, is_granted: !currentValue } : p)
      )

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
        next.delete(permissionId)
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

  const roles = Object.keys(groupedPermissions).sort()

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
          {roles.map((role) => {
            const rolePerms = groupedPermissions[role]
            const grantedCount = rolePerms.filter(p => p.is_granted).length
            const totalCount = rolePerms.length
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
                          {grantedCount} of {totalCount} permissions enabled
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
                        {rolePerms.map((perm) => {
                          const isSaving = savingPermissions.has(perm.id)
                          const isOwnerRole = role === 'owner'

                          return (
                            <TableRow key={perm.id}>
                              <TableCell className="font-medium">
                                {perm.permission_name}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {perm.permission_description || 'No description'}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  {isSaving && (
                                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                  )}
                                  <Switch
                                    checked={perm.is_granted}
                                    onCheckedChange={() => handlePermissionToggle(perm.id, perm.is_granted)}
                                    disabled={isSaving || isOwnerRole}
                                  />
                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                  {role === 'owner' && (
                    <div className="mt-3 text-xs text-muted-foreground flex items-center gap-2">
                      <Lock className="h-3 w-3" />
                      Owner permissions cannot be modified to maintain system security
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            )
          })}
        </Accordion>
      </CardContent>
    </Card>
  )
}
