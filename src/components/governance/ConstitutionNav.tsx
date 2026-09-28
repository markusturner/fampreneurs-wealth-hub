import { useEffect, useState } from 'react'

export const CONSTITUTION_SECTIONS = [
  { id: 'const-identity', label: 'Identity & Documents' },
  { id: 'const-governance', label: 'Governance & Authority' },
  { id: 'const-branches', label: 'Three Branches' },
  { id: 'const-legacy', label: 'Legacy & Development' },
  { id: 'const-education', label: 'Family Education' },
  { id: 'const-actions', label: 'Quick Actions' },
]

export function ConstitutionNav() {
  const [active, setActive] = useState(CONSTITUTION_SECTIONS[0].id)

  useEffect(() => {
    const obs = new IntersectionObserver(
      entries => {
        const vis = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (vis[0]) setActive(vis[0].target.id)
      },
      { rootMargin: '-15% 0px -70% 0px' }
    )
    CONSTITUTION_SECTIONS.forEach(s => { const el = document.getElementById(s.id); if (el) obs.observe(el) })
    return () => obs.disconnect()
  }, [])

  const go = (id: string) => {
    setActive(id)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <>
      {/* Mobile: sticky pill row */}
      <nav className="lg:hidden sticky top-14 z-20 -mx-4 mb-6 bg-background/90 backdrop-blur px-4 py-2 border-b border-border">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {CONSTITUTION_SECTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => go(s.id)}
              className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition-colors ${active === s.id ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Desktop: sticky side menu */}
      <aside className="hidden lg:block">
        <nav className="sticky top-6 space-y-1 border-l border-border">
          <p className="pl-4 pb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">On this page</p>
          {CONSTITUTION_SECTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => go(s.id)}
              className={`-ml-px block w-full border-l-2 py-1.5 pl-4 text-left text-sm transition-colors ${active === s.id ? 'border-accent font-medium text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            >
              {s.label}
            </button>
          ))}
        </nav>
      </aside>
    </>
  )
}
