import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Loader2, Send, Smartphone, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'

interface PushTokenRow {
  token: string
  platform: string
  updated_at: string
}

interface DeliveryResult {
  token: string
  platform: string
  status: string
  detail?: string
}

interface DeliveryResponse {
  sent?: number
  failed?: number
  total?: number
  badge?: number
  results?: DeliveryResult[]
  error?: string
  message?: string
  details?: Record<string, unknown>
}

export function AdminPushTest() {
  const { user } = useAuth()
  const [title, setTitle] = useState('🔔 Test Push Notification')
  const [message, setMessage] = useState('This is a test push from Admin Settings.')
  const [link, setLink] = useState('/ai-chat')
  const [tokens, setTokens] = useState<PushTokenRow[]>([])
  const [loadingTokens, setLoadingTokens] = useState(true)
  const [sending, setSending] = useState(false)
  const [lastResponse, setLastResponse] = useState<DeliveryResponse | null>(null)
  const [lastSentAt, setLastSentAt] = useState<Date | null>(null)

  const loadTokens = async () => {
    if (!user?.id) return
    setLoadingTokens(true)
    const { data, error } = await supabase
      .from('push_tokens' as any)
      .select('token, platform, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Failed to load push tokens', error)
      toast.error('Failed to load push tokens')
    } else {
      setTokens((data ?? []) as unknown as PushTokenRow[])
    }
    setLoadingTokens(false)
  }

  useEffect(() => {
    loadTokens()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const handleSend = async () => {
    if (!user?.id) return
    if (!title.trim() || !message.trim()) {
      toast.error('Title and message are required')
      return
    }

    setSending(true)
    setLastResponse(null)
    try {
      const { data, error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          user_id: user.id,
          title: title.trim(),
          message: message.trim(),
          notification_type: 'test',
          reference_id: null,
          link: link.trim() || null,
        },
      })

      if (error) {
        const errResp: DeliveryResponse = { error: error.message }
        setLastResponse(errResp)
        toast.error(`Push failed: ${error.message}`)
      } else {
        const resp = (data ?? {}) as DeliveryResponse
        setLastResponse(resp)
        setLastSentAt(new Date())
        if (resp.error) {
          toast.error(`Push failed: ${resp.error}`)
        } else if ((resp.total ?? 0) === 0) {
          toast.warning('No push tokens registered for your account yet.')
        } else if ((resp.sent ?? 0) > 0) {
          toast.success(`Delivered to ${resp.sent}/${resp.total} device(s) via APNs`)
        } else {
          toast.error(`All ${resp.failed ?? 0} delivery attempt(s) failed`)
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error'
      setLastResponse({ error: msg })
      toast.error(`Push failed: ${msg}`)
    } finally {
      setSending(false)
    }
  }

  const statusBadge = (status: string) => {
    if (status === 'sent') {
      return (
        <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-600">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Sent
        </Badge>
      )
    }
    if (status === 'skipped') {
      return (
        <Badge variant="secondary">
          <AlertCircle className="h-3 w-3 mr-1" />
          Skipped
        </Badge>
      )
    }
    return (
      <Badge variant="destructive">
        <XCircle className="h-3 w-3 mr-1" />
        {status}
      </Badge>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          iOS Push Notification Test
        </CardTitle>
        <CardDescription>
          Send a test push notification to your own registered devices and inspect APNs delivery
          status. Push notifications only work on physical iOS devices running the native build —
          not in the browser or simulator.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Registered devices */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Your registered devices</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={loadTokens}
              disabled={loadingTokens}
            >
              {loadingTokens ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Refresh'}
            </Button>
          </div>
          {loadingTokens ? (
            <p className="text-sm text-muted-foreground">Loading tokens…</p>
          ) : tokens.length === 0 ? (
            <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
              No push tokens registered yet. Open the native iOS app on a physical device and grant
              notification permission to register one.
            </div>
          ) : (
            <div className="space-y-2">
              {tokens.map((t) => (
                <div
                  key={t.token}
                  className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="uppercase">
                        {t.platform}
                      </Badge>
                      <code className="truncate text-xs text-muted-foreground">
                        {t.token.slice(0, 16)}…{t.token.slice(-8)}
                      </code>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Updated {new Date(t.updated_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <Separator />

        {/* Form */}
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="push-title">Title</Label>
            <Input
              id="push-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Notification title"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="push-message">Message</Label>
            <Textarea
              id="push-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Body text shown in the notification"
              rows={3}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="push-link">Tap destination (optional)</Label>
            <Input
              id="push-link"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="/ai-chat"
            />
          </div>
          <Button onClick={handleSend} disabled={sending || !user?.id} className="w-full sm:w-auto">
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending…
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send test push to my devices
              </>
            )}
          </Button>
        </div>

        {/* Results */}
        {lastResponse && (
          <>
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Delivery status</Label>
                {lastSentAt && (
                  <span className="text-xs text-muted-foreground">
                    {lastSentAt.toLocaleTimeString()}
                  </span>
                )}
              </div>

              {lastResponse.error ? (
                <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
                  <div className="flex items-center gap-2 font-medium text-destructive">
                    <XCircle className="h-4 w-4" />
                    Request failed
                  </div>
                  <p className="mt-1 text-destructive/80">{lastResponse.error}</p>
                  {lastResponse.details && (
                    <pre className="mt-2 overflow-x-auto rounded bg-background p-2 text-xs">
                      {JSON.stringify(lastResponse.details, null, 2)}
                    </pre>
                  )}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-md border p-2 text-center">
                      <p className="text-xs text-muted-foreground">Sent</p>
                      <p className="text-lg font-semibold text-emerald-600">
                        {lastResponse.sent ?? 0}
                      </p>
                    </div>
                    <div className="rounded-md border p-2 text-center">
                      <p className="text-xs text-muted-foreground">Failed</p>
                      <p className="text-lg font-semibold text-destructive">
                        {lastResponse.failed ?? 0}
                      </p>
                    </div>
                    <div className="rounded-md border p-2 text-center">
                      <p className="text-xs text-muted-foreground">Total</p>
                      <p className="text-lg font-semibold">{lastResponse.total ?? 0}</p>
                    </div>
                  </div>

                  {typeof lastResponse.badge === 'number' && (
                    <p className="text-xs text-muted-foreground">
                      App icon badge set to <span className="font-medium">{lastResponse.badge}</span>
                    </p>
                  )}

                  {lastResponse.message && (
                    <div className="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
                      {lastResponse.message}
                    </div>
                  )}

                  {lastResponse.results && lastResponse.results.length > 0 && (
                    <div className="space-y-2">
                      {lastResponse.results.map((r, i) => (
                        <div
                          key={`${r.token}-${i}`}
                          className="flex items-start justify-between gap-2 rounded-md border p-2 text-sm"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="uppercase">
                                {r.platform}
                              </Badge>
                              <code className="truncate text-xs text-muted-foreground">
                                {r.token}
                              </code>
                            </div>
                            {r.detail && (
                              <p className="mt-1 break-all text-xs text-muted-foreground">
                                {r.detail}
                              </p>
                            )}
                          </div>
                          <div className="shrink-0">{statusBadge(r.status)}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

export default AdminPushTest
