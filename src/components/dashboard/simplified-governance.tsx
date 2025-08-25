import { useState, useEffect } from 'react'
import { Vote, FileText, Calendar, Users, CheckCircle, XCircle, Clock, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'

interface Policy {
  id: string
  title: string
  description: string
  type: string
  status: string
  effective_date: string
  created_at: string
}

interface Proposal {
  id: string
  title: string
  description: string
  type: string
  deadline: string
  status: string
  options: string[]
  votes: Record<string, number>
  created_at: string
}

export function SimplifiedGovernance() {
  const [policies, setPolicies] = useState<Policy[]>([])
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [userVotes, setUserVotes] = useState<string[]>([])
  const [newProposal, setNewProposal] = useState({
    title: '',
    description: '',
    type: 'governance',
    deadline: ''
  })
  const { toast } = useToast()
  const { user } = useAuth()

  useEffect(() => {
    loadMockData()
  }, [])

  const loadMockData = () => {
    // Mock policies data
    const mockPolicies: Policy[] = [
      {
        id: '1',
        title: 'Investment Decision Framework',
        description: 'Guidelines for major investment decisions requiring family approval',
        type: 'investment',
        status: 'active',
        effective_date: '2024-01-01',
        created_at: new Date().toISOString()
      },
      {
        id: '2',
        title: 'Family Code of Conduct',
        description: 'Behavioral expectations and values for all family members',
        type: 'governance',
        status: 'active',
        effective_date: '2024-01-01',
        created_at: new Date().toISOString()
      }
    ]

    // Mock proposals data
    const mockProposals: Proposal[] = [
      {
        id: '1',
        title: 'Approve New Real Estate Investment',
        description: 'Proposal to invest $2M in commercial real estate in downtown area',
        type: 'investment',
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'active',
        options: ['approve', 'reject'],
        votes: { approve: 3, reject: 1 },
        created_at: new Date().toISOString()
      },
      {
        id: '2',
        title: 'Update Family Meeting Schedule',
        description: 'Change monthly meetings to bi-weekly starting next quarter',
        type: 'governance',
        deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'active',
        options: ['approve', 'reject'],
        votes: { approve: 2, reject: 2 },
        created_at: new Date().toISOString()
      }
    ]

    setPolicies(mockPolicies)
    setProposals(mockProposals)
    setUserVotes(['1']) // User has voted on proposal 1
  }

  const createProposal = () => {
    if (!newProposal.title || !newProposal.description || !newProposal.deadline) {
      toast({
        title: "Please fill in all fields",
        variant: "destructive",
      })
      return
    }

    const proposal: Proposal = {
      id: Date.now().toString(),
      ...newProposal,
      options: ['approve', 'reject'],
      votes: {},
      status: 'active',
      created_at: new Date().toISOString()
    }

    setProposals(prev => [proposal, ...prev])
    setNewProposal({
      title: '',
      description: '',
      type: 'governance',
      deadline: ''
    })

    toast({
      title: "Proposal created successfully",
      description: "Family members can now vote on your proposal.",
    })
  }

  const castVote = (proposalId: string, choice: string) => {
    if (userVotes.includes(proposalId)) {
      toast({
        title: "Already voted",
        description: "You have already voted on this proposal.",
        variant: "destructive",
      })
      return
    }

    setUserVotes(prev => [...prev, proposalId])
    setProposals(prev => prev.map(p => {
      if (p.id === proposalId) {
        const newVotes = { ...p.votes }
        newVotes[choice] = (newVotes[choice] || 0) + 1
        return { ...p, votes: newVotes }
      }
      return p
    }))

    toast({
      title: "Vote cast successfully",
      description: "Your vote has been recorded.",
    })
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <Clock className="h-4 w-4 text-warning" />
      case 'closed':
        return <CheckCircle className="h-4 w-4 text-success" />
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />
    }
  }

  const formatDeadline = (deadline: string) => {
    const date = new Date(deadline)
    const now = new Date()
    const isExpired = date < now
    
    return {
      formatted: date.toLocaleDateString() + ' ' + date.toLocaleTimeString(),
      isExpired
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Vote className="h-5 w-5" />
          Family Governance
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="proposals">
          <TabsList>
            <TabsTrigger value="proposals">Voting Proposals</TabsTrigger>
            <TabsTrigger value="policies">Family Policies</TabsTrigger>
          </TabsList>

          <TabsContent value="proposals" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Active Proposals</h3>
              <Dialog>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Proposal
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Create New Proposal</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="title">Title</Label>
                      <Input
                        id="title"
                        value={newProposal.title}
                        onChange={(e) => setNewProposal({...newProposal, title: e.target.value})}
                        placeholder="Proposal title"
                      />
                    </div>
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={newProposal.description}
                        onChange={(e) => setNewProposal({...newProposal, description: e.target.value})}
                        placeholder="Detailed description of the proposal"
                      />
                    </div>
                    <div>
                      <Label htmlFor="deadline">Voting Deadline</Label>
                      <Input
                        id="deadline"
                        type="datetime-local"
                        value={newProposal.deadline}
                        onChange={(e) => setNewProposal({...newProposal, deadline: e.target.value})}
                      />
                    </div>
                    <Button onClick={createProposal} className="w-full">
                      Create Proposal
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="space-y-3">
              {proposals.map((proposal) => {
                const deadline = formatDeadline(proposal.deadline)
                const userHasVoted = userVotes.includes(proposal.id)
                
                return (
                  <Card key={proposal.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(proposal.status)}
                            <h4 className="font-semibold">{proposal.title}</h4>
                            <Badge variant="outline">{proposal.type}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {proposal.description}
                          </p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className={deadline.isExpired ? 'text-destructive' : 'text-muted-foreground'}>
                            Deadline: {deadline.formatted}
                          </span>
                          {userHasVoted && (
                            <Badge variant="outline" className="text-success">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Voted
                            </Badge>
                          )}
                        </div>
                        
                        {proposal.status === 'active' && !deadline.isExpired && !userHasVoted && (
                          <div className="flex gap-2">
                            {proposal.options.map((option) => (
                              <Button
                                key={option}
                                variant="outline"
                                size="sm"
                                onClick={() => castVote(proposal.id, option)}
                              >
                                {option.charAt(0).toUpperCase() + option.slice(1)}
                              </Button>
                            ))}
                          </div>
                        )}

                        <div className="space-y-2">
                          <h5 className="text-sm font-medium">Current Results:</h5>
                          <div className="space-y-1">
                            {Object.entries(proposal.votes).map(([option, count]) => (
                              <div key={option} className="flex justify-between text-sm">
                                <span>{option.charAt(0).toUpperCase() + option.slice(1)}</span>
                                <span>{count} votes</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </TabsContent>

          <TabsContent value="policies" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Family Policies</h3>
            </div>

            <div className="space-y-3">
              {policies.map((policy) => (
                <Card key={policy.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <h4 className="font-semibold">{policy.title}</h4>
                          <Badge variant="outline">{policy.type}</Badge>
                          <Badge variant={policy.status === 'active' ? 'default' : 'outline'}>
                            {policy.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {policy.description}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>Effective: {new Date(policy.effective_date).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}