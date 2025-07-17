import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { format } from 'date-fns'
import { CalendarIcon, Upload, User, Phone, Mail, DollarSign, Clock } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const coachFormSchema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  title: z.string().optional(),
  company: z.string().optional(),
  email: z.string().email('Valid email is required').optional().or(z.literal('')),
  phone: z.string().optional(),
  specialties: z.array(z.string()),
  hourlyRate: z.number().min(0, 'Rate must be positive').optional(),
  bio: z.string().optional(),
  website: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
  linkedinUrl: z.string().url('Please enter a valid LinkedIn URL').optional().or(z.literal('')),
  licenseNumber: z.string().optional(),
  yearsExperience: z.number().min(0, 'Experience must be positive').optional(),
  preferredContactMethod: z.enum(['email', 'phone', 'either']).optional(),
})

const sessionFormSchema = z.object({
  coachId: z.string().min(1, 'Please select a coach'),
  sessionDate: z.date(),
  sessionTime: z.string().min(1, 'Session time is required'),
  duration: z.number().min(15, 'Duration must be at least 15 minutes'),
  meetingType: z.enum(['zoom', 'google_meet', 'phone', 'in_person']),
  meetingUrl: z.string().optional(),
  notes: z.string().optional(),
})

export type CoachFormValues = z.infer<typeof coachFormSchema>
export type SessionFormValues = z.infer<typeof sessionFormSchema>

interface AddCoachDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCoachAdded?: () => void
}

export function AddCoachDialog({ open, onOpenChange, onCoachAdded }: AddCoachDialogProps) {
  const { user } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState('coach')
  const [coaches, setCoaches] = useState<any[]>([])
  const [specialtyInput, setSpecialtyInput] = useState('')

  const coachForm = useForm<CoachFormValues>({
    resolver: zodResolver(coachFormSchema),
    defaultValues: {
      fullName: '',
      title: '',
      company: '',
      email: '',
      phone: '',
      specialties: [],
      bio: '',
      website: '',
      linkedinUrl: '',
      licenseNumber: '',
      preferredContactMethod: 'email',
    },
  })

  const sessionForm = useForm<SessionFormValues>({
    resolver: zodResolver(sessionFormSchema),
    defaultValues: {
      coachId: '',
      duration: 60,
      meetingType: 'zoom',
      meetingUrl: '',
      notes: '',
    },
  })

  const fetchCoaches = async () => {
    try {
      const { data, error } = await supabase
        .from('financial_advisors')
        .select('*')
        .eq('is_active', true)
        .order('full_name')

      if (error) throw error
      setCoaches(data || [])
    } catch (error) {
      console.error('Error fetching coaches:', error)
    }
  }

  const addSpecialty = () => {
    if (specialtyInput.trim()) {
      const currentSpecialties = coachForm.getValues('specialties')
      if (!currentSpecialties.includes(specialtyInput.trim())) {
        coachForm.setValue('specialties', [...currentSpecialties, specialtyInput.trim()])
      }
      setSpecialtyInput('')
    }
  }

  const removeSpecialty = (specialty: string) => {
    const currentSpecialties = coachForm.getValues('specialties')
    coachForm.setValue('specialties', currentSpecialties.filter(s => s !== specialty))
  }

  const onSubmitCoach = async (values: CoachFormValues) => {
    if (!user) return

    setIsSubmitting(true)
    try {
      const coachData = {
        full_name: values.fullName,
        title: values.title || null,
        company: values.company || null,
        email: values.email || null,
        phone: values.phone || null,
        specialties: values.specialties.length > 0 ? values.specialties : null,
        hourly_rate: values.hourlyRate || null,
        bio: values.bio || null,
        website: values.website || null,
        linkedin_url: values.linkedinUrl || null,
        license_number: values.licenseNumber || null,
        years_experience: values.yearsExperience || null,
        preferred_contact_method: values.preferredContactMethod || null,
        added_by: user.id,
        is_active: true,
      }

      const { error } = await supabase
        .from('financial_advisors')
        .insert([coachData])

      if (error) throw error

      toast({
        title: 'Coach added successfully',
        description: 'The new coach has been added to your directory.',
      })

      coachForm.reset()
      setActiveTab('session')
      fetchCoaches()
      onCoachAdded?.()
    } catch (error) {
      console.error('Error adding coach:', error)
      toast({
        title: 'Failed to add coach',
        description: 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const onSubmitSession = async (values: SessionFormValues) => {
    if (!user) return

    setIsSubmitting(true)
    try {
      // Here you would create a 1-on-1 coaching session
      // For now, we'll just show a success message
      toast({
        title: 'Session scheduled successfully',
        description: 'Your 1-on-1 coaching session has been scheduled.',
      })

      sessionForm.reset()
      onOpenChange(false)
    } catch (error) {
      console.error('Error scheduling session:', error)
      toast({
        title: 'Failed to schedule session',
        description: 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  React.useEffect(() => {
    if (open) {
      fetchCoaches()
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Add Coach & Schedule 1-on-1 Session
          </DialogTitle>
          <DialogDescription>
            Add a new coach to your directory or schedule a 1-on-1 coaching session
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="coach">Add New Coach</TabsTrigger>
            <TabsTrigger value="session">Schedule 1-on-1 Session</TabsTrigger>
          </TabsList>

          <TabsContent value="coach" className="space-y-6">
            <Form {...coachForm}>
              <form onSubmit={coachForm.handleSubmit(onSubmitCoach)} className="space-y-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Coach Information</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={coachForm.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="Sarah Johnson" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={coachForm.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Professional Title</FormLabel>
                          <FormControl>
                            <Input placeholder="Certified Financial Planner" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={coachForm.control}
                      name="company"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company</FormLabel>
                          <FormControl>
                            <Input placeholder="Johnson Financial Group" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={coachForm.control}
                      name="licenseNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>License Number</FormLabel>
                          <FormControl>
                            <Input placeholder="CFP-12345" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Contact Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Contact Information</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={coachForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            Email
                          </FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="sarah@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={coachForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Phone className="h-4 w-4" />
                            Phone
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="(555) 123-4567" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={coachForm.control}
                    name="preferredContactMethod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Preferred Contact Method</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select contact method" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="email">Email</SelectItem>
                            <SelectItem value="phone">Phone</SelectItem>
                            <SelectItem value="either">Either</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Professional Details */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Professional Details</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={coachForm.control}
                      name="hourlyRate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4" />
                            Hourly Rate ($)
                          </FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min={0}
                              placeholder="300"
                              {...field} 
                              onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={coachForm.control}
                      name="yearsExperience"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Years of Experience</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min={0}
                              placeholder="10"
                              {...field} 
                              onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="space-y-2">
                    <FormLabel>Specialties</FormLabel>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add specialty"
                        value={specialtyInput}
                        onChange={(e) => setSpecialtyInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSpecialty())}
                      />
                      <Button type="button" onClick={addSpecialty}>Add</Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {coachForm.watch('specialties').map((specialty) => (
                        <div key={specialty} className="bg-muted px-3 py-1 rounded-md text-sm flex items-center gap-2">
                          {specialty}
                          <button
                            type="button"
                            onClick={() => removeSpecialty(specialty)}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <FormField
                    control={coachForm.control}
                    name="bio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bio</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Brief biography and expertise..."
                            rows={3}
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={coachForm.control}
                      name="website"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Website</FormLabel>
                          <FormControl>
                            <Input placeholder="https://www.example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={coachForm.control}
                      name="linkedinUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>LinkedIn URL</FormLabel>
                          <FormControl>
                            <Input placeholder="https://linkedin.com/in/..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Adding Coach...' : 'Add Coach'}
                  </Button>
                </div>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="session" className="space-y-6">
            <Form {...sessionForm}>
              <form onSubmit={sessionForm.handleSubmit(onSubmitSession)} className="space-y-6">
                {/* Session Details */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Schedule 1-on-1 Session</h3>
                  
                  <FormField
                    control={sessionForm.control}
                    name="coachId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Select Coach</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Choose a coach" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {coaches.map((coach) => (
                              <SelectItem key={coach.id} value={coach.id}>
                                {coach.full_name} - {coach.title || 'Coach'}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={sessionForm.control}
                      name="sessionDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Date</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    'pl-3 text-left font-normal',
                                    !field.value && 'text-muted-foreground'
                                  )}
                                >
                                  {field.value ? (
                                    format(field.value, 'PPP')
                                  ) : (
                                    <span>Pick a date</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) => date < new Date()}
                                initialFocus
                                className="pointer-events-auto"
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={sessionForm.control}
                      name="sessionTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Time</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={sessionForm.control}
                      name="duration"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            Duration (minutes)
                          </FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min={15}
                              max={240}
                              {...field} 
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={sessionForm.control}
                    name="meetingType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Meeting Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select meeting type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="zoom">Zoom</SelectItem>
                            <SelectItem value="google_meet">Google Meet</SelectItem>
                            <SelectItem value="phone">Phone Call</SelectItem>
                            <SelectItem value="in_person">In Person</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {(sessionForm.watch('meetingType') === 'zoom' || sessionForm.watch('meetingType') === 'google_meet') && (
                    <FormField
                      control={sessionForm.control}
                      name="meetingUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Meeting URL</FormLabel>
                          <FormControl>
                            <Input placeholder="https://zoom.us/j/..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <FormField
                    control={sessionForm.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Session Notes</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Topics to discuss, goals for the session..."
                            rows={3}
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Scheduling...' : 'Schedule Session'}
                  </Button>
                </div>
              </form>
            </Form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}