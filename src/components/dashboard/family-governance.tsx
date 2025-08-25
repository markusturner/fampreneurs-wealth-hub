import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar, Vote, FileText, Clock, Users } from 'lucide-react'
import { useToast } from "@/hooks/use-toast"

interface Policy {
  id: string
  title: string
  description: string
  policy_type: string
  status: string
  effective_date: string
  created_at: string
}

interface Proposal {
  id: string
  title: string
  description: string
  proposal_type: string
  voting_deadline: string
  status: string
  voting_options: any // JSON data from database
  created_at: string
  vote_count?: number
  user_vote?: string
}

interface Vote {
  id: string
  proposal_id: string
  vote_choice: string
  voted_at: string
}

export const FamilyGovernance = () => {
  const { user } = useAuth()
  const { toast } = useToast()
  const [policies, setPolicies] = useState<Policy[]>([])
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [votes, setVotes] = useState<Vote[]>([])
  const [loading, setLoading] = useState(true)
  const [newPolicyOpen, setNewPolicyOpen] = useState(false)
  const [newProposalOpen, setNewProposalOpen] = useState(false)

  // Form states
  const [newPolicy, setNewPolicy] = useState({
    title: '',
    description: '',
    policy_type: 'governance',
    effective_date: ''
  })

  const [newProposal, setNewProposal] = useState({
    title: '',
    description: '',
    proposal_type: 'governance_matter',
    voting_deadline: '',
    voting_options: ['Yes', 'No']
  })

  useEffect(() => {
    if (user) {
      loadGovernanceData()
    }
  }, [user])

  const loadGovernanceData = async () => {
    try {
      setLoading(true)
      
      // Load policies
      const { data: policiesData, error: policiesError } = await supabase
        .from('family_governance_policies')
        .select('*')
        .order('created_at', { ascending: false })

      if (policiesError) throw policiesError
      setPolicies(policiesData || [])

      // Load proposals
      const { data: proposalsData, error: proposalsError } = await supabase
        .from('family_voting_proposals')
        .select('*')
        .order('created_at', { ascending: false })

      if (proposalsError) throw proposalsError
      
      // Get vote counts for each proposal
      const proposalsWithVotes = await Promise.all(
        (proposalsData || []).map(async (proposal) => {
          const { data: voteData } = await supabase
            .from('family_votes')
            .select('vote_choice, user_id')
            .eq('proposal_id', proposal.id)
          
          const userVote = voteData?.find(v => v.user_id === user?.id)
          
          return {
            ...proposal,
            vote_count: voteData?.length || 0,
            user_vote: userVote?.vote_choice
          }
        })
      )
      
      setProposals(proposalsWithVotes)

      // Load user votes
      const { data: votesData, error: votesError } = await supabase
        .from('family_votes')
        .select('*')
        .eq('user_id', user?.id || '')

      if (votesError) throw votesError
      setVotes(votesData || [])

    } catch (error) {
      console.error('Error loading governance data:', error)
      toast({
        title: "Error",
        description: "Failed to load governance data",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const createPolicy = async () => {
    if (!user || !newPolicy.title) return

    try {
      const { error } = await supabase
        .from('family_governance_policies')
        .insert([{
          ...newPolicy,
          user_id: user.id,
          effective_date: newPolicy.effective_date || null
        }])

      if (error) throw error

      toast({
        title: "Success",
        description: "Policy created successfully"
      })

      setNewPolicyOpen(false)
      setNewPolicy({
        title: '',
        description: '',
        policy_type: 'governance',
        effective_date: ''
      })
      loadGovernanceData()
    } catch (error) {
      console.error('Error creating policy:', error)
      toast({
        title: "Error",
        description: "Failed to create policy",
        variant: "destructive"
      })
    }
  }

  const createProposal = async () => {
    if (!user || !newProposal.title || !newProposal.voting_deadline) return

    try {
      const { error } = await supabase
        .from('family_voting_proposals')
        .insert([{
          ...newProposal,
          user_id: user.id,
          voting_options: newProposal.voting_options
        }])

      if (error) throw error

      toast({
        title: "Success",
        description: "Proposal created successfully"
      })

      setNewProposalOpen(false)
      setNewProposal({
        title: '',
        description: '',
        proposal_type: 'governance_matter',
        voting_deadline: '',
        voting_options: ['Yes', 'No']
      })
      loadGovernanceData()
    } catch (error) {
      console.error('Error creating proposal:', error)
      toast({
        title: "Error",
        description: "Failed to create proposal",
        variant: "destructive"
      })
    }
  }

  const castVote = async (proposalId: string, voteChoice: string) => {
    if (!user) return

    try {
      const { error } = await supabase
        .from('family_votes')
        .upsert([{
          proposal_id: proposalId,
          user_id: user.id,
          vote_choice: voteChoice
        }])

      if (error) throw error

      toast({
        title: "Success",
        description: "Vote cast successfully"
      })

      loadGovernanceData()
    } catch (error) {
      console.error('Error casting vote:', error)
      toast({
        title: "Error",
        description: "Failed to cast vote",
        variant: "destructive"
      })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'draft': return 'bg-yellow-100 text-yellow-800'
      case 'archived': return 'bg-gray-100 text-gray-800'
      case 'closed': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const isVotingOpen = (deadline: string) => {
    return new Date(deadline) > new Date()
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Vote className="h-5 w-5" />
            Family Governance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">Loading governance data...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Vote className="h-5 w-5" />
          Family Governance
        </CardTitle>
        <CardDescription>
          Manage family policies and voting proposals
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="proposals" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="proposals">Voting Proposals</TabsTrigger>
            <TabsTrigger value="policies">Family Policies</TabsTrigger>
          </TabsList>

          <TabsContent value="proposals" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Active Proposals</h3>
              <Dialog open={newProposalOpen} onOpenChange={setNewProposalOpen}>
                <DialogTrigger asChild>
                  <Button>Create Proposal</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Proposal</DialogTitle>
                    <DialogDescription>
                      Create a new voting proposal for family members
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="proposal-title">Title</Label>
                      <Input
                        id="proposal-title"
                        value={newProposal.title}
                        onChange={(e) => setNewProposal(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="Proposal title"
                      />
                    </div>
                    <div>
                      <Label htmlFor="proposal-description">Description</Label>
                      <Textarea
                        id="proposal-description"
                        value={newProposal.description}
                        onChange={(e) => setNewProposal(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Describe the proposal details"
                      />
                    </div>
                    <div>
                      <Label htmlFor="proposal-type">Type</Label>
                      <Select
                        value={newProposal.proposal_type}
                        onValueChange={(value) => setNewProposal(prev => ({ ...prev, proposal_type: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="policy_change">Policy Change</SelectItem>
                          <SelectItem value="investment_decision">Investment Decision</SelectItem>
                          <SelectItem value="governance_matter">Governance Matter</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="voting-deadline">Voting Deadline</Label>
                      <Input
                        id="voting-deadline"
                        type="datetime-local"
                        value={newProposal.voting_deadline}
                        onChange={(e) => setNewProposal(prev => ({ ...prev, voting_deadline: e.target.value }))}
                      />
                    </div>
                    <Button onClick={createProposal} className="w-full">
                      Create Proposal
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {proposals.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No proposals yet. Create your first proposal to get started.
              </div>
            ) : (
              <div className="space-y-4">
                {proposals.map((proposal) => (
                  <Card key={proposal.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{proposal.title}</CardTitle>
                          <CardDescription>{proposal.description}</CardDescription>
                        </div>
                        <Badge className={getStatusColor(proposal.status)}>
                          {proposal.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            Deadline: {new Date(proposal.voting_deadline).toLocaleDateString()}
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            {proposal.vote_count} votes
                          </div>
                        </div>
                        
                        {isVotingOpen(proposal.voting_deadline) && proposal.status === 'active' ? (
                          <div className="flex gap-2">
                            {(Array.isArray(proposal.voting_options) ? proposal.voting_options : JSON.parse(proposal.voting_options || '[]')).map((option: string) => (
                              <Button
                                key={option}
                                variant={proposal.user_vote === option ? "default" : "outline"}
                                size="sm"
                                onClick={() => castVote(proposal.id, option)}
                                disabled={!!proposal.user_vote}
                              >
                                {option} {proposal.user_vote === option && "✓"}
                              </Button>
                            ))}
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground">
                            {proposal.user_vote ? `You voted: ${proposal.user_vote}` : 'Voting closed'}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="policies" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Family Policies</h3>
              <Dialog open={newPolicyOpen} onOpenChange={setNewPolicyOpen}>
                <DialogTrigger asChild>
                  <Button>Create Policy</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Policy</DialogTitle>
                    <DialogDescription>
                      Create a new family policy document
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="policy-title">Title</Label>
                      <Input
                        id="policy-title"
                        value={newPolicy.title}
                        onChange={(e) => setNewPolicy(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="Policy title"
                      />
                    </div>
                    <div>
                      <Label htmlFor="policy-description">Description</Label>
                      <Textarea
                        id="policy-description"
                        value={newPolicy.description}
                        onChange={(e) => setNewPolicy(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Policy description and details"
                      />
                    </div>
                    <div>
                      <Label htmlFor="policy-type">Type</Label>
                      <Select
                        value={newPolicy.policy_type}
                        onValueChange={(value) => setNewPolicy(prev => ({ ...prev, policy_type: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="investment">Investment</SelectItem>
                          <SelectItem value="spending">Spending</SelectItem>
                          <SelectItem value="governance">Governance</SelectItem>
                          <SelectItem value="succession">Succession</SelectItem>
                          <SelectItem value="philanthropy">Philanthropy</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="effective-date">Effective Date</Label>
                      <Input
                        id="effective-date"
                        type="date"
                        value={newPolicy.effective_date}
                        onChange={(e) => setNewPolicy(prev => ({ ...prev, effective_date: e.target.value }))}
                      />
                    </div>
                    <Button onClick={createPolicy} className="w-full">
                      Create Policy
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {policies.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No policies yet. Create your first policy to get started.
              </div>
            ) : (
              <div className="space-y-4">
                {policies.map((policy) => (
                  <Card key={policy.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{policy.title}</CardTitle>
                          <CardDescription>{policy.description}</CardDescription>
                        </div>
                        <Badge className={getStatusColor(policy.status)}>
                          {policy.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <FileText className="h-4 w-4" />
                          {policy.policy_type.replace('_', ' ')}
                        </div>
                        {policy.effective_date && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            Effective: {new Date(policy.effective_date).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}