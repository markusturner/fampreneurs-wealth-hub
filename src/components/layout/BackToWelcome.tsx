import { useNavigate } from 'react-router-dom'
import { Undo2 } from 'lucide-react'

export function BackToWelcome() {
  const navigate = useNavigate()

  return (
    <button
      onClick={() => navigate('/welcome')}
      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground shadow-sm hover:border-[#2eb2ff] hover:text-[#2eb2ff] transition-colors"
    >
      <Undo2 className="h-3.5 w-3.5" />
      Welcome
    </button>
  )
}
