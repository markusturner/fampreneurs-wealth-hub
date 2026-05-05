import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'

interface Poll {
  id: string
  question: string
  options: string[]
}

export function PollDisplay({ postId }: { postId: string }) {
  const { user } = useAuth()
  const [poll, setPoll] = useState<Poll | null>(null)
  const [votes, setVotes] = useState<{ option_index: number; user_id: string }[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const { data: pollData } = await supabase
      .from('community_polls')
      .select('id, question, options')
      .eq('post_id', postId)
      .maybeSingle()
    if (!pollData) { setPoll(null); setLoading(false); return }
    const opts = Array.isArray(pollData.options) ? (pollData.options as string[]) : []
    setPoll({ id: pollData.id, question: pollData.question, options: opts })
    const { data: votesData } = await supabase
      .from('community_poll_votes')
      .select('option_index, user_id')
      .eq('poll_id', pollData.id)
    setVotes(votesData || [])
    setLoading(false)
  }, [postId])

  useEffect(() => { load() }, [load])

  if (loading || !poll) return null

  const totalVotes = votes.length
  const myVote = votes.find(v => v.user_id === user?.id)?.option_index

  const vote = async (idx: number) => {
    if (!user?.id) return
    if (myVote === idx) {
      await supabase.from('community_poll_votes').delete().eq('poll_id', poll.id).eq('user_id', user.id)
    } else if (myVote != null) {
      await supabase.from('community_poll_votes').update({ option_index: idx }).eq('poll_id', poll.id).eq('user_id', user.id)
    } else {
      await supabase.from('community_poll_votes').insert({ poll_id: poll.id, user_id: user.id, option_index: idx })
    }
    load()
  }

  return (
    <div className="mt-3 border rounded-xl p-3 bg-muted/20">
      <p className="font-semibold text-sm mb-2">{poll.question}</p>
      <div className="space-y-1.5">
        {poll.options.map((opt, idx) => {
          const count = votes.filter(v => v.option_index === idx).length
          const pct = totalVotes ? Math.round((count / totalVotes) * 100) : 0
          const isMine = myVote === idx
          return (
            <button
              key={idx}
              type="button"
              onClick={() => vote(idx)}
              className={`w-full text-left rounded-lg overflow-hidden relative border transition-colors ${isMine ? 'border-[#ffb500]' : 'border-border hover:border-foreground/30'}`}
            >
              <div className={`absolute inset-y-0 left-0 ${isMine ? 'bg-[#ffb500]/30' : 'bg-muted'}`} style={{ width: `${pct}%` }} />
              <div className="relative flex items-center justify-between px-3 py-2 text-sm">
                <span>{opt}</span>
                <span className="text-xs text-muted-foreground">{pct}% · {count}</span>
              </div>
            </button>
          )
        })}
      </div>
      <p className="text-[10px] text-muted-foreground mt-2">{totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}{myVote != null ? ' · Tap your choice again to remove' : ''}</p>
    </div>
  )
}
