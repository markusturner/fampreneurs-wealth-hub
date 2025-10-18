import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { Loader2, UserPlus, Shield } from 'lucide-react'

type UserRole = 'trustee' | 'family_office_member' | 'family_member'

export function AdminUserManagement() {
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [role, setRole] = useState<UserRole>('family_member')
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
        title: 'User Created Successfully!',
        description: `${firstName} ${lastName} has been added as ${role.replace(/_/g, ' ')}. Login credentials are being sent to ${email}.`,
      })

      // Reset form
      setEmail('')
      setFirstName('')
      setLastName('')
      setRole('family_member')
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
          Add users to the platform manually without requiring payment
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

        <Button onClick={handleAddUser} disabled={isLoading} className="w-full">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Adding User...
            </>
          ) : (
            <>
              <UserPlus className="mr-2 h-4 w-4" />
              Add User
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
