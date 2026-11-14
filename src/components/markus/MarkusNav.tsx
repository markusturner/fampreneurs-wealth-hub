import { Link, useLocation } from 'react-router-dom'
import { Bot, BookOpen, Brain, GraduationCap, LayoutDashboard, MessageSquare, Phone, Sparkles } from 'lucide-react'
import { MARKUS_NAV, isMarkusMemberProgram, type MarkusNavKey } from '@/lib/markus-member'
import { useAuth } from '@/contexts/AuthContext'
import { useIsAdminOrOwner } from '@/hooks/useIsAdminOrOwner'
import { cn } from '@/lib/utils'

export const MARKUS_NAV_ICONS: Record<MarkusNavKey, React.ComponentType<{ className?: string }>> = {
  chat: Bot, voice: Phone, dfo: LayoutDashboard, community: MessageSquare,
  courses: GraduationCap, knowledge: BookOpen, memories: Brain, skills: Sparkles,
}

export function isMarkusNavActive(href: string, pathname: string, search: string) {
  const [path, query] = href.split('?')
  if (pathname !== path) return false
  return query ? search.includes(query) : true
}

// Phones have no left menu, so Markus members get the same links as a scrolling row.
export function MarkusMobileTabs() {
  const { profile } = useAuth()
  const { isAdminOrOwner } = useIsAdminOrOwner()
  const { pathname, search } = useLocation()
  if (!isMarkusMemberProgram(profile?.program_name) || isAdminOrOwner) return null
  return (
    <nav aria-label="Markus AI" className="flex shrink-0 gap-1.5 overflow-x-auto border-b border-border bg-card px-3 py-2 md:hidden [scrollbar-width:none]">
      {MARKUS_NAV.map((item) => {
        const Icon = MARKUS_NAV_ICONS[item.key]
        const active = isMarkusNavActive(item.href, pathname, search)
        return (
          <Link key={item.key} to={item.href} className={cn('inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium', active ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground')}>
            <Icon className="h-3.5 w-3.5" />{item.label}
          </Link>
        )
      })}
    </nav>
  )
}

export function MarkusPage({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-col">
      <MarkusMobileTabs />
      <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 sm:py-10">
        <h1 className="font-montserrat text-2xl font-bold sm:text-3xl">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  )
}
