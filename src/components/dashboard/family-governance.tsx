import { useState, useEffect } from 'react'
import { Vote, FileText, Calendar, Users, CheckCircle, XCircle, Clock } from 'lucide-react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'

interface Policy {
  id: string
  title: string
  description: string
  policy_type: string
  status: string
  effective_date: string
  review_date: string
  created_at: string
}

interface Proposal {
  id: string
  title: string
  description: string
  proposal_type: string
  voting_deadline: string
  status: string
  requires_unanimous: boolean
  minimum_participation_percent: number
  options: string[]
  results: Record<string, number>
  created_at: string
}

interface Vote {
  id: string
  proposal_id: string
  vote_choice: string
  voted_at: string
  notes?: string
}

export function FamilyGovernance() {
  const [policies, setPolicies] = useState<Policy[]>([])
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [userVotes, setUserVotes] = useState<Vote[]>([])
  const [loading, setLoading] = useState(false)
  const [newProposal, setNewProposal] = useState({
    title: '',
    description: '',
    proposal_type: 'governance',
    voting_deadline: '',
    requires_unanimous: false,
    minimum_participation_percent: 50
  })
  const { toast } = useToast()
  const { user } = useAuth()

  useEffect(() => {
    if (user) {
      loadPolicies()
      loadProposals()
      loadUserVotes()
    }
  }, [user])

  const loadPolicies = async () => {
    try {
      const { data, error } = await supabase
        .from('family_governance_policies')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setPolicies(data || [])
    } catch (error) {
      console.error('Error loading policies:', error)
    }
  }

  const loadProposals = async () => {
    try {
      const { data, error } = await supabase
        .from('family_voting_proposals')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setProposals(data || [])
    } catch (error) {
      console.error('Error loading proposals:', error)
    }
  }

  const loadUserVotes = async () => {
    if (!user) return
    
    try {
      const { data, error } = await supabase
        .from('family_votes')
        .select('*')
        .eq('voter_id', user.id)

      if (error) throw error
      setUserVotes(data || [])
    } catch (error) {
      console.error('Error loading user votes:', error)
    }
  }

  const createProposal = async () => {
    if (!user) return
    
    setLoading(true)
    try {
      const { error } = await supabase
        .from('family_voting_proposals')
        .insert({
          created_by: user.id,
          ...newProposal
        })

      if (error) throw error

      toast({
        title: "Proposal created successfully",
        description: "Family members can now vote on your proposal.",
      })

      setNewProposal({
        title: '',
        description: '',
        proposal_type: 'governance',
        voting_deadline: '',
        requires_unanimous: false,
        minimum_participation_percent: 50
      })

      loadProposals()
    } catch (error) {
      console.error('Error creating proposal:', error)
      toast({
        title: "Error creating proposal",
        description: "There was an error creating your proposal.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const castVote = async (proposalId: string, choice: string) => {
    if (!user) return
    
    try {
      const { error } = await supabase
        .from('family_votes')
        .insert({
          proposal_id: proposalId,
          voter_id: user.id,
          vote_choice: choice
        })

      if (error) throw error

      toast({
        title: "Vote cast successfully",
        description: "Your vote has been recorded.",
      })

      loadUserVotes()
      loadProposals()
    } catch (error) {
      console.error('Error casting vote:', error)
      toast({
        title: "Error casting vote",
        description: "There was an error recording your vote.",
        variant: "destructive",
      })
    }
  }

  const hasUserVoted = (proposalId: string) => {
    return userVotes.some(vote => vote.proposal_id === proposalId)
  }

  const getProposalStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <Clock className="h-4 w-4 text-warning" />
      case 'closed':
        return <CheckCircle className="h-4 w-4 text-success" />
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-destructive" />
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
    <div className="space-y-6">
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
                    <Button>Create Proposal</Button>
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
                        <Label htmlFor="type">Type</Label>
                        <Select
                          value={newProposal.proposal_type}
                          onValueChange={(value) => setNewProposal({...newProposal, proposal_type: value})}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="policy">Policy</SelectItem>
                            <SelectItem value="investment">Investment</SelectItem>
                            <SelectItem value="governance">Governance</SelectItem>
                            <SelectItem value="spending">Spending</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="deadline">Voting Deadline</Label>
                        <Input
                          id="deadline"
                          type="datetime-local"
                          value={newProposal.voting_deadline}
                          onChange={(e) => setNewProposal({...newProposal, voting_deadline: e.target.value})}
                        />
                      </div>
                      <Button onClick={createProposal} disabled={loading} className="w-full">
                        {loading ? 'Creating...' : 'Create Proposal'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="space-y-3">
                {proposals.map((proposal) => {
                  const deadline = formatDeadline(proposal.voting_deadline)
                  const userHasVoted = hasUserVoted(proposal.id)
                  
                  return (
                    <Card key={proposal.id}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              {getProposalStatusIcon(proposal.status)}
                              <h4 className="font-semibold">{proposal.title}</h4>
                              <Badge variant="outline">{proposal.proposal_type}</Badge>
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

                          {(proposal.status === 'closed' || deadline.isExpired) && (
                            <div className="space-y-2">
                              <h5 className="text-sm font-medium">Results:</h5>
                              <div className="space-y-1">
                                {Object.entries(proposal.results).map(([option, count]) => (
                                  <div key={option} className="flex justify-between text-sm">
                                    <span>{option.charAt(0).toUpperCase() + option.slice(1)}</span>
                                    <span>{count} votes</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
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
                            <Badge variant="outline">{policy.policy_type}</Badge>
                            <Badge 
                              variant={policy.status === 'active' ? 'default' : 'outline'}
                            >
                              {policy.status}
                            </Badge>
                          </div>
                          {policy.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {policy.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {policy.effective_date && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>Effective: {new Date(policy.effective_date).toLocaleDateString()}</span>
                          </div>
                        )}
                        {policy.review_date && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>Review: {new Date(policy.review_date).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}