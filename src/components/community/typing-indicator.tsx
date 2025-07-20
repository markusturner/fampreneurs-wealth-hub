import { useEffect, useState } from 'react'

interface TypingIndicatorProps {
  isTyping: boolean
  typingUser?: string
}

export function TypingIndicator({ isTyping, typingUser }: TypingIndicatorProps) {
  const [dots, setDots] = useState('')

  useEffect(() => {
    if (!isTyping) {
      setDots('')
      return
    }

    const interval = setInterval(() => {
      setDots(prev => {
        if (prev.length >= 3) return ''
        return prev + '.'
      })
    }, 500)

    return () => clearInterval(interval)
  }, [isTyping])

  if (!isTyping) return null

  return (
    <div className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground">
      <div className="flex gap-1">
        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse" />
        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse [animation-delay:0.2s]" />
        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse [animation-delay:0.4s]" />
      </div>
      <span>
        {typingUser ? `${typingUser} is typing${dots}` : `Someone is typing${dots}`}
      </span>
    </div>
  )
}