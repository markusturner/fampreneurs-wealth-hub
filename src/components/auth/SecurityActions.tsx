import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Lock, FileWarning, AlertTriangle } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

const SUPPORT_EMAIL = 'privacy@truheirs.com'

export function SecurityActions() {
  const { toast } = useToast()
  const [locking, setLocking] = useState(false)

  const handleLockAccount = async () => {
    setLocking(true)
    try {
      // Sign the user out of every active session on every device.
      const { error } = await supabase.auth.signOut({ scope: 'global' })
      if (error) throw error
      toast({
        title: 'Account locked',
        description: `You have been signed out of all devices. Email ${SUPPORT_EMAIL} to unlock.`,
      })
      // Redirect to auth after brief delay so the user sees the toast.
      setTimeout(() => {
        window.location.href = '/auth'
      }, 1500)
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Could not lock account.', variant: 'destructive' })
    } finally {
      setLocking(false)
    }
  }

  const handleReissueRequest = () => {
    const subject = encodeURIComponent('Document Reissue Request')
    const body = encodeURIComponent(
      `Hi TruHeirs team,\n\nI'd like to request reissue of my trust or family office documents. Please coordinate with my attorney and confirm next steps.\n\nReason:\n\nThank you.`
    )
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`
  }

  const handleBreachReport = () => {
    const subject = encodeURIComponent('Suspected Security Incident')
    const body = encodeURIComponent(
      `Hi TruHeirs team,\n\nI want to report a suspected security incident on my account.\n\nDetails:\n`
    )
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Lock className="h-4 w-4" /> Account Safety Actions
        </CardTitle>
        <CardDescription>
          Use these if you suspect your account has been compromised or your documents were exposed.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 rounded-lg border">
          <div className="flex-1">
            <p className="text-sm font-medium">Lock account & sign out everywhere</p>
            <p className="text-xs text-muted-foreground mt-1">
              Immediately ends every active session. Contact {SUPPORT_EMAIL} to unlock.
            </p>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" disabled={locking}>
                <Lock className="h-4 w-4 mr-1" /> Lock account
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Lock your account?</AlertDialogTitle>
                <AlertDialogDescription>
                  You will be signed out of every device and will need to email {SUPPORT_EMAIL} to regain access.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleLockAccount}>Yes, lock it</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 rounded-lg border">
          <div className="flex-1">
            <p className="text-sm font-medium">Request document reissue</p>
            <p className="text-xs text-muted-foreground mt-1">
              If a trust or estate document was exposed, we coordinate with your attorney to reissue.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleReissueRequest}>
            <FileWarning className="h-4 w-4 mr-1" /> Request reissue
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 rounded-lg border">
          <div className="flex-1">
            <p className="text-sm font-medium">Report a suspected breach</p>
            <p className="text-xs text-muted-foreground mt-1">
              We investigate and notify affected users within 72 hours if confirmed.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleBreachReport}>
            <AlertTriangle className="h-4 w-4 mr-1" /> Report incident
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
