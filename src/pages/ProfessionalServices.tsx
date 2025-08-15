import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { UserCheck, DollarSign, Calendar, Star } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

const ProfessionalServices = () => {
  const [advisors] = useState([
    {
      id: 1,
      name: "Smith & Associates CPA",
      type: "Accounting",
      contact: "John Smith",
      email: "john@smithcpa.com",
      phone: "(555) 123-4567",
      retainerFee: 15000,
      hourlyRate: 450,
      rating: 4.8,
      contractStart: "2024-01-01",
      contractEnd: "2024-12-31",
      status: "active"
    },
    {
      id: 2,
      name: "Wilson Legal Group",
      type: "Legal",
      contact: "Sarah Wilson",
      email: "sarah@wilsonlaw.com",
      phone: "(555) 234-5678",
      retainerFee: 25000,
      hourlyRate: 650,
      rating: 4.9,
      contractStart: "2023-07-01",
      contractEnd: "2024-06-30",
      status: "renewal_due"
    },
    {
      id: 3,
      name: "Capital Wealth Advisors",
      type: "Investment Management",
      contact: "Michael Chen",
      email: "mchen@capitalwealth.com",
      phone: "(555) 345-6789",
      retainerFee: 50000,
      hourlyRate: 500,
      rating: 4.7,
      contractStart: "2024-02-01",
      contractEnd: "2025-01-31",
      status: "active"
    }
  ])

  const [contracts] = useState([
    {
      id: 1,
      vendor: "Smith & Associates CPA",
      service: "Tax Preparation & Planning",
      value: 75000,
      startDate: "2024-01-01",
      endDate: "2024-12-31",
      paymentTerms: "Monthly",
      status: "active"
    },
    {
      id: 2,
      vendor: "Wilson Legal Group",
      service: "Estate Planning Legal Services",
      value: 125000,
      startDate: "2023-07-01",
      endDate: "2024-06-30",
      paymentTerms: "Quarterly",
      status: "expiring"
    },
    {
      id: 3,
      vendor: "Premier Insurance Brokers",
      service: "Insurance Portfolio Management",
      value: 35000,
      startDate: "2024-01-15",
      endDate: "2025-01-14",
      paymentTerms: "Annual",
      status: "active"
    }
  ])

  const [performanceMetrics] = useState([
    {
      advisor: "Smith & Associates CPA",
      metric: "Tax Savings Achieved",
      value: "15%",
      benchmark: "12%",
      period: "2023 Tax Year"
    },
    {
      advisor: "Capital Wealth Advisors",
      metric: "Portfolio Performance",
      value: "11.2%",
      benchmark: "9.8%",
      period: "YTD 2024"
    },
    {
      advisor: "Wilson Legal Group",
      metric: "Matter Resolution Time",
      value: "45 days",
      benchmark: "60 days",
      period: "Last 12 months"
    }
  ])

  const { toast } = useToast()

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="default">Active</Badge>
      case "renewal_due":
        return <Badge variant="destructive">Renewal Due</Badge>
      case "expiring":
        return <Badge variant="secondary">Expiring</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const totalRetainerFees = advisors.reduce((sum, advisor) => sum + advisor.retainerFee, 0)
  const totalContractValue = contracts.reduce((sum, contract) => sum + contract.value, 0)

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Professional Services</h1>
          <p className="text-muted-foreground">Manage advisors, vendors, and service contracts</p>
        </div>
        <Button>
          <UserCheck className="mr-2 h-4 w-4" />
          Add Advisor
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <UserCheck className="mr-2 h-5 w-5" />
              Active Advisors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{advisors.length}</div>
            <p className="text-xs text-muted-foreground">Professional services</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <DollarSign className="mr-2 h-5 w-5" />
              Annual Retainers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRetainerFees.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Total retainer fees</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="mr-2 h-5 w-5" />
              Contract Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalContractValue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Total contract value</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Star className="mr-2 h-5 w-5" />
              Avg Rating
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4.8</div>
            <p className="text-xs text-muted-foreground">Service quality</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Professional Advisors</CardTitle>
          <CardDescription>Your trusted professional service providers</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {advisors.map((advisor) => (
              <div key={advisor.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <UserCheck className="h-8 w-8 text-blue-500" />
                  <div>
                    <h3 className="font-semibold">{advisor.name}</h3>
                    <p className="text-sm text-muted-foreground">{advisor.type} • {advisor.contact}</p>
                    <p className="text-xs text-muted-foreground">{advisor.email} • {advisor.phone}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  {getStatusBadge(advisor.status)}
                  <div className="text-right">
                    <p className="text-sm">
                      <Star className="inline h-3 w-3 text-yellow-500" /> {advisor.rating}
                    </p>
                    <p className="text-sm font-medium">${advisor.retainerFee.toLocaleString()} retainer</p>
                    <p className="text-xs text-muted-foreground">${advisor.hourlyRate}/hour</p>
                  </div>
                  <Button variant="outline" size="sm">Manage</Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Service Contracts</CardTitle>
          <CardDescription>Active contracts and agreements</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {contracts.map((contract) => (
              <div key={contract.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h3 className="font-semibold">{contract.vendor}</h3>
                  <p className="text-sm text-muted-foreground">{contract.service}</p>
                  <p className="text-xs text-muted-foreground">
                    {contract.startDate} - {contract.endDate} • {contract.paymentTerms}
                  </p>
                </div>
                <div className="flex items-center space-x-4">
                  {getStatusBadge(contract.status)}
                  <div className="text-right">
                    <p className="font-semibold">${contract.value.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Contract value</p>
                  </div>
                  <Button variant="outline" size="sm">Review</Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Performance Metrics</CardTitle>
          <CardDescription>Track advisor and vendor performance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {performanceMetrics.map((metric, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h3 className="font-semibold">{metric.advisor}</h3>
                  <p className="text-sm text-muted-foreground">{metric.metric}</p>
                  <p className="text-xs text-muted-foreground">{metric.period}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-green-600">{metric.value}</p>
                  <p className="text-xs text-muted-foreground">vs {metric.benchmark} benchmark</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add New Professional</CardTitle>
          <CardDescription>Onboard a new advisor or service provider</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firm-name">Firm Name</Label>
              <Input id="firm-name" placeholder="Professional firm name" />
            </div>
            <div>
              <Label htmlFor="service-type">Service Type</Label>
              <Input id="service-type" placeholder="Legal, Accounting, etc." />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="contact-person">Contact Person</Label>
              <Input id="contact-person" placeholder="Primary contact name" />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="contact@firm.com" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="retainer">Annual Retainer</Label>
              <Input id="retainer" type="number" placeholder="Annual fee" />
            </div>
            <div>
              <Label htmlFor="hourly-rate">Hourly Rate</Label>
              <Input id="hourly-rate" type="number" placeholder="Hourly billing rate" />
            </div>
          </div>
          <Button className="w-full">
            <UserCheck className="mr-2 h-4 w-4" />
            Add Professional
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

export default ProfessionalServices