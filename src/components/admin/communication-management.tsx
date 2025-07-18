import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Mail } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'

export function CommunicationManagement() {
  const { toast } = useToast()
  const [emailSubject, setEmailSubject] = useState('')
  const [emailContent, setEmailContent] = useState('')
  const [recipientGroup, setRecipientGroup] = useState('')
  const [sending, setSending] = useState(false)

  const handleSendEmail = async () => {
    if (!emailSubject || !emailContent || !recipientGroup) {
      toast({
        title: "Missing information",
        description: "Please fill in all fields before sending.",
        variant: "destructive",
      })
      return
    }

    try {
      setSending(true)

      // Get recipients based on group selection
      let recipients = []
      
      if (recipientGroup === 'all') {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name, display_name')
        recipients = profiles || []
      } else if (recipientGroup === 'premium') {
        const { data: subscribers } = await supabase
          .from('subscribers')
          .select('user_id, email')
          .eq('subscribed', true)
        recipients = subscribers || []
      } else if (recipientGroup === 'trial') {
        const { data: subscribers } = await supabase
          .from('subscribers')
          .select('user_id, email')
          .eq('subscribed', false)
        recipients = subscribers || []
      }

      // Call the send-onboarding-emails edge function
      const { data, error } = await supabase.functions.invoke('send-onboarding-emails', {
        body: {
          email_type: 'bulk_communication',
          email_subject: emailSubject,
          email_content: emailContent,
          recipients: recipients
        }
      })

      if (error) throw error

      toast({
        title: "Email sent successfully",
        description: `Email sent to ${recipients.length} recipients.`,
      })

      // Clear form
      setEmailSubject('')
      setEmailContent('')
      setRecipientGroup('')

    } catch (error: any) {
      toast({
        title: "Error sending email",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="email-subject">Email Subject</Label>
          <Input 
            id="email-subject" 
            placeholder="Enter email subject" 
            value={emailSubject}
            onChange={(e) => setEmailSubject(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="recipient-group">Recipient Group</Label>
          <Select value={recipientGroup} onValueChange={setRecipientGroup}>
            <SelectTrigger>
              <SelectValue placeholder="Select group" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              <SelectItem value="premium">Premium Members</SelectItem>
              <SelectItem value="trial">Trial Users</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="email-content">Email Content</Label>
        <Textarea 
          id="email-content" 
          placeholder="Enter your email content here..."
          rows={6}
          value={emailContent}
          onChange={(e) => setEmailContent(e.target.value)}
        />
      </div>
      <Button 
        className="w-full" 
        onClick={handleSendEmail}
        disabled={sending}
      >
        <Mail className="h-4 w-4 mr-2" />
        {sending ? 'Sending...' : 'Send Email'}
      </Button>
    </div>
  )
}