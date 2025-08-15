import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Heart, Target, TrendingUp, DollarSign, Calendar } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

const Philanthropy = () => {
  const [donations] = useState([
    {
      id: 1,
      organization: "Children's Education Foundation",
      amount: 50000,
      date: "2024-01-15",
      type: "Grant",
      cause: "Education",
      impact: "500 students supported"
    },
    {
      id: 2,
      organization: "Environmental Conservation Trust",
      amount: 25000,
      date: "2024-02-20",
      type: "Donation",
      cause: "Environment",
      impact: "1,000 trees planted"
    },
    {
      id: 3,
      organization: "Medical Research Institute",
      amount: 75000,
      date: "2024-03-10",
      type: "Research Grant",
      cause: "Healthcare",
      impact: "2 research projects funded"
    }
  ])

  const [foundations] = useState([
    {
      id: 1,
      name: "Johnson Family Foundation",
      totalAssets: 2500000,
      annualGiving: 125000,
      grantsMade: 25,
      focus: "Education & Healthcare"
    },
    {
      id: 2,
      name: "Future Leaders Fund",
      totalAssets: 1200000,
      annualGiving: 60000,
      grantsMade: 12,
      focus: "Youth Development"
    }
  ])

  const [givingGoals] = useState([
    {
      goal: "Annual Giving Target",
      target: 200000,
      current: 150000,
      progress: 75
    },
    {
      goal: "Education Initiatives",
      target: 100000,
      current: 50000,
      progress: 50
    },
    {
      goal: "Healthcare Research",
      target: 75000,
      current: 75000,
      progress: 100
    }
  ])

  const { toast } = useToast()

  const totalDonated = donations.reduce((sum, donation) => sum + donation.amount, 0)

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Philanthropic Management</h1>
          <p className="text-muted-foreground">Track giving, impact, and charitable initiatives</p>
        </div>
        <Button>
          <Heart className="mr-2 h-4 w-4" />
          New Grant
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <DollarSign className="mr-2 h-5 w-5" />
              Total Donated
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalDonated.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">This year</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Target className="mr-2 h-5 w-5" />
              Organizations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{donations.length}</div>
            <p className="text-xs text-muted-foreground">Supported</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="mr-2 h-5 w-5" />
              Foundations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{foundations.length}</div>
            <p className="text-xs text-muted-foreground">Active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Heart className="mr-2 h-5 w-5" />
              Impact Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8.7</div>
            <p className="text-xs text-muted-foreground">Out of 10</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Giving Goals Progress</CardTitle>
            <CardDescription>Track progress toward annual philanthropic targets</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {givingGoals.map((goal, index) => (
              <div key={index} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium">{goal.goal}</span>
                  <span className="text-sm text-muted-foreground">
                    ${goal.current.toLocaleString()} / ${goal.target.toLocaleString()}
                  </span>
                </div>
                <Progress value={goal.progress} className="h-2" />
                <div className="text-right text-xs text-muted-foreground">
                  {goal.progress}% complete
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Foundation Overview</CardTitle>
            <CardDescription>Your charitable foundations and their activities</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {foundations.map((foundation) => (
              <div key={foundation.id} className="p-4 border rounded-lg">
                <h3 className="font-semibold">{foundation.name}</h3>
                <p className="text-sm text-muted-foreground mb-2">{foundation.focus}</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Assets: </span>
                    <span className="font-medium">${foundation.totalAssets.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Annual Giving: </span>
                    <span className="font-medium">${foundation.annualGiving.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Grants Made: </span>
                    <span className="font-medium">{foundation.grantsMade}</span>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Donations & Grants</CardTitle>
          <CardDescription>Track your charitable giving and impact</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {donations.map((donation) => (
              <div key={donation.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <Heart className="h-8 w-8 text-red-500" />
                  <div>
                    <h3 className="font-semibold">{donation.organization}</h3>
                    <p className="text-sm text-muted-foreground">{donation.cause} • {donation.type}</p>
                    <p className="text-xs text-green-600">{donation.impact}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold">${donation.amount.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">{donation.date}</p>
                  <Button variant="outline" size="sm" className="mt-2">View Details</Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Plan New Grant</CardTitle>
          <CardDescription>Create a new charitable grant or donation</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="organization">Organization</Label>
              <Input id="organization" placeholder="Organization name" />
            </div>
            <div>
              <Label htmlFor="amount">Amount</Label>
              <Input id="amount" type="number" placeholder="Grant amount" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="cause">Cause Area</Label>
              <Input id="cause" placeholder="Education, Healthcare, etc." />
            </div>
            <div>
              <Label htmlFor="grant-date">Grant Date</Label>
              <Input id="grant-date" type="date" />
            </div>
          </div>
          <Button className="w-full">
            <Heart className="mr-2 h-4 w-4" />
            Create Grant
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

export default Philanthropy