import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import { Zap, Save, TestTube } from 'lucide-react'

interface ZapierSettings {
  personal_messages_webhook?: string
  group_messages_webhook?: string
  coaching_calls_webhook?: string
  enable_personal_messages: boolean
  enable_group_messages: boolean
  enable_coaching_calls: boolean
}

export function ZapierIntegration() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [settings, setSettings] = useState<ZapierSettings>({
    enable_personal_messages: false,
    enable_group_messages: false,
    enable_coaching_calls: false
  })
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState<string | null>(null)

  useEffect(() => {
    loadSettings()
  }, [user])

  const loadSettings = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('setting_key, setting_value')
        .in('setting_key', [
          'zapier_personal_messages_webhook',
          'zapier_group_messages_webhook', 
          'zapier_coaching_calls_webhook',
          'zapier_enable_personal_messages',
          'zapier_enable_group_messages',
          'zapier_enable_coaching_calls'
        ])

      if (error) throw error

      const settingsMap = data?.reduce((acc, item) => {
        acc[item.setting_key] = item.setting_value
        return acc
      }, {} as Record<string, string>) || {}

      setSettings({
        personal_messages_webhook: settingsMap.zapier_personal_messages_webhook || '',
        group_messages_webhook: settingsMap.zapier_group_messages_webhook || '',
        coaching_calls_webhook: settingsMap.zapier_coaching_calls_webhook || '',
        enable_personal_messages: settingsMap.zapier_enable_personal_messages === 'true',
        enable_group_messages: settingsMap.zapier_enable_group_messages === 'true',
        enable_coaching_calls: settingsMap.zapier_enable_coaching_calls === 'true'
      })
    } catch (error) {
      console.error('Error loading Zapier settings:', error)
    }
  }

  const saveSettings = async () => {
    if (!user) return

    setSaving(true)
    try {
      const settingsToSave = [
        { key: 'zapier_personal_messages_webhook', value: settings.personal_messages_webhook || '' },
        { key: 'zapier_group_messages_webhook', value: settings.group_messages_webhook || '' },
        { key: 'zapier_coaching_calls_webhook', value: settings.coaching_calls_webhook || '' },
        { key: 'zapier_enable_personal_messages', value: settings.enable_personal_messages.toString() },
        { key: 'zapier_enable_group_messages', value: settings.enable_group_messages.toString() },
        { key: 'zapier_enable_coaching_calls', value: settings.enable_coaching_calls.toString() }
      ]

      for (const setting of settingsToSave) {
        await supabase
          .from('platform_settings')
          .upsert({
            setting_key: setting.key,
            setting_value: setting.value,
            updated_by: user.id
          }, {
            onConflict: 'setting_key'
          })
      }

      toast({
        title: "Settings Saved",
        description: "Zapier integration settings have been updated successfully.",
      })
    } catch (error) {
      console.error('Error saving settings:', error)
      toast({
        title: "Error",
        description: "Failed to save Zapier settings. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const testWebhook = async (webhookUrl: string, type: string) => {
    if (!webhookUrl) {
      toast({
        title: "Error",
        description: "Please enter a webhook URL first",
        variant: "destructive",
      })
      return
    }

    setTesting(type)
    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        mode: "no-cors",
        body: JSON.stringify({
          test: true,
          type: type,
          timestamp: new Date().toISOString(),
          message: `Test notification for ${type}`,
          triggered_from: window.location.origin,
        }),
      })

      toast({
        title: "Test Sent",
        description: `Test webhook sent for ${type}. Check your Zap's history to confirm it was triggered.`,
      })
    } catch (error) {
      console.error("Error testing webhook:", error)
      toast({
        title: "Error",
        description: "Failed to test the webhook. Please check the URL and try again.",
        variant: "destructive",
      })
    } finally {
      setTesting(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Zapier Integration
        </CardTitle>
        <CardDescription>
          Configure Zapier webhooks to receive notifications for various events in your family wealth platform.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Personal Messages */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">Personal Messages</Label>
              <p className="text-sm text-muted-foreground">Get notified when someone sends you a direct message</p>
            </div>
            <Switch
              checked={settings.enable_personal_messages}
              onCheckedChange={(checked) => 
                setSettings(prev => ({ ...prev, enable_personal_messages: checked }))
              }
            />
          </div>
          {settings.enable_personal_messages && (
            <div className="space-y-2">
              <Label htmlFor="personal-webhook">Webhook URL</Label>
              <div className="flex gap-2">
                <Input
                  id="personal-webhook"
                  placeholder="https://hooks.zapier.com/hooks/catch/..."
                  value={settings.personal_messages_webhook || ''}
                  onChange={(e) => 
                    setSettings(prev => ({ ...prev, personal_messages_webhook: e.target.value }))
                  }
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => testWebhook(settings.personal_messages_webhook || '', 'personal_messages')}
                  disabled={testing === 'personal_messages'}
                >
                  <TestTube className="h-4 w-4" />
                  {testing === 'personal_messages' ? 'Testing...' : 'Test'}
                </Button>
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Group Messages */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">Group Messages</Label>
              <p className="text-sm text-muted-foreground">Get notified when someone posts in community groups</p>
            </div>
            <Switch
              checked={settings.enable_group_messages}
              onCheckedChange={(checked) => 
                setSettings(prev => ({ ...prev, enable_group_messages: checked }))
              }
            />
          </div>
          {settings.enable_group_messages && (
            <div className="space-y-2">
              <Label htmlFor="group-webhook">Webhook URL</Label>
              <div className="flex gap-2">
                <Input
                  id="group-webhook"
                  placeholder="https://hooks.zapier.com/hooks/catch/..."
                  value={settings.group_messages_webhook || ''}
                  onChange={(e) => 
                    setSettings(prev => ({ ...prev, group_messages_webhook: e.target.value }))
                  }
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => testWebhook(settings.group_messages_webhook || '', 'group_messages')}
                  disabled={testing === 'group_messages'}
                >
                  <TestTube className="h-4 w-4" />
                  {testing === 'group_messages' ? 'Testing...' : 'Test'}
                </Button>
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Coaching Calls */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">Coaching Calls</Label>
              <p className="text-sm text-muted-foreground">Get notified about coaching session bookings and updates</p>
            </div>
            <Switch
              checked={settings.enable_coaching_calls}
              onCheckedChange={(checked) => 
                setSettings(prev => ({ ...prev, enable_coaching_calls: checked }))
              }
            />
          </div>
          {settings.enable_coaching_calls && (
            <div className="space-y-2">
              <Label htmlFor="coaching-webhook">Webhook URL</Label>
              <div className="flex gap-2">
                <Input
                  id="coaching-webhook"
                  placeholder="https://hooks.zapier.com/hooks/catch/..."
                  value={settings.coaching_calls_webhook || ''}
                  onChange={(e) => 
                    setSettings(prev => ({ ...prev, coaching_calls_webhook: e.target.value }))
                  }
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => testWebhook(settings.coaching_calls_webhook || '', 'coaching_calls')}
                  disabled={testing === 'coaching_calls'}
                >
                  <TestTube className="h-4 w-4" />
                  {testing === 'coaching_calls' ? 'Testing...' : 'Test'}
                </Button>
              </div>
            </div>
          )}
        </div>

        <Separator />

        <div className="flex justify-end">
          <Button onClick={saveSettings} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>

        <div className="bg-muted/50 p-4 rounded-lg">
          <h4 className="font-medium mb-2">How to set up Zapier webhooks:</h4>
          <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
            <li>Create a new Zap in your Zapier account</li>
            <li>Choose "Webhooks by Zapier" as the trigger app</li>
            <li>Select "Catch Hook" as the trigger event</li>
            <li>Copy the provided webhook URL and paste it above</li>
            <li>Configure your desired action (email, Slack, etc.)</li>
            <li>Test the webhook using the "Test" button above</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  )
}