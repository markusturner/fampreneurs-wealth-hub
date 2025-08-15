import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Shield, AlertTriangle, TrendingDown, FileText } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

const RiskManagement = () => {
  const [insurancePolicies] = useState([
    {
      id: 1,
      type: "Life Insurance",
      provider: "MetLife",
      coverage: 5000000,
      premium: 24000,
      renewalDate: "2024-12-31",
      status: "active"
    },
    {
      id: 2,
      type: "Property Insurance",
      provider: "Chubb",
      coverage: 15000000,
      premium: 45000,
      renewalDate: "2024-06-15",
      status: "active"
    },
    {
      id: 3,
      type: "Umbrella Policy",
      provider: "AIG",
      coverage: 25000000,
      premium: 18000,
      renewalDate: "2024-03-20",
      status: "renewal_due"
    }
  ])

  const [riskAssessments] = useState([
    {
      id: 1,
      category: "Cybersecurity",
      riskLevel: "medium",
      score: 7.2,
      lastAssessed: "2024-01-15",
      recommendations: 3
    },
    {
      id: 2,
      category: "Investment Risk",
      riskLevel: "low",
      score: 8.5,
      lastAssessed: "2024-02-01",
      recommendations: 1
    },
    {
      id: 3,
      category: "Operational Risk",
      riskLevel: "high",
      score: 5.8,
      lastAssessed: "2024-01-30",
      recommendations: 5
    }
  ])

  const [businessContinuity] = useState([
    {
      plan: "IT Disaster Recovery",
      lastUpdated: "2024-02-15",
      testDate: "2024-03-01",
      status: "tested",
      effectiveness: 95
    },
    {
      plan: "Key Personnel Succession",
      lastUpdated: "2024-01-20",
      testDate: "2023-12-15",
      status: "needs_testing",
      effectiveness: 78
    },
    {
      plan: "Financial Crisis Response",
      lastUpdated: "2024-02-28",
      testDate: "2024-02-28",
      status: "tested",
      effectiveness: 88
    }
  ])

  const { toast } = useToast()

  const getRiskBadge = (level: string) => {
    switch (level) {
      case "low":
        return <Badge variant="default" className="bg-green-100 text-green-800">Low Risk</Badge>
      case "medium":
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Medium Risk</Badge>
      case "high":
        return <Badge variant="destructive">High Risk</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="default">Active</Badge>
      case "renewal_due":
        return <Badge variant="destructive">Renewal Due</Badge>
      case "tested":
        return <Badge variant="default">Tested</Badge>
      case "needs_testing":
        return <Badge variant="secondary">Needs Testing</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const totalCoverage = insurancePolicies.reduce((sum, policy) => sum + policy.coverage, 0)
  const totalPremiums = insurancePolicies.reduce((sum, policy) => sum + policy.premium, 0)

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Risk Management</h1>
          <p className="text-muted-foreground">Monitor and mitigate family office risks</p>
        </div>
        <Button>
          <Shield className="mr-2 h-4 w-4" />
          New Assessment
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="mr-2 h-5 w-5" />
              Total Coverage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(totalCoverage / 1000000).toFixed(1)}M</div>
            <p className="text-xs text-muted-foreground">Insurance coverage</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingDown className="mr-2 h-5 w-5" />
              Annual Premiums
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalPremiums.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Total yearly cost</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="mr-2 h-5 w-5" />
              High Risks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">1</div>
            <p className="text-xs text-muted-foreground">Requires attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="mr-2 h-5 w-5" />
              Policies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{insurancePolicies.length}</div>
            <p className="text-xs text-muted-foreground">Active policies</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Insurance Portfolio</CardTitle>
          <CardDescription>Manage your insurance policies and coverage</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {insurancePolicies.map((policy) => (
              <div key={policy.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <Shield className="h-8 w-8 text-blue-500" />
                  <div>
                    <h3 className="font-semibold">{policy.type}</h3>
                    <p className="text-sm text-muted-foreground">{policy.provider}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  {getStatusBadge(policy.status)}
                  <div className="text-right">
                    <p className="font-semibold">${(policy.coverage / 1000000).toFixed(1)}M Coverage</p>
                    <p className="text-sm text-muted-foreground">${policy.premium.toLocaleString()}/year</p>
                    <p className="text-xs text-muted-foreground">Renews: {policy.renewalDate}</p>
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
          <CardTitle>Risk Assessments</CardTitle>
          <CardDescription>Current risk levels across different categories</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {riskAssessments.map((assessment) => (
              <div key={assessment.id} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="font-semibold">{assessment.category}</h3>
                    <p className="text-sm text-muted-foreground">Last assessed: {assessment.lastAssessed}</p>
                  </div>
                  {getRiskBadge(assessment.riskLevel)}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex-1 mr-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span>Risk Score</span>
                      <span>{assessment.score}/10</span>
                    </div>
                    <Progress value={assessment.score * 10} className="h-2" />
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {assessment.recommendations} recommendations
                  </div>
                  <Button variant="outline" size="sm" className="ml-2">Review</Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Business Continuity Plans</CardTitle>
          <CardDescription>Disaster recovery and business continuity preparedness</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {businessContinuity.map((plan, index) => (
              <div key={index} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="font-semibold">{plan.plan}</h3>
                    <p className="text-sm text-muted-foreground">Updated: {plan.lastUpdated}</p>
                  </div>
                  {getStatusBadge(plan.status)}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex-1 mr-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span>Effectiveness</span>
                      <span>{plan.effectiveness}%</span>
                    </div>
                    <Progress value={plan.effectiveness} className="h-2" />
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Last tested: {plan.testDate}
                  </div>
                  <Button variant="outline" size="sm" className="ml-2">Test Plan</Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default RiskManagement