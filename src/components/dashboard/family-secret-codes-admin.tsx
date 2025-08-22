import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { 
  Plus, 
  CalendarIcon, 
  Eye, 
  EyeOff, 
  Trash2, 
  Users, 
  Shield, 
  Crown, 
  Copy,
  Activity,
  RotateCcw,
  Edit
} from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/contexts/AuthContext"
import { toast } from "sonner"

interface FamilyCode {
  id: string
  code: string
  description: string
  access_level: string
  permissions: any
  is_active: boolean
  expires_at: string | null
  max_uses: number | null
  current_uses: number
  created_at: string
  updated_at: string
}

interface CodeUsage {
  id: string
  used_by: string
  used_at: string
  profiles?: {
    display_name?: string
    email?: string
  } | null
}

const ACCESS_LEVELS = [
  { value: 'basic', label: 'Basic Access', icon: Users, color: 'bg-blue-500' },
  { value: 'trust', label: 'Trust Documents', icon: Shield, color: 'bg-emerald-500' },
  { value: 'legacy', label: 'Legacy Meetings', icon: Crown, color: 'bg-purple-500' },
  { value: 'admin', label: 'Administrative', icon: Shield, color: 'bg-red-500' }
]

export function FamilySecretCodesAdmin() {
  const { user, profile } = useAuth()
  const [codes, setCodes] = useState<FamilyCode[]>([])
  const [usageLogs, setUsageLogs] = useState<Record<string, CodeUsage[]>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingCode, setEditingCode] = useState<FamilyCode | null>(null)
  const [showCodeValue, setShowCodeValue] = useState<Record<string, boolean>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Form state
  const [formData, setFormData] = useState({
    code: '',
    description: '',
    access_level: 'basic' as const,
    expires_at: null as Date | null,
    max_uses: null as number | null
  })

  const isAdmin = profile?.is_admin || false

  useEffect(() => {
    if (isAdmin) {
      fetchCodes()
    }
  }, [isAdmin])

  const fetchCodes = async () => {
    try {
      const { data, error } = await supabase
        .from('family_secret_codes')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setCodes(data || [])
    } catch (error) {
      console.error('Error fetching codes:', error)
      toast.error('Failed to load family codes')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchUsageLog = async (codeId: string) => {
    try {
      const { data: usageData, error } = await supabase
        .from('family_code_usage_log')
        .select('*')
        .eq('code_id', codeId)
        .order('used_at', { ascending: false })
        .limit(10)

      if (error) throw error

      // Fetch user profiles separately
      const userIds = usageData?.map(u => u.used_by) || []
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, display_name, email')
          .in('user_id', userIds)

        // Combine usage data with profiles
        const enrichedData = usageData?.map(usage => ({
          ...usage,
          profiles: profilesData?.find(p => p.user_id === usage.used_by) || null
        })) || []

        setUsageLogs(prev => ({ ...prev, [codeId]: enrichedData }))
      } else {
        setUsageLogs(prev => ({ ...prev, [codeId]: [] }))
      }
    } catch (error) {
      console.error('Error fetching usage log:', error)
    }
  }

  const generateRandomCode = (length: number = 12) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let result = ''
    
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
      // Add dashes every 4 characters (except at the end)
      if ((i + 1) % 4 === 0 && i < length - 1) {
        result += '-'
      }
    }
    
    setFormData(prev => ({ ...prev, code: result }))
  }

  const openEditDialog = (code: FamilyCode) => {
    setEditingCode(code)
    setFormData({
      code: code.code,
      description: code.description,
      access_level: code.access_level as any,
      expires_at: code.expires_at ? new Date(code.expires_at) : null,
      max_uses: code.max_uses
    })
    setShowEditDialog(true)
  }

  const handleEditCode = async () => {
    if (!formData.code || !formData.description || !editingCode) {
      toast.error('Please fill in all required fields')
      return
    }

    try {
      const { error } = await supabase
        .from('family_secret_codes')
        .update({
          code: formData.code.toUpperCase(),
          description: formData.description,
          access_level: formData.access_level,
          expires_at: formData.expires_at?.toISOString(),
          max_uses: formData.max_uses
        })
        .eq('id', editingCode.id)

      if (error) throw error

      toast.success('Family code updated successfully')
      setShowEditDialog(false)
      setEditingCode(null)
      setFormData({
        code: '',
        description: '',
        access_level: 'basic',
        expires_at: null,
        max_uses: null
      })
      fetchCodes()
    } catch (error: any) {
      console.error('Error updating code:', error)
      toast.error(error.message?.includes('duplicate') ? 'Code already exists' : 'Failed to update code')
    }
  }

  const handleCreateCode = async () => {
    if (!formData.code || !formData.description) {
      toast.error('Please fill in all required fields')
      return
    }
    if (!user?.id) {
      toast.error('Please sign in to create a code')
      return
    }

    setIsSubmitting(true)
    try {
      const { error } = await supabase
        .from('family_secret_codes')
        .insert({
          created_by: user.id,
          code: formData.code.toUpperCase(),
          description: formData.description,
          access_level: 'basic', // Default to basic access since selector was removed
          expires_at: formData.expires_at?.toISOString(),
          max_uses: formData.max_uses,
          permissions: {}
        })

      if (error) throw error

      toast.success('Family code created successfully')
      setShowCreateDialog(false)
      setFormData({
        code: '',
        description: '',
        access_level: 'basic',
        expires_at: null,
        max_uses: null
      })
      fetchCodes()
    } catch (error: any) {
      console.error('Error creating code:', error)
      toast.error(error.message?.includes('duplicate') ? 'Code already exists' : 'Failed to create code')
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleCodeActive = async (codeId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('family_secret_codes')
        .update({ is_active: !isActive })
        .eq('id', codeId)

      if (error) throw error

      toast.success(`Code ${!isActive ? 'activated' : 'deactivated'}`)
      fetchCodes()
    } catch (error) {
      console.error('Error updating code:', error)
      toast.error('Failed to update code')
    }
  }

  const deleteCode = async (codeId: string) => {
    if (!window.confirm('Are you sure you want to delete this code?')) return

    try {
      const { error } = await supabase
        .from('family_secret_codes')
        .delete()
        .eq('id', codeId)

      if (error) throw error

      toast.success('Code deleted successfully')
      fetchCodes()
    } catch (error) {
      console.error('Error deleting code:', error)
      toast.error('Failed to delete code')
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Code copied to clipboard')
  }

  const getAccessLevelConfig = (level: string) => {
    return ACCESS_LEVELS.find(al => al.value === level) || ACCESS_LEVELS[0]
  }

  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            Administrative privileges required to manage family codes
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Family Secret Codes Management</h3>
          <p className="text-sm text-muted-foreground">
            Create and manage secure access codes for family resources
          </p>
        </div>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Code
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Family Code</DialogTitle>
              <DialogDescription>
                Generate a secure access code for family members
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">Access Code</Label>
                <div className="flex gap-2">
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                    placeholder="Enter custom code (letters/numbers)"
                    className="font-mono"
                  />
                  <Button type="button" variant="outline" onClick={() => generateRandomCode()}>
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Use any combination of letters and numbers. Any length allowed.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="What does this code provide access to?"
                  rows={3}
                />
              </div>


              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Expiration Date (Optional)</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !formData.expires_at && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.expires_at ? format(formData.expires_at, "PPP") : "No expiration"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.expires_at || undefined}
                        onSelect={(date) => setFormData(prev => ({ ...prev, expires_at: date || null }))}
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max_uses">Max Uses (Optional)</Label>
                  <Input
                    id="max_uses"
                    type="number"
                    value={formData.max_uses || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, max_uses: e.target.value ? parseInt(e.target.value) : null }))}
                    placeholder="Unlimited"
                    min="1"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={handleCreateCode} className="flex-1" disabled={isSubmitting || !formData.code || !formData.description}>
                  {isSubmitting ? 'Creating...' : 'Create Code'}
                </Button>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Family Code</DialogTitle>
              <DialogDescription>
                Update the access code and its settings
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-code">Access Code</Label>
                <div className="flex gap-2">
                  <Input
                    id="edit-code"
                    value={formData.code}
                    onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                    placeholder="Enter custom code (letters/numbers)"
                    className="font-mono"
                  />
                  <Button type="button" variant="outline" onClick={() => generateRandomCode()}>
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Use any combination of letters and numbers. Any length allowed.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="What does this code provide access to?"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-access_level">Access Level</Label>
                <Select value={formData.access_level} onValueChange={(value: any) => setFormData(prev => ({ ...prev, access_level: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACCESS_LEVELS.map((level) => (
                      <SelectItem key={level.value} value={level.value}>
                        <div className="flex items-center gap-2">
                          <level.icon className="h-4 w-4" />
                          {level.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Expiration Date (Optional)</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !formData.expires_at && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.expires_at ? format(formData.expires_at, "PPP") : "No expiration"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.expires_at || undefined}
                        onSelect={(date) => setFormData(prev => ({ ...prev, expires_at: date || null }))}
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-max_uses">Max Uses (Optional)</Label>
                  <Input
                    id="edit-max_uses"
                    type="number"
                    value={formData.max_uses || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, max_uses: e.target.value ? parseInt(e.target.value) : null }))}
                    placeholder="Unlimited"
                    min="1"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={handleEditCode} className="flex-1">
                  Update Code
                </Button>
                <Button variant="outline" onClick={() => {
                  setShowEditDialog(false)
                  setEditingCode(null)
                  setFormData({
                    code: '',
                    description: '',
                    access_level: 'basic',
                    expires_at: null,
                    max_uses: null
                  })
                }}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-8">Loading codes...</div>
      ) : codes.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">No Family Codes Created</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first family access code to get started
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Code
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {codes.map((code) => {
            const accessConfig = getAccessLevelConfig(code.access_level)
            const isExpired = code.expires_at && new Date(code.expires_at) < new Date()
            const isMaxedOut = code.max_uses && code.current_uses >= code.max_uses
            const showCode = showCodeValue[code.id]

            return (
              <Card key={code.id} className={cn(
                "transition-all",
                !code.is_active && "opacity-60",
                isExpired && "border-red-200",
                isMaxedOut && "border-orange-200"
              )}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <div className={cn("w-2 h-2 rounded-full", accessConfig.color)} />
                        <CardTitle className="text-lg">{code.description}</CardTitle>
                        {!code.is_active && (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                        {isExpired && (
                          <Badge variant="destructive">Expired</Badge>
                        )}
                        {isMaxedOut && (
                          <Badge variant="outline" className="border-orange-500 text-orange-700">
                            Max Uses Reached
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <accessConfig.icon className="h-4 w-4" />
                          {accessConfig.label}
                        </div>
                        <div className="flex items-center gap-1">
                          <Activity className="h-4 w-4" />
                          {code.current_uses} uses
                          {code.max_uses && ` / ${code.max_uses}`}
                        </div>
                        {code.expires_at && (
                          <div>
                            Expires: {format(new Date(code.expires_at), "MMM d, yyyy")}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowCodeValue(prev => ({ ...prev, [code.id]: !prev[code.id] }))}
                      >
                        {showCode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(code.code)}
                        disabled={!showCode}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(code)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleCodeActive(code.id, code.is_active)}
                      >
                        {code.is_active ? 'Deactivate' : 'Activate'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteCode(code.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-3 bg-muted rounded-lg font-mono text-center text-lg tracking-wider">
                      {showCode ? code.code : '••••-••••-••••'}
                    </div>
                    
                    <Separator />
                    
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-sm font-medium">Recent Usage</Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => fetchUsageLog(code.id)}
                        >
                          <Activity className="h-4 w-4 mr-1" />
                          Load Log
                        </Button>
                      </div>
                      
                      {usageLogs[code.id] ? (
                        usageLogs[code.id].length > 0 ? (
                          <div className="space-y-2 max-h-32 overflow-y-auto">
                            {usageLogs[code.id].map((usage) => (
                              <div key={usage.id} className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded">
                                <span>{usage.profiles?.display_name || usage.profiles?.email}</span>
                                <span className="text-muted-foreground">
                                  {format(new Date(usage.used_at), "MMM d, HH:mm")}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground text-center py-2">
                            No usage recorded yet
                          </p>
                        )
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-2">
                          Click "Load Log" to view usage history
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}