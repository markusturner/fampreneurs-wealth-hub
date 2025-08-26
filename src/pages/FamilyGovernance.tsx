import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { NavHeader } from "@/components/dashboard/nav-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar, Vote, FileText, Clock, Users, ArrowLeft, Gavel, Crown, UserCheck } from 'lucide-react'
import { useToast } from "@/hooks/use-toast"
import { useNavigate } from 'react-router-dom'

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

interface FamilyMember {
  id: string
  full_name: string
  email?: string
  family_position: string
  governance_branch?: string | null
  status: string
}

interface VoteRecord {
  id: string
  proposal_id: string
  vote_choice: string
  voted_at: string
}

export default function FamilyGovernance() {
  const { user } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [policies, setPolicies] = useState<Policy[]>([])
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [votes, setVotes] = useState<VoteRecord[]>([])
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([])
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
    if (!user) {
      navigate('/auth')
      return
    }
    loadGovernanceData()
  }, [user, navigate])

  const loadGovernanceData = async () => {
    try {
      setLoading(true)
      
      // Load policies
      const { data: policiesData, error: policiesError } = await supabase
        .from('family_governance_policies')
        .select('*')
        .order('created_at', { ascending: false })

      if (policiesError) {
        console.error('Policies error:', policiesError)
      } else {
        setPolicies(policiesData || [])
      }

      // Load proposals
      const { data: proposalsData, error: proposalsError } = await supabase
        .from('family_voting_proposals')
        .select('*')
        .order('created_at', { ascending: false })

      if (proposalsError) {
        console.error('Proposals error:', proposalsError)
      } else {
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
      }

      // Load user votes
      const { data: votesData, error: votesError } = await supabase
        .from('family_votes')
        .select('*')
        .eq('user_id', user?.id || '')

      if (votesError) {
        console.error('Votes error:', votesError)
      } else {
        setVotes(votesData || [])
      }

      // Load family members
      const { data: familyMembersData, error: familyMembersError } = await supabase
        .from('family_members')
        .select('id, full_name, family_position, governance_branch, status')
        .not('governance_branch', 'is', null)
        .neq('governance_branch', '')
        .order('created_at', { ascending: false })

      if (familyMembersError) {
        console.error('Family members error:', familyMembersError)
      } else {
        console.log('Loaded family members:', familyMembersData)
        setFamilyMembers(familyMembersData || [])
      }

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

  // Helper to normalize branch values and robustly detect branch keys
  const normalizeBranch = (branch?: string | null) =>
    branch ? branch.toLowerCase().replace(/[^a-z]+/g, '_').replace(/^_+|_+$/g, '') : ''

  const branchKey = (branch?: string | null) => {
    const n = normalizeBranch(branch)
    if (!n) return ''
    if (n.includes('elder')) return 'council_of_elders'
    if (n.includes('assembly')) return 'family_assembly'
    if (n.includes('council')) return 'family_council'
    return ''
  }

  const getFamilyCouncilMembers = () =>
    familyMembers.filter(m => branchKey(m.governance_branch) === 'family_council')

  const getCouncilOfEldersMembers = () =>
    familyMembers.filter(m => branchKey(m.governance_branch) === 'council_of_elders')

  const getFamilyAssemblyMembers = () =>
    familyMembers.filter(m => branchKey(m.governance_branch) === 'family_assembly')

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <NavHeader onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <main className="container mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
          <div className="text-center py-8">Loading governance data...</div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <NavHeader onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      
      <main className="container mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate('/documents')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Family Constitution
          </Button>
        </div>

        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold text-foreground">Family Governance</h1>
          <p className="text-muted-foreground">
            Manage family policies and voting proposals for transparent decision-making
          </p>
        </div>

        {/* Main Content */}
        <Card>
          <CardContent className="p-6">
            <Tabs defaultValue="governance-structure" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="governance-structure">Governance Structure</TabsTrigger>
                <TabsTrigger value="proposals">Voting Proposals</TabsTrigger>
                <TabsTrigger value="policies">Family Policies</TabsTrigger>
              </TabsList>

              <TabsContent value="governance-structure" className="space-y-6 mt-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-semibold">Three Branches of Family Governance</h3>
                    <p className="text-sm text-muted-foreground">
                      The foundational structure that ensures balanced decision-making and accountability
                    </p>
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-3">
                  {/* Family Council - Executive Branch */}
                  <Card className="border-l-4 border-l-blue-500">
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <Crown className="h-8 w-8 text-blue-500" />
                        <div>
                          <CardTitle className="text-lg">Family Council</CardTitle>
                          <CardDescription>Executive Branch</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">
                        Responsible for implementing family policies, managing day-to-day operations, and executing strategic decisions.
                      </p>
                      <div className="space-y-2">
                        <div className="text-sm">
                          <strong>Key Responsibilities:</strong>
                        </div>
                        <ul className="text-xs text-muted-foreground space-y-1 ml-4">
                          <li>• Strategic planning & execution</li>
                          <li>• Resource allocation</li>
                          <li>• Policy implementation</li>
                          <li>• Family office management</li>
                        </ul>
                      </div>
                      
                      <div className="mt-4 pt-4 border-t">
                        <div className="text-sm font-medium mb-2">Council Members:</div>
                        {getFamilyCouncilMembers().length === 0 ? (
                          <p className="text-xs text-muted-foreground italic">No members assigned yet</p>
                        ) : (
                          <div className="space-y-2">
                            {getFamilyCouncilMembers().map((member) => (
                              <div key={member.id} className="flex items-center justify-between text-xs">
                                <span className="font-medium">{member.full_name}</span>
                                <Badge variant="outline" className="text-xs">
                                  {member.family_position}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Council of Elders - Judicial Branch */}
                  <Card className="border-l-4 border-l-purple-500">
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <Gavel className="h-8 w-8 text-purple-500" />
                        <div>
                          <CardTitle className="text-lg">Council of Elders</CardTitle>
                          <CardDescription>Judicial Branch</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">
                        Provides wisdom, oversight, and resolution of disputes. Ensures family values and traditions are preserved.
                      </p>
                      <div className="space-y-2">
                        <div className="text-sm">
                          <strong>Key Responsibilities:</strong>
                        </div>
                        <ul className="text-xs text-muted-foreground space-y-1 ml-4">
                          <li>• Dispute resolution</li>
                          <li>• Ethics oversight</li>
                          <li>• Constitutional interpretation</li>
                          <li>• Family legacy preservation</li>
                        </ul>
                      </div>
                      
                      <div className="mt-4 pt-4 border-t">
                        <div className="text-sm font-medium mb-2">Elder Members:</div>
                        {getCouncilOfEldersMembers().length === 0 ? (
                          <p className="text-xs text-muted-foreground italic">No elders assigned yet</p>
                        ) : (
                          <div className="space-y-2">
                            {getCouncilOfEldersMembers().map((member) => (
                              <div key={member.id} className="flex items-center justify-between text-xs">
                                <span className="font-medium">{member.full_name}</span>
                                <Badge variant="outline" className="text-xs">
                                  {member.family_position}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Family Assembly - Legislative Branch */}
                  <Card className="border-l-4 border-l-green-500">
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <UserCheck className="h-8 w-8 text-green-500" />
                        <div>
                          <CardTitle className="text-lg">Family Assembly</CardTitle>
                          <CardDescription>Legislative Branch</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">
                        Democratic voice of all family members. Creates policies, approves budgets, and makes major decisions through voting.
                      </p>
                      <div className="space-y-2">
                        <div className="text-sm">
                          <strong>Key Responsibilities:</strong>
                        </div>
                        <ul className="text-xs text-muted-foreground space-y-1 ml-4">
                          <li>• Policy creation & amendment</li>
                          <li>• Budget approval</li>
                          <li>• Major decision voting</li>
                          <li>• Family member representation</li>
                        </ul>
                      </div>
                      
                      <div className="mt-4 pt-4 border-t">
                        <div className="text-sm font-medium mb-2">Assembly Members:</div>
                        {getFamilyAssemblyMembers().length === 0 ? (
                          <p className="text-xs text-muted-foreground italic">No assembly members assigned yet</p>
                        ) : (
                          <div className="space-y-2">
                            {getFamilyAssemblyMembers().map((member) => (
                              <div key={member.id} className="flex items-center justify-between text-xs">
                                <span className="font-medium">{member.full_name}</span>
                                <Badge variant="outline" className="text-xs">
                                  {member.family_position}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Governance Framework Overview */}
                <Card>
                  <CardHeader>
                    <CardTitle>How Our Governance System Works</CardTitle>
                    <CardDescription>
                      A balanced approach to family decision-making that ensures accountability, transparency, and preservation of family values
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-6 md:grid-cols-2">
                      <div>
                        <h4 className="font-semibold mb-2">Checks and Balances</h4>
                        <p className="text-sm text-muted-foreground">
                          Each branch has distinct powers and responsibilities, with built-in mechanisms to prevent any single entity from having unchecked authority.
                        </p>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">Decision Flow</h4>
                        <p className="text-sm text-muted-foreground">
                          Proposals originate in the Assembly, are implemented by the Council, and overseen by the Elders for compliance and wisdom.
                        </p>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">Representation</h4>
                        <p className="text-sm text-muted-foreground">
                          All family members have a voice through the Assembly, while experienced members guide through the Council and Elders.
                        </p>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">Continuity</h4>
                        <p className="text-sm text-muted-foreground">
                          The structure ensures smooth transitions across generations while maintaining family values and institutional knowledge.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="proposals" className="space-y-6 mt-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-semibold">Active Proposals</h3>
                    <p className="text-sm text-muted-foreground">
                      Vote on important family decisions and track progress
                    </p>
                  </div>
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
                  <div className="text-center py-12 text-muted-foreground">
                    <Vote className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                    <h4 className="text-lg font-medium mb-2">No proposals yet</h4>
                    <p>Create your first proposal to get started with family voting.</p>
                  </div>
                ) : (
                  <div className="grid gap-6">
                    {proposals.map((proposal) => (
                      <Card key={proposal.id} className="border-l-4 border-l-primary">
                        <CardHeader>
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <CardTitle className="text-xl">{proposal.title}</CardTitle>
                              <CardDescription className="mt-2">{proposal.description}</CardDescription>
                            </div>
                            <Badge className={getStatusColor(proposal.status)}>
                              {proposal.status}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div className="flex items-center gap-6 text-sm text-muted-foreground">
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                Deadline: {new Date(proposal.voting_deadline).toLocaleDateString()}
                              </div>
                              <div className="flex items-center gap-2">
                                <Users className="h-4 w-4" />
                                {proposal.vote_count} votes cast
                              </div>
                              <Badge variant="outline">
                                {proposal.proposal_type.replace('_', ' ')}
                              </Badge>
                            </div>
                            
                            {isVotingOpen(proposal.voting_deadline) && proposal.status === 'active' ? (
                              <div className="space-y-3">
                                <div className="text-sm font-medium">Cast your vote:</div>
                                <div className="flex gap-3">
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
                              </div>
                            ) : (
                              <div className="text-sm text-muted-foreground p-3 bg-muted rounded-lg">
                                {proposal.user_vote ? `You voted: ${proposal.user_vote}` : 'Voting period has ended'}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="policies" className="space-y-6 mt-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-semibold">Family Policies</h3>
                    <p className="text-sm text-muted-foreground">
                      Established guidelines and rules governing family decisions
                    </p>
                  </div>
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
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                    <h4 className="text-lg font-medium mb-2">No policies yet</h4>
                    <p>Create your first policy to establish family governance guidelines.</p>
                  </div>
                ) : (
                  <div className="grid gap-6">
                    {policies.map((policy) => (
                      <Card key={policy.id} className="border-l-4 border-l-secondary">
                        <CardHeader>
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <CardTitle className="text-xl">{policy.title}</CardTitle>
                              <CardDescription className="mt-2">{policy.description}</CardDescription>
                            </div>
                            <Badge className={getStatusColor(policy.status)}>
                              {policy.status}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center gap-6 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4" />
                              {policy.policy_type.replace('_', ' ')}
                            </div>
                            {policy.effective_date && (
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                Effective: {new Date(policy.effective_date).toLocaleDateString()}
                              </div>
                            )}
                            <div className="text-xs">
                              Created: {new Date(policy.created_at).toLocaleDateString()}
                            </div>
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
      </main>
    </div>
  )
}
