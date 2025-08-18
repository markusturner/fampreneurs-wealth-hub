import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

interface SecuritySettings {
  id?: string
  require_mfa: boolean
  session_timeout_minutes: number
  allowed_ip_addresses: string[]
  password_change_required_at: string | null
  data_retention_days: number
  encryption_enabled: boolean
  backup_frequency: string
  last_security_review: string | null
  created_at?: string
  updated_at?: string
  user_id?: string
}

interface AuditLog {
  id: string
  action: string
  table_name: string
  record_id: string | null
  risk_level: string
  metadata: Record<string, any>
  created_at: string
  ip_address?: any
  user_agent?: string
  session_id?: string
  new_values?: any
  old_values?: any
  user_id?: string
}

interface PrivacyPreferences {
  id?: string
  data_sharing_consent: boolean
  analytics_consent: boolean
  marketing_consent: boolean
  data_export_allowed: boolean
  data_deletion_requested: boolean
  data_deletion_requested_at: string | null
}

export function useFamilyOfficeSecurity() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings | null>(null)
  const [privacyPreferences, setPrivacyPreferences] = useState<PrivacyPreferences | null>(null)
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)

  // Initialize security settings and privacy preferences
  useEffect(() => {
    if (user?.id) {
      initializeSecuritySettings()
      loadPrivacyPreferences()
      loadAuditLogs()
    }
  }, [user?.id])

  const initializeSecuritySettings = async () => {
    try {
      // Check if settings exist
      const { data: existing, error: fetchError } = await supabase
        .from('family_office_security_settings')
        .select('*')
        .eq('user_id', user?.id)
        .single()

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError
      }

      if (existing) {
        setSecuritySettings(existing as SecuritySettings)
      } else {
        // Create default settings
        const defaultSettings = {
          user_id: user?.id,
          require_mfa: false,
          session_timeout_minutes: 120,
          allowed_ip_addresses: [],
          data_retention_days: 2555, // 7 years
          encryption_enabled: true,
          backup_frequency: 'daily' as const,
          last_security_review: new Date().toISOString()
        }

        const { data, error } = await supabase
          .from('family_office_security_settings')
          .insert(defaultSettings)
          .select()
          .single()

        if (error) throw error
        setSecuritySettings(data as SecuritySettings)
      }
    } catch (error) {
      console.error('Error initializing security settings:', error)
      toast({
        title: "Security Settings Error",
        description: "Failed to load security settings",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const loadPrivacyPreferences = async () => {
    try {
      const { data: existing, error: fetchError } = await supabase
        .from('family_office_privacy_preferences')
        .select('*')
        .eq('user_id', user?.id)
        .single()

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError
      }

      if (existing) {
        setPrivacyPreferences(existing)
      } else {
        // Create default privacy preferences
        const defaultPreferences = {
          user_id: user?.id,
          data_sharing_consent: false,
          analytics_consent: false,
          marketing_consent: false,
          data_export_allowed: true,
          data_deletion_requested: false,
          consent_given_at: new Date().toISOString()
        }

        const { data, error } = await supabase
          .from('family_office_privacy_preferences')
          .insert(defaultPreferences)
          .select()
          .single()

        if (error) throw error
        setPrivacyPreferences(data)
      }
    } catch (error) {
      console.error('Error loading privacy preferences:', error)
    }
  }

  const loadAuditLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('family_office_audit_logs')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) throw error
      setAuditLogs((data || []) as AuditLog[])
    } catch (error) {
      console.error('Error loading audit logs:', error)
    }
  }

  const updateSecuritySettings = async (updates: Partial<SecuritySettings>) => {
    try {
      const { data, error } = await supabase
        .from('family_office_security_settings')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user?.id)
        .select()
        .single()

      if (error) throw error
      setSecuritySettings(data as SecuritySettings)

      // Log the security settings change
      await logSecurityAction('security_settings_updated', 'family_office_security_settings', data.id, updates)

      toast({
        title: "Security Settings Updated",
        description: "Your security preferences have been saved"
      })
    } catch (error) {
      console.error('Error updating security settings:', error)
      toast({
        title: "Update Failed",
        description: "Failed to update security settings",
        variant: "destructive"
      })
    }
  }

  const updatePrivacyPreferences = async (updates: Partial<PrivacyPreferences>) => {
    try {
      const { data, error } = await supabase
        .from('family_office_privacy_preferences')
        .update({
          ...updates,
          last_updated: new Date().toISOString()
        })
        .eq('user_id', user?.id)
        .select()
        .single()

      if (error) throw error
      setPrivacyPreferences(data)

      // Log the privacy preference change
      await logSecurityAction('privacy_preferences_updated', 'family_office_privacy_preferences', data.id, updates)

      toast({
        title: "Privacy Preferences Updated",
        description: "Your privacy settings have been saved"
      })
    } catch (error) {
      console.error('Error updating privacy preferences:', error)
      toast({
        title: "Update Failed",
        description: "Failed to update privacy preferences",
        variant: "destructive"
      })
    }
  }

  const logSecurityAction = async (
    action: string,
    tableName: string,
    recordId?: string,
    metadata?: Record<string, any>,
    riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low'
  ) => {
    try {
      const { error } = await supabase.rpc('log_family_office_action', {
        p_action: action,
        p_table_name: tableName,
        p_record_id: recordId,
        p_risk_level: riskLevel,
        p_metadata: metadata || {}
      })

      if (error) {
        console.error('Error logging security action:', error)
      }
    } catch (error) {
      console.error('Error with logging function:', error)
    }
  }

  const maskSensitiveData = async (data: string, maskingType: string = 'partial') => {
    try {
      const { data: maskedData, error } = await supabase.rpc('mask_sensitive_data', {
        p_data: data,
        p_masking_type: maskingType
      })

      if (error) throw error
      return maskedData
    } catch (error) {
      console.error('Error masking data:', error)
      return data // Return original data if masking fails
    }
  }

  const requestDataDeletion = async () => {
    try {
      await updatePrivacyPreferences({
        data_deletion_requested: true,
        data_deletion_requested_at: new Date().toISOString()
      })

      // Log high-risk action
      await logSecurityAction('data_deletion_requested', 'family_office_privacy_preferences', privacyPreferences?.id, {}, 'high')

      toast({
        title: "Data Deletion Requested",
        description: "Your data deletion request has been submitted and will be processed according to our retention policy"
      })
    } catch (error) {
      console.error('Error requesting data deletion:', error)
      toast({
        title: "Request Failed",
        description: "Failed to submit data deletion request",
        variant: "destructive"
      })
    }
  }

  const exportUserData = async () => {
    try {
      if (!privacyPreferences?.data_export_allowed) {
        toast({
          title: "Export Disabled",
          description: "Data export is currently disabled in your privacy preferences",
          variant: "destructive"
        })
        return
      }

      // Log the data export action
      await logSecurityAction('data_export_requested', 'user_data', user?.id, {}, 'medium')

      // Create a comprehensive data export
      const exportData = {
        user_id: user?.id,
        export_date: new Date().toISOString(),
        security_settings: securitySettings,
        privacy_preferences: privacyPreferences,
        audit_logs: auditLogs.slice(0, 50) // Last 50 logs
      }

      // Download as JSON file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `family-office-data-export-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast({
        title: "Data Exported",
        description: "Your data has been exported successfully"
      })
    } catch (error) {
      console.error('Error exporting data:', error)
      toast({
        title: "Export Failed",
        description: "Failed to export your data",
        variant: "destructive"
      })
    }
  }

  return {
    securitySettings,
    privacyPreferences,
    auditLogs,
    loading,
    updateSecuritySettings,
    updatePrivacyPreferences,
    logSecurityAction,
    maskSensitiveData,
    requestDataDeletion,
    exportUserData,
    refreshAuditLogs: loadAuditLogs
  }
}