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
  // Family office tabs and community posts live under their own Markus paths.
  if (path !== '/markus-ai' && pathname.startsWith(path + '/')) return true
  if (pathname !== path) return false
  return query ? search.includes(query) : true
}

// Markus-only members always see the Markus menu; admins and owners see it on Markus AI pages to preview the member view.
export function useShowMarkusNav() {
  const { profile } = useAuth()
  const { isAdminOrOwner } = useIsAdminOrOwner()
  const { pathname } = useLocation()
  if (isAdminOrOwner) return pathname === '/markus-ai' || pathname.startsWith('/markus-ai/')
  return isMarkusMemberProgram(profile?.program_name)
}

// Left menu on computers and tablets for the Markus AI member area.
export function MarkusSidebar({ className }: { className?: string }) {
  const { pathname, search } = useLocation()
  const itemClass = (active: boolean) => cn(
    'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
    active ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
  )
  return (
    <aside aria-label="Markus AI menu" className={cn('sticky top-0 h-screen w-60 shrink-0 flex-col bg-sidebar text-sidebar-foreground', className)}>
      <div className="flex items-center gap-3 px-5 py-5">
        <img src="/lovable-uploads/f9de210b-406b-4d7d-9a44-c0e6e5114825.png" alt="" className="h-9 w-9 object-contain" />
        <span className="font-montserrat text-lg font-bold">Markus AI</span>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
        {MARKUS_NAV.map((item) => {
          const Icon = MARKUS_NAV_ICONS[item.key]
          return (
            <Link key={item.key} to={item.href} className={itemClass(isMarkusNavActive(item.href, pathname, search))}>
              <Icon className="h-4 w-4 shrink-0" />{item.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}

// Phones have no left menu, so Markus members get the same links as a scrolling row.
export function MarkusMobileTabs() {
  const show = useShowMarkusNav()
  const { pathname, search } = useLocation()
  if (!show) return null
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
