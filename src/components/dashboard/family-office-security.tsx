import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Shield, Eye, Download, Trash2, Clock, AlertTriangle, Lock, FileText, Users, Database } from 'lucide-react'
import { useFamilyOfficeSecurity } from '@/hooks/useFamilyOfficeSecurity'
import { formatDistanceToNow } from 'date-fns'

export function FamilyOfficeSecurity() {
  const {
    securitySettings,
    privacyPreferences,
    auditLogs,
    loading,
    updateSecuritySettings,
    updatePrivacyPreferences,
    exportUserData,
    requestDataDeletion,
    refreshAuditLogs
  } = useFamilyOfficeSecurity()

  const [ipToAdd, setIpToAdd] = useState('')

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  const addAllowedIP = () => {
    if (ipToAdd && securitySettings) {
      const currentIPs = securitySettings.allowed_ip_addresses || []
      if (!currentIPs.includes(ipToAdd)) {
        updateSecuritySettings({
          allowed_ip_addresses: [...currentIPs, ipToAdd]
        })
        setIpToAdd('')
      }
    }
  }

  const removeAllowedIP = (ip: string) => {
    if (securitySettings) {
      updateSecuritySettings({
        allowed_ip_addresses: securitySettings.allowed_ip_addresses.filter(addr => addr !== ip)
      })
    }
  }

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'low': return 'bg-green-100 text-green-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'high': return 'bg-orange-100 text-orange-800'
      case 'critical': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Family Office Security
          </h2>
          <p className="text-muted-foreground">
            Protect your sensitive family information with advanced security features
          </p>
        </div>
      </div>

      <Tabs defaultValue="security" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="security">Security Settings</TabsTrigger>
          <TabsTrigger value="privacy">Privacy Controls</TabsTrigger>
          <TabsTrigger value="audit">Audit Logs</TabsTrigger>
          <TabsTrigger value="data">Data Management</TabsTrigger>
        </TabsList>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Access Control
              </CardTitle>
              <CardDescription>
                Manage authentication and access security settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Multi-Factor Authentication</Label>
                  <p className="text-sm text-muted-foreground">
                    Require additional verification for login
                  </p>
                </div>
                <Switch
                  checked={securitySettings?.require_mfa || false}
                  onCheckedChange={(checked) => updateSecuritySettings({ require_mfa: checked })}
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Session Timeout (minutes)</Label>
                <Select
                  value={securitySettings?.session_timeout_minutes?.toString() || '120'}
                  onValueChange={(value) => updateSecuritySettings({ session_timeout_minutes: parseInt(value) })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                    <SelectItem value="120">2 hours</SelectItem>
                    <SelectItem value="240">4 hours</SelectItem>
                    <SelectItem value="480">8 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="space-y-4">
                <Label>Allowed IP Addresses</Label>
                <p className="text-sm text-muted-foreground">
                  Restrict access to specific IP addresses (leave empty to allow all)
                </p>
                
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter IP address (e.g., 192.168.1.1)"
                    value={ipToAdd}
                    onChange={(e) => setIpToAdd(e.target.value)}
                  />
                  <Button onClick={addAllowedIP} disabled={!ipToAdd}>
                    Add
                  </Button>
                </div>

                {securitySettings?.allowed_ip_addresses && securitySettings.allowed_ip_addresses.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {securitySettings.allowed_ip_addresses.map((ip) => (
                      <Badge key={ip} variant="secondary" className="cursor-pointer">
                        {ip}
                        <button
                          onClick={() => removeAllowedIP(ip)}
                          className="ml-2 hover:bg-destructive hover:text-destructive-foreground rounded-full w-4 h-4 flex items-center justify-center text-xs"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Data Protection
              </CardTitle>
              <CardDescription>
                Configure data encryption and retention policies
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Data Encryption</Label>
                  <p className="text-sm text-muted-foreground">
                    Encrypt sensitive data at rest
                  </p>
                </div>
                <Switch
                  checked={securitySettings?.encryption_enabled || false}
                  onCheckedChange={(checked) => updateSecuritySettings({ encryption_enabled: checked })}
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Data Retention Period</Label>
                <Select
                  value={securitySettings?.data_retention_days?.toString() || '2555'}
                  onValueChange={(value) => updateSecuritySettings({ data_retention_days: parseInt(value) })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="365">1 year</SelectItem>
                    <SelectItem value="1095">3 years</SelectItem>
                    <SelectItem value="1825">5 years</SelectItem>
                    <SelectItem value="2555">7 years</SelectItem>
                    <SelectItem value="3650">10 years</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Backup Frequency</Label>
                <Select
                  value={securitySettings?.backup_frequency || 'daily'}
                  onValueChange={(value) => updateSecuritySettings({ backup_frequency: value })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="privacy" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Privacy Preferences
              </CardTitle>
              <CardDescription>
                Control how your data is used and shared
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Data Sharing Consent</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow sharing anonymized data for platform improvements
                  </p>
                </div>
                <Switch
                  checked={privacyPreferences?.data_sharing_consent || false}
                  onCheckedChange={(checked) => updatePrivacyPreferences({ data_sharing_consent: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Analytics Consent</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow usage analytics to improve user experience
                  </p>
                </div>
                <Switch
                  checked={privacyPreferences?.analytics_consent || false}
                  onCheckedChange={(checked) => updatePrivacyPreferences({ analytics_consent: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Marketing Communications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive updates about new features and services
                  </p>
                </div>
                <Switch
                  checked={privacyPreferences?.marketing_consent || false}
                  onCheckedChange={(checked) => updatePrivacyPreferences({ marketing_consent: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Data Export</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow exporting your personal data
                  </p>
                </div>
                <Switch
                  checked={privacyPreferences?.data_export_allowed !== false}
                  onCheckedChange={(checked) => updatePrivacyPreferences({ data_export_allowed: checked })}
                />
              </div>

              {privacyPreferences?.data_deletion_requested && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Data deletion has been requested on {new Date(privacyPreferences.data_deletion_requested_at!).toLocaleDateString()}.
                    Your data will be permanently deleted according to our retention policy.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Security Audit Logs
              </CardTitle>
              <CardDescription>
                Track all access and modifications to your family data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Button onClick={refreshAuditLogs} variant="outline" size="sm">
                  Refresh Logs
                </Button>
                
                {auditLogs.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No audit logs found
                  </p>
                ) : (
                  <div className="space-y-2">
                    {auditLogs.map((log) => (
                      <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Badge className={getRiskLevelColor(log.risk_level)}>
                            {log.risk_level}
                          </Badge>
                          <div>
                            <p className="font-medium">{log.action.replace('_', ' ').toUpperCase()}</p>
                            <p className="text-sm text-muted-foreground">
                              {log.table_name} • {formatDistanceToNow(new Date(log.created_at))} ago
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          {new Date(log.created_at).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Data Management
              </CardTitle>
              <CardDescription>
                Export or delete your personal data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Export Your Data</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Download a copy of all your family office data in JSON format
                  </p>
                  <Button onClick={exportUserData} variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Export Data
                  </Button>
                </div>

                <Separator />

                <div>
                  <h4 className="font-medium mb-2 text-destructive">Delete Your Data</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Request permanent deletion of all your family office data. This action cannot be undone.
                  </p>
                  <Button 
                    onClick={requestDataDeletion} 
                    variant="destructive"
                    disabled={privacyPreferences?.data_deletion_requested}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {privacyPreferences?.data_deletion_requested ? 'Deletion Requested' : 'Request Data Deletion'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Data Classification</CardTitle>
              <CardDescription>
                Overview of how your data is classified and protected
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <Badge variant="outline" className="mb-2">Public</Badge>
                  <p className="text-sm text-muted-foreground">Basic profile info</p>
                </div>
                <div className="text-center">
                  <Badge variant="secondary" className="mb-2">Internal</Badge>
                  <p className="text-sm text-muted-foreground">Family relationships</p>
                </div>
                <div className="text-center">
                  <Badge className="mb-2 bg-yellow-100 text-yellow-800">Confidential</Badge>
                  <p className="text-sm text-muted-foreground">Contact details</p>
                </div>
                <div className="text-center">
                  <Badge className="mb-2 bg-red-100 text-red-800">Restricted</Badge>
                  <p className="text-sm text-muted-foreground">Financial data</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}