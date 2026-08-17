import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { SmilePlus } from 'lucide-react'

const EMOJIS = ['👍', '❤️', '🔥', '👏', '😂', '🎉', '💡', '🙏']

interface Props {
  commentId: string
  userId?: string
}

export function CommentReactions({ commentId, userId }: Props) {
  const [rows, setRows] = useState<{ reaction_type: string; user_id: string }[]>([])
  const [open, setOpen] = useState(false)

  const load = async () => {
    const { data } = await supabase
      .from('community_comment_reactions')
      .select('reaction_type, user_id')
      .eq('comment_id', commentId)
    setRows(data || [])
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commentId])

  const counts = rows.reduce<Record<string, { count: number; mine: boolean }>>((acc, r) => {
    const entry = acc[r.reaction_type] || { count: 0, mine: false }
    entry.count += 1
    if (r.user_id === userId) entry.mine = true
    acc[r.reaction_type] = entry
    return acc
  }, {})

  const toggle = async (emoji: string) => {
    if (!userId) return
    const mine = counts[emoji]?.mine
    // optimistic
    setRows(prev =>
      mine
        ? prev.filter(r => !(r.user_id === userId && r.reaction_type === emoji))
        : [...prev, { reaction_type: emoji, user_id: userId }]
    )
    setOpen(false)
    if (mine) {
      await supabase
        .from('community_comment_reactions')
        .delete()
        .eq('comment_id', commentId)
        .eq('user_id', userId)
        .eq('reaction_type', emoji)
    } else {
      await supabase
        .from('community_comment_reactions')
        .insert({ comment_id: commentId, user_id: userId, reaction_type: emoji })
    }
    load()
  }

  return (
    <div className="flex items-center gap-1 mt-1 flex-wrap">
      {Object.entries(counts).map(([emoji, { count, mine }]) => (
        <button
          key={emoji}
          onClick={() => toggle(emoji)}
          className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors ${
            mine ? 'border-primary bg-primary/10 text-foreground' : 'border-border bg-background hover:bg-muted'
          }`}
        >
          <span>{emoji}</span>
          <span className="text-[10px] text-muted-foreground">{count}</span>
        </button>
      ))}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            className="flex items-center rounded-full border border-border bg-background px-2 py-0.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Add reaction"
          >
            <SmilePlus className="h-3.5 w-3.5" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" align="start">
          <div className="flex gap-1">
            {EMOJIS.map(e => (
              <button
                key={e}
                onClick={() => toggle(e)}
                className="text-lg rounded hover:bg-muted px-1.5 py-0.5 transition-colors"
              >
                {e}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
