import { useEffect, useState } from 'react'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import {
  WEB_PUSH_PROMPT_KEY, disableWebPush, enableWebPush, isWebPushOn, isWebPushSupported, syncWebPush,
} from '@/lib/web-push'

/** One-time friendly prompt for signed-in members on desktop browsers. */
export function WebPushPrompt() {
  const { user } = useAuth()
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!user || !isWebPushSupported()) return
    if (Notification.permission === 'granted') { syncWebPush(user.id); return }
    if (Notification.permission === 'denied') return
    if (localStorage.getItem(WEB_PUSH_PROMPT_KEY)) return
    const t = setTimeout(() => setShow(true), 4000)
    return () => clearTimeout(t)
  }, [user])

  if (!show || !user) return null

  const close = () => { localStorage.setItem(WEB_PUSH_PROMPT_KEY, '1'); setShow(false) }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[340px] max-w-[calc(100vw-2rem)] rounded-xl border bg-card p-4 shadow-lg">
      <div className="flex gap-3">
        <Bell className="h-5 w-5 shrink-0 text-primary mt-0.5" />
        <div className="space-y-3">
          <div>
            <p className="font-semibold text-sm">Get alerts on this computer?</p>
            <p className="text-xs text-muted-foreground">We will let you know about new posts, messages, and events.</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={async () => { close(); await enableWebPush(user.id) }}>Turn on</Button>
            <Button size="sm" variant="ghost" onClick={close}>Not now</Button>
          </div>
        </div>
      </div>
    </div>
  )
}

/** Settings toggle so members can turn desktop alerts on later. */
export function DesktopPushToggle() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [on, setOn] = useState(false)
  const [busy, setBusy] = useState(false)
  const supported = isWebPushSupported()

  useEffect(() => { setOn(isWebPushOn()) }, [])

  if (!supported || !user) return null

  const change = async (next: boolean) => {
    setBusy(true)
    if (next) {
      const ok = await enableWebPush(user.id)
      setOn(ok)
      if (!ok) toast({ title: 'Alerts are blocked', description: 'Allow notifications for this site in your browser settings, then try again.' })
    } else {
      await disableWebPush(user.id)
      setOn(false)
    }
    setBusy(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Desktop Notifications</CardTitle>
        <CardDescription>Get alerts in this browser, even when the tab is closed.</CardDescription>
      </CardHeader>
      <CardContent className="flex items-center justify-between">
        <span className="text-sm">{on ? 'On' : 'Off'}</span>
        <Switch checked={on} disabled={busy} onCheckedChange={change} />
      </CardContent>
    </Card>
  )
}
