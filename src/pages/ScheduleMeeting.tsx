import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/ui/app-sidebar"
import { Calendar, Clock, User, ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const ScheduleMeeting = () => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    date: '',
    time: '',
    duration: '30',
    attendees: '',
    purpose: '',
    agenda: ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Handle meeting scheduling logic here
    console.log('Meeting scheduled:', formData)
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gray-50">
        <AppSidebar />
        
        <main className="flex-1 overflow-auto">
          {/* Header */}
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(-1)}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <h1 className="text-2xl font-semibold text-gray-900">Schedule Meeting</h1>
            </div>
          </div>

          <div className="p-6 max-w-4xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Meeting Form */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Meeting Details
                  </CardTitle>
                  <CardDescription>
                    Schedule a meeting with your family office team
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="date">Date</Label>
                        <Input
                          id="date"
                          type="date"
                          value={formData.date}
                          onChange={(e) => handleInputChange('date', e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="time">Time</Label>
                        <Input
                          id="time"
                          type="time"
                          value={formData.time}
                          onChange={(e) => handleInputChange('time', e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="duration">Duration</Label>
                      <Select 
                        value={formData.duration} 
                        onValueChange={(value) => handleInputChange('duration', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="15">15 minutes</SelectItem>
                          <SelectItem value="30">30 minutes</SelectItem>
                          <SelectItem value="45">45 minutes</SelectItem>
                          <SelectItem value="60">1 hour</SelectItem>
                          <SelectItem value="90">1.5 hours</SelectItem>
                          <SelectItem value="120">2 hours</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="attendees">Attendees</Label>
                      <Input
                        id="attendees"
                        placeholder="Enter email addresses separated by commas"
                        value={formData.attendees}
                        onChange={(e) => handleInputChange('attendees', e.target.value)}
                      />
                    </div>

                    <div>
                      <Label htmlFor="purpose">Meeting Purpose</Label>
                      <Select 
                        value={formData.purpose} 
                        onValueChange={(value) => handleInputChange('purpose', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select meeting purpose" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="investment-review">Investment Review</SelectItem>
                          <SelectItem value="financial-planning">Financial Planning</SelectItem>
                          <SelectItem value="tax-planning">Tax Planning</SelectItem>
                          <SelectItem value="estate-planning">Estate Planning</SelectItem>
                          <SelectItem value="family-governance">Family Governance</SelectItem>
                          <SelectItem value="general-consultation">General Consultation</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="agenda">Agenda</Label>
                      <Textarea
                        id="agenda"
                        placeholder="Outline the topics to be discussed..."
                        value={formData.agenda}
                        onChange={(e) => handleInputChange('agenda', e.target.value)}
                        rows={4}
                      />
                    </div>

                    <Button type="submit" className="w-full">
                      Schedule Meeting
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Quick Actions & Info */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Quick Schedule
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button variant="outline" className="w-full justify-start">
                      <Calendar className="h-4 w-4 mr-2" />
                      Tomorrow at 2:00 PM
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Calendar className="h-4 w-4 mr-2" />
                      Next Week - Monday 10:00 AM
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Calendar className="h-4 w-4 mr-2" />
                      Same Time Next Week
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Team Availability
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Financial Advisor</span>
                        <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">Available</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Investment Manager</span>
                        <span className="text-xs text-yellow-600 bg-yellow-100 px-2 py-1 rounded">Limited</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Tax Specialist</span>
                        <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">Available</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Meeting Guidelines</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="text-sm text-gray-600 space-y-2">
                      <li>• Please schedule at least 24 hours in advance</li>
                      <li>• Include relevant documents in the agenda</li>
                      <li>• Video conferencing link will be provided</li>
                      <li>• Meeting recordings available upon request</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  )
}

export default ScheduleMeeting