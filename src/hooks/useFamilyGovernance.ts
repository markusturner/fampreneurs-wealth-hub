import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'

export interface GovernancePolicy {
  id: string
  created_by: string
  title: string
  description: string
  policy_type: 'investment' | 'spending' | 'governance' | 'succession' | 'other'
  content: Record<string, any>
  status: 'draft' | 'active' | 'archived'
  effective_date: string | null
  review_date: string | null
  approval_required: boolean
  created_at: string
  updated_at: string
}

export interface VotingProposal {
  id: string
  created_by: string
  title: string
  description: string
  proposal_type: 'policy' | 'investment' | 'governance' | 'spending' | 'other'
  voting_deadline: string
  status: 'draft' | 'active' | 'closed' | 'cancelled'
  requires_unanimous: boolean
  minimum_participation_percent: number
  options: string[]
  results: Record<string, number>
  created_at: string
  updated_at: string
}

export interface Vote {
  id: string
  proposal_id: string
  voter_id: string
  vote_choice: string
  voted_at: string
  notes?: string
}

export function useFamilyGovernance() {
  const [policies, setPolicies] = useState<GovernancePolicy[]>([])
  const [proposals, setProposals] = useState<VotingProposal[]>([])
  const [userVotes, setUserVotes] = useState<Vote[]>([])
  const [loading, setLoading] = useState(false)
  const { user } = useAuth()
  const { toast } = useToast()

  const loadPolicies = useCallback(async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('family_governance_policies')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setPolicies(data || [])
    } catch (error) {
      console.error('Error loading policies:', error)
      toast({
        title: "Error loading policies",
        description: "There was an error loading the family policies.",
        variant: "destructive",
      })
    }
  }, [user, toast])

  const loadProposals = useCallback(async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('family_voting_proposals')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setProposals(data || [])
    } catch (error) {
      console.error('Error loading proposals:', error)
      toast({
        title: "Error loading proposals",
        description: "There was an error loading the voting proposals.",
        variant: "destructive",
      })
    }
  }, [user, toast])

  const loadUserVotes = useCallback(async () => {
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
  }, [user])

  const createPolicy = async (policyData: Omit<GovernancePolicy, 'id' | 'created_by' | 'created_at' | 'updated_at'>) => {
    if (!user) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('family_governance_policies')
        .insert({
          created_by: user.id,
          ...policyData
        })
        .select()
        .single()

      if (error) throw error

      setPolicies(prev => [data, ...prev])
      toast({
        title: "Policy created successfully",
        description: "The family policy has been created.",
      })

      return data
    } catch (error) {
      console.error('Error creating policy:', error)
      toast({
        title: "Error creating policy",
        description: "There was an error creating the policy.",
        variant: "destructive",
      })
      throw error
    } finally {
      setLoading(false)
    }
  }

  const updatePolicy = async (policyId: string, updates: Partial<GovernancePolicy>) => {
    if (!user) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('family_governance_policies')
        .update(updates)
        .eq('id', policyId)
        .select()
        .single()

      if (error) throw error

      setPolicies(prev => prev.map(p => p.id === policyId ? data : p))
      toast({
        title: "Policy updated successfully",
        description: "The family policy has been updated.",
      })

      return data
    } catch (error) {
      console.error('Error updating policy:', error)
      toast({
        title: "Error updating policy",
        description: "There was an error updating the policy.",
        variant: "destructive",
      })
      throw error
    } finally {
      setLoading(false)
    }
  }

  const createProposal = async (proposalData: Omit<VotingProposal, 'id' | 'created_by' | 'created_at' | 'updated_at' | 'results'>) => {
    if (!user) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('family_voting_proposals')
        .insert({
          created_by: user.id,
          results: {},
          ...proposalData
        })
        .select()
        .single()

      if (error) throw error

      setProposals(prev => [data, ...prev])
      toast({
        title: "Proposal created successfully",
        description: "Family members can now vote on your proposal.",
      })

      // Create notification for family members
      await createProposalNotification(data)

      return data
    } catch (error) {
      console.error('Error creating proposal:', error)
      toast({
        title: "Error creating proposal",
        description: "There was an error creating the proposal.",
        variant: "destructive",
      })
      throw error
    } finally {
      setLoading(false)
    }
  }

  const castVote = async (proposalId: string, choice: string, notes?: string) => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('family_votes')
        .insert({
          proposal_id: proposalId,
          voter_id: user.id,
          vote_choice: choice,
          notes
        })
        .select()
        .single()

      if (error) throw error

      setUserVotes(prev => [...prev, data])
      toast({
        title: "Vote cast successfully",
        description: "Your vote has been recorded.",
      })

      // Update proposal results
      await updateProposalResults(proposalId)

      return data
    } catch (error) {
      console.error('Error casting vote:', error)
      toast({
        title: "Error casting vote",
        description: "There was an error recording your vote.",
        variant: "destructive",
      })
      throw error
    }
  }

  const updateProposalResults = async (proposalId: string) => {
    try {
      // Get all votes for this proposal
      const { data: votes, error: votesError } = await supabase
        .from('family_votes')
        .select('vote_choice')
        .eq('proposal_id', proposalId)

      if (votesError) throw votesError

      // Calculate results
      const results = votes.reduce((acc, vote) => {
        acc[vote.vote_choice] = (acc[vote.vote_choice] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      // Update the proposal
      const { error: updateError } = await supabase
        .from('family_voting_proposals')
        .update({ results })
        .eq('id', proposalId)

      if (updateError) throw updateError

      // Update local state
      setProposals(prev => prev.map(p => 
        p.id === proposalId ? { ...p, results } : p
      ))
    } catch (error) {
      console.error('Error updating proposal results:', error)
    }
  }

  const createProposalNotification = async (proposal: VotingProposal) => {
    try {
      // Get family members to notify
      const { data: familyMembers, error } = await supabase
        .from('family_members')
        .select('email')
        .eq('added_by', user?.id)
        .eq('status', 'active')

      if (error) throw error

      // Create notifications for each family member
      const notifications = familyMembers.map(member => ({
        user_id: user?.id, // This should be the family member's user_id, but we'll use creator for now
        title: 'New Voting Proposal',
        message: `A new proposal "${proposal.title}" requires your vote. Deadline: ${new Date(proposal.voting_deadline).toLocaleDateString()}`,
        type: 'governance' as const,
        priority: 'high' as const,
        action_required: true,
        metadata: {
          proposal_id: proposal.id,
          proposal_type: proposal.proposal_type,
          voting_deadline: proposal.voting_deadline
        }
      }))

      if (notifications.length > 0) {
        await supabase
          .from('enhanced_notifications')
          .insert(notifications)
      }
    } catch (error) {
      console.error('Error creating proposal notifications:', error)
    }
  }

  const hasUserVoted = useCallback((proposalId: string) => {
    return userVotes.some(vote => vote.proposal_id === proposalId)
  }, [userVotes])

  const getUserVote = useCallback((proposalId: string) => {
    return userVotes.find(vote => vote.proposal_id === proposalId)
  }, [userVotes])

  const getActiveProposals = useCallback(() => {
    const now = new Date()
    return proposals.filter(p => 
      p.status === 'active' && 
      new Date(p.voting_deadline) > now
    )
  }, [proposals])

  const getClosedProposals = useCallback(() => {
    const now = new Date()
    return proposals.filter(p => 
      p.status === 'closed' || 
      (p.status === 'active' && new Date(p.voting_deadline) <= now)
    )
  }, [proposals])

  useEffect(() => {
    if (user) {
      loadPolicies()
      loadProposals()
      loadUserVotes()
    }
  }, [user, loadPolicies, loadProposals, loadUserVotes])

  return {
    policies,
    proposals,
    userVotes,
    loading,
    createPolicy,
    updatePolicy,
    createProposal,
    castVote,
    hasUserVoted,
    getUserVote,
    getActiveProposals,
    getClosedProposals,
    loadPolicies,
    loadProposals,
    loadUserVotes
  }
}