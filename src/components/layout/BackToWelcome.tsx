import { useNavigate } from 'react-router-dom'
import { Undo2 } from 'lucide-react'
import { useIsMobile } from '@/hooks/use-mobile'

export function BackToWelcome() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()

  if (isMobile) return null

  return (
    <button
      onClick={() => navigate('/welcome')}
      className="inline-flex items-center gap-1.5 rounded-full border border-[#ffb500] bg-background px-3 py-1.5 text-xs font-semibold text-[#290a52] shadow-sm hover:bg-[#ffb500] hover:text-[#290a52] transition-colors"
    >
      <Undo2 className="h-3.5 w-3.5" />
      Welcome
    </button>
  )
}

