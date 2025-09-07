import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { Loader2, Phone, Calendar, Gift } from 'lucide-react'

export function CommunityCallBooking() {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    currentSituation: '',
    notes: '',
    preferredTimeSlots: [] as string[]
  })

  const { toast } = useToast()

  const timeSlots = [
    'Weekdays 9-11 AM EST',
    'Weekdays 11 AM-1 PM EST', 
    'Weekdays 1-3 PM EST',
    'Weekdays 3-5 PM EST',
    'Weekends 10 AM-12 PM EST',
    'Weekends 1-3 PM EST',
    'Evenings 6-8 PM EST'
  ]

  useEffect(() => {
    const handleOpenBooking = () => setIsOpen(true)
    window.addEventListener('openCommunityBooking', handleOpenBooking)
    return () => window.removeEventListener('openCommunityBooking', handleOpenBooking)
  }, [])

  const handleTimeSlotChange = (timeSlot: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      preferredTimeSlots: checked 
        ? [...prev.preferredTimeSlots, timeSlot]
        : prev.preferredTimeSlots.filter(slot => slot !== timeSlot)
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.fullName || !formData.email || !formData.currentSituation) {
      toast({
        title: "Missing required fields",
        description: "Please fill in all required fields.",
        variant: "destructive",
      })
      return
    }

    if (formData.preferredTimeSlots.length === 0) {
      toast({
        title: "No time slots selected",
        description: "Please select at least one preferred time slot.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      const { error } = await supabase
        .from('community_call_bookings')
        .insert([{
          full_name: formData.fullName,
          email: formData.email,
          phone: formData.phone || null,
          current_situation: formData.currentSituation,
          preferred_time_slots: formData.preferredTimeSlots,
          notes: formData.notes || null,
          status: 'pending'
        }])

      if (error) throw error

      toast({
        title: "Call booking submitted!",
        description: "We'll contact you within 24 hours to schedule your consultation.",
      })

      setIsOpen(false)
      setFormData({
        fullName: '',
        email: '',
        phone: '',
        currentSituation: '',
        notes: '',
        preferredTimeSlots: []
      })
    } catch (error: any) {
      console.error('Error booking call:', error)
      toast({
        title: "Booking failed",
        description: error.message || "Please try again later.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Join the Fampreneurs Community
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-primary/10 p-4 rounded-lg space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Gift className="h-4 w-4 text-primary" />
              Community Benefits
            </div>
            <ul className="text-xs space-y-1 text-muted-foreground">
              <li>• 50% off all pricing tiers</li>
              <li>• Access to exclusive programs with free trials</li>
              <li>• Priority support and coaching</li>
              <li>• Private community access</li>
            </ul>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full-name">Full Name *</Label>
              <Input
                id="full-name"
                value={formData.fullName}
                onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                placeholder="Enter your full name"
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Enter your email"
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone (Optional)</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="Enter your phone number"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="situation">Current Situation *</Label>
              <Textarea
                id="situation"
                value={formData.currentSituation}
                onChange={(e) => setFormData(prev => ({ ...prev, currentSituation: e.target.value }))}
                placeholder="Tell us about your family business or wealth management goals..."
                rows={3}
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Preferred Time Slots *
              </Label>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {timeSlots.map((timeSlot) => (
                  <div key={timeSlot} className="flex items-center space-x-2">
                    <Checkbox
                      id={`time-${timeSlot}`}
                      checked={formData.preferredTimeSlots.includes(timeSlot)}
                      onCheckedChange={(checked) => handleTimeSlotChange(timeSlot, !!checked)}
                      disabled={isLoading}
                    />
                    <Label htmlFor={`time-${timeSlot}`} className="text-xs">
                      {timeSlot}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Any specific questions or requirements..."
                rows={2}
                disabled={isLoading}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={isLoading}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Book Consultation
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}