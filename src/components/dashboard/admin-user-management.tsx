import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { Loader2, UserPlus, Shield } from 'lucide-react'

type UserRole = 'trustee' | 'family_office_member' | 'family_member'

const PROGRAM_OPTIONS = [
  'The Family Business University',
  'The Family Vault',
  'The Family Business Accelerator',
  'The Family Legacy: VIP Weekend',
  'The Family Fortune Mastermind',
]

export function AdminUserManagement() {
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [role, setRole] = useState<UserRole>('family_member')
  const [programName, setProgramName] = useState('')
  const [mailingAddress, setMailingAddress] = useState('')
  const [truHeirsAccess, setTruHeirsAccess] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleAddUser = async () => {
    if (!email || !firstName || !lastName || !role) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all fields',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)

    try {
      console.log("Attempting to create user:", { email, firstName, lastName, role });
      
      const { data, error } = await supabase.functions.invoke('create-user-with-credentials', {
        body: {
          email,
          firstName,
          lastName,
          role,
          programName: programName || undefined,
          mailingAddress: mailingAddress || undefined,
          truHeirsAccess,
        },
      })

      console.log("Function response:", { data, error });

      if (error) {
        console.error("Function error:", error);
        throw new Error("Failed to create user. Please check the logs for details.");
      }

      // Check if the response indicates failure
      if (data?.success === false || data?.error) {
        console.error("Data error:", data.error);
        throw new Error(data.error || "Failed to create user");
      }

      toast({
        title: data.isExistingUser ? 'Credentials Updated!' : 'User Created Successfully!',
        description: data.isExistingUser
          ? `New credentials have been sent to ${email}`
          : `${firstName} ${lastName} has been added as ${role.replace(/_/g, ' ')}.`,
      })

      // Reset form
      setEmail('')
      setFirstName('')
      setLastName('')
      setRole('family_member')
      setProgramName('')
      setMailingAddress('')
      setTruHeirsAccess(true)
    } catch (error: any) {
      console.error('Error adding user:', error)
      
      let errorMessage = 'Failed to add user. Please try again.'
      
      if (error.message?.includes('Failed to fetch')) {
        errorMessage = 'The user creation service is still deploying. Please wait 2-3 minutes and try again.'
      } else if (error.message) {
        errorMessage = error.message
      }
      
      toast({
        title: 'Error Adding User',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5" style={{ color: '#ffb500' }} />
          <CardTitle>Admin User Management</CardTitle>
        </div>
        <CardDescription>
          Add new users or resend credentials to existing users by entering their information
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="firstName">First Name</Label>
            <Input
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="John"
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name</Label>
            <Input
              id="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Doe"
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email Address</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@example.com"
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="role">User Role</Label>
          <Select value={role} onValueChange={(value) => setRole(value as UserRole)} disabled={isLoading}>
            <SelectTrigger id="role">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="trustee">Trustee</SelectItem>
              <SelectItem value="family_office_member">Family Office Member</SelectItem>
              <SelectItem value="family_member">Family Member</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="program">Program</Label>
          <Select value={programName} onValueChange={setProgramName} disabled={isLoading}>
            <SelectTrigger id="program">
              <SelectValue placeholder="Select a program (optional)" />
            </SelectTrigger>
            <SelectContent>
              {PROGRAM_OPTIONS.map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="mailingAddress">Mailing Address</Label>
          <Input
            id="mailingAddress"
            value={mailingAddress}
            onChange={(e) => setMailingAddress(e.target.value)}
            placeholder="123 Main St, City, State ZIP"
            disabled={isLoading}
          />
        </div>

        <div className="flex items-center justify-between py-2">
          <div className="space-y-0.5">
            <Label htmlFor="truheirs-access">TruHeirs Section Access</Label>
            <p className="text-sm text-muted-foreground">Allow access to TruHeirs dashboard, family office, and related features</p>
          </div>
          <Switch
            id="truheirs-access"
            checked={truHeirsAccess}
            onCheckedChange={setTruHeirsAccess}
            disabled={isLoading}
          />
        </div>

        <Button onClick={handleAddUser} disabled={isLoading} className="w-full">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <UserPlus className="mr-2 h-4 w-4" />
              Add / Resend Credentials
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
