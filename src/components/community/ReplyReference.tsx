import DOMPurify from 'dompurify'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'

type ReplyReferenceProps = {
  author: string
  avatar: string | null
  content: string
  onClick?: () => void
}

export function ReplyReference({ author, avatar, content, onClick }: ReplyReferenceProps) {
  const excerpt = DOMPurify.sanitize(content, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] })
  return (
    <Button variant="ghost" className="community-reply-reference" onClick={onClick} aria-label={`Original message from ${author}`}>
      <span className="community-reply-connector" aria-hidden="true" />
      <Avatar className="h-4 w-4 shrink-0">
        {avatar && <AvatarImage src={avatar} alt="" />}
        <AvatarFallback className="bg-muted text-muted-foreground text-[8px]">{author.slice(0, 1)}</AvatarFallback>
      </Avatar>
      <span className="community-reply-author">{author}</span>
      <span className="community-reply-excerpt">{excerpt || 'Attachment'}</span>
    </Button>
  )
}