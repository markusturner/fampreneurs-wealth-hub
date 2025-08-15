import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { CalendarDays, FileText, Calculator, DollarSign } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

const TaxPlanning = () => {
  const [taxEntities] = useState([
    {
      id: 1,
      name: "Family Trust",
      entityType: "Trust",
      taxYear: "2024",
      filingDeadline: "2024-04-15",
      status: "pending",
      estimatedTax: 45000
    },
    {
      id: 2,
      name: "Johnson Holdings LLC",
      entityType: "LLC",
      taxYear: "2024",
      filingDeadline: "2024-03-15",
      status: "filed",
      estimatedTax: 125000
    },
    {
      id: 3,
      name: "Personal Returns",
      entityType: "Individual",
      taxYear: "2024",
      filingDeadline: "2024-04-15",
      status: "in_progress",
      estimatedTax: 78000
    }
  ])

  const [taxStrategies] = useState([
    {
      id: 1,
      strategy: "Annual Gift Tax Exclusion",
      description: "Maximize annual gifts to reduce estate value",
      potentialSavings: 25000,
      deadline: "2024-12-31",
      status: "active"
    },
    {
      id: 2,
      strategy: "Charitable Remainder Trust",
      description: "Establish CRT for income and tax benefits",
      potentialSavings: 150000,
      deadline: "2024-06-30",
      status: "under_review"
    }
  ])

  const { toast } = useToast()

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "filed":
        return <Badge variant="default">Filed</Badge>
      case "pending":
        return <Badge variant="destructive">Pending</Badge>
      case "in_progress":
        return <Badge variant="secondary">In Progress</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const getStrategyBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="default">Active</Badge>
      case "under_review":
        return <Badge variant="secondary">Under Review</Badge>
      case "implemented":
        return <Badge variant="outline">Implemented</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Tax Planning & Compliance</h1>
          <p className="text-muted-foreground">Manage tax obligations and optimization strategies</p>
        </div>
        <Button>
          <FileText className="mr-2 h-4 w-4" />
          Generate Tax Report
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <DollarSign className="mr-2 h-5 w-5" />
              Total Tax Liability
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$248,000</div>
            <p className="text-xs text-muted-foreground">Estimated for 2024</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calculator className="mr-2 h-5 w-5" />
              Potential Savings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">$175,000</div>
            <p className="text-xs text-muted-foreground">Through strategies</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CalendarDays className="mr-2 h-5 w-5" />
              Filings Due
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">2</div>
            <p className="text-xs text-muted-foreground">Next 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="mr-2 h-5 w-5" />
              Entities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{taxEntities.length}</div>
            <p className="text-xs text-muted-foreground">Total entities</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tax Entity Status</CardTitle>
          <CardDescription>Track filing status across all entities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {taxEntities.map((entity) => (
              <div key={entity.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div>
                    <h3 className="font-semibold">{entity.name}</h3>
                    <p className="text-sm text-muted-foreground">{entity.entityType} • Tax Year {entity.taxYear}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  {getStatusBadge(entity.status)}
                  <div className="text-right">
                    <p className="text-sm font-medium">${entity.estimatedTax.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Due: {entity.filingDeadline}</p>
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
          <CardTitle>Tax Optimization Strategies</CardTitle>
          <CardDescription>Active and proposed tax planning strategies</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {taxStrategies.map((strategy) => (
              <div key={strategy.id} className="p-4 border rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold">{strategy.strategy}</h3>
                    <p className="text-sm text-muted-foreground">{strategy.description}</p>
                  </div>
                  {getStrategyBadge(strategy.status)}
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-sm">
                    <span className="text-green-600 font-medium">
                      Potential Savings: ${strategy.potentialSavings.toLocaleString()}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Deadline: {strategy.deadline}
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
          <CardTitle>Tax Calendar</CardTitle>
          <CardDescription>Upcoming deadlines and important dates</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-orange-50 border-l-4 border-orange-500 rounded-r">
              <div>
                <p className="font-medium">LLC Tax Filing - Johnson Holdings</p>
                <p className="text-sm text-muted-foreground">March 15, 2024</p>
              </div>
              <Badge variant="destructive">Due Soon</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-blue-50 border-l-4 border-blue-500 rounded-r">
              <div>
                <p className="font-medium">Quarterly Estimated Taxes</p>
                <p className="text-sm text-muted-foreground">April 15, 2024</p>
              </div>
              <Badge variant="secondary">Upcoming</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default TaxPlanning