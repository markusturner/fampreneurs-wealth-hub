import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useAuth } from '@/contexts/AuthContext'
import { useUserRole } from '@/hooks/useUserRole'
import { useOwnerRole } from '@/hooks/useOwnerRole'
import { NotificationBell } from '@/components/dashboard/notification-bell'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Loader2, ChevronDown, User, Shield, HeartPulse, ClipboardList, LogOut, Video } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TutorialVideoModal } from '@/components/dashboard/tutorial-video-modal'
import { useTutorialVideo } from '@/hooks/useTutorialVideo'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'


const LAST_USED_KEY = 'truheirs:lastUsed'

const COMMUNITY_LABELS: Record<string, string> = {
  tfv: 'The Family Vault',
  tfba: 'The Family Business Accelerator',
  tffm: 'The Succession Society',
}

type LastUsed = { section: 'community' | 'content' | 'dashboard'; program?: string }

function readLastUsed(): LastUsed | null {
  try {
    const raw = localStorage.getItem(LAST_USED_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function writeLastUsed(v: LastUsed) {
  try { localStorage.setItem(LAST_USED_KEY, JSON.stringify(v)) } catch {}
}

function lastUsedLabel(l: LastUsed | null): string {
  if (!l) return ''
  if (l.section === 'community') return `Community${l.program && COMMUNITY_LABELS[l.program] ? ` — ${COMMUNITY_LABELS[l.program]}` : ''}`
  if (l.section === 'content') return 'Content'
  return 'Digital Family Office'
}

export default function Welcome() {
  const { user, profile, loading, signOut } = useAuth()
  const { isAdmin } = useUserRole()
  const { isOwner } = useOwnerRole(user?.id ?? null)
  const navigate = useNavigate()
  const [tutorialOpen, setTutorialOpen] = useState(false)
  const [lastUsed, setLastUsed] = useState<LastUsed | null>(() => readLastUsed())
  const { markAsWatched } = useTutorialVideo(user?.id || null)

  const go = (section: LastUsed['section'], path: string, program?: string) => {
    const v: LastUsed = { section, ...(program ? { program } : {}) }
    writeLastUsed(v); setLastUsed(v); navigate(path)
  }

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth', { replace: true })
      return
    }
    // On mobile, skip the welcome screen and go straight to the user's community
    if (!loading && user && profile && typeof window !== 'undefined' && window.innerWidth < 768) {
      const pn = (profile?.program_name || '').toLowerCase()
      let slug = 'fbu'
      if (pn.includes('vault')) slug = 'tfv'
      else if (pn.includes('accelerator')) slug = 'tfba'
      else if (pn.includes('mastermind') || pn.includes('fortune') || pn.includes('succession')) slug = 'tffm'
      navigate(`/workspace-community?program=${slug}`, { replace: true })
    }
  }, [user, profile, loading, navigate])

  const firstName = profile?.first_name || 'Member'
  const displayName = profile?.display_name || profile?.first_name || 'Member'
  const initials = `${profile?.first_name?.[0] || ''}${profile?.last_name?.[0] || ''}`.toUpperCase() || 'ME'
  const avatarUrl = profile?.avatar_url

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-secondary" />
      </main>
    )
  }

  if (!user) {
    return null
  }

  return (
    <main className="relative min-h-screen overflow-hidden flex flex-col items-center justify-center p-4 bg-background text-foreground">
      <Helmet>
        <title>Welcome — TruHeirs</title>
        <meta name="description" content="Choose where to go next in your TruHeirs family dashboard." />
        <link rel="canonical" href="https://truheirs.app/welcome" />
        <meta property="og:title" content="Welcome — TruHeirs" />
        <meta property="og:description" content="Choose where to go next in your TruHeirs family dashboard." />
        <meta property="og:url" content="https://truheirs.app/welcome" />
      </Helmet>

      {/* Animated ambient background */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="th-blob th-blob-gold" />
        <div className="th-blob th-blob-purple" />
        <div className="th-blob th-blob-sky" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,hsl(var(--background)/0.9)_55%,hsl(var(--background))_100%)]" />
      </div>

      <style>{`
        @keyframes th-drift-1 { 0% { transform: translate(-30%, -35%) scale(1);} 33% { transform: translate(40%, 20%) scale(1.3);} 66% { transform: translate(-20%, 30%) scale(0.9);} 100% { transform: translate(-30%, -35%) scale(1);} }
        @keyframes th-drift-2 { 0% { transform: translate(35%, 40%) scale(1.1);} 33% { transform: translate(-40%, -25%) scale(0.85);} 66% { transform: translate(25%, -30%) scale(1.25);} 100% { transform: translate(35%, 40%) scale(1.1);} }
        @keyframes th-drift-3 { 0% { transform: translate(45%, -35%) scale(0.9);} 33% { transform: translate(-40%, 35%) scale(1.2);} 66% { transform: translate(30%, 25%) scale(1);} 100% { transform: translate(45%, -35%) scale(0.9);} }
        .th-blob { position:absolute; border-radius:9999px; filter: blur(120px); will-change: transform; }
        .th-blob-gold { width:60vw; height:60vw; background:hsl(var(--secondary)); opacity:0.28; top:-10%; left:20%; animation: th-drift-1 14s ease-in-out infinite; }
        .th-blob-purple { width:65vw; height:65vw; background:hsl(var(--foreground)); opacity:0.1; top:20%; left:-15%; animation: th-drift-2 16s ease-in-out infinite; }
        .th-blob-sky { width:45vw; height:45vw; background:hsl(var(--accent)); opacity:0.22; bottom:-15%; right:-5%; animation: th-drift-3 18s ease-in-out infinite; }
      `}</style>


      {/* Top-right utilities */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-8 flex items-center gap-3 z-20">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0"
          onClick={() => setTutorialOpen(true)}
          title="Watch Tutorial Video"
        >
          <Video className="h-5 w-5" />
        </Button>
        <NotificationBell />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="rounded-full focus:outline-none focus:ring-2 focus:ring-ring">
              <Avatar className="h-9 w-9 sm:h-10 sm:w-10 border border-border/60 bg-secondary/20 cursor-pointer">
                {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
                <AvatarFallback className="text-[11px] font-semibold text-foreground bg-secondary/30">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={() => navigate('/profile-settings')}>
              <User className="h-4 w-4 mr-2" /> Profile Settings
            </DropdownMenuItem>
            {(isAdmin || isOwner) && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/admin-settings')}>
                  <Shield className="h-4 w-4 mr-2" /> Admin Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/client-retention')}>
                  <HeartPulse className="h-4 w-4 mr-2" /> Client Retention
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/client-retention?tab=attendance')}>
                  <ClipboardList className="h-4 w-4 mr-2" /> Attendance Log
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut()} className="text-destructive focus:text-destructive">
              <LogOut className="h-4 w-4 mr-2" /> Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="relative z-10 flex flex-col items-center text-center w-full max-w-4xl">
        <img
          src="/lovable-uploads/00df4658-d6df-420b-8c0d-7af68820837d.png"
          alt="TruHeirs"
          className="h-24 sm:h-32 w-auto mb-3 sm:mb-4"
        />

        <h1 className="text-3xl sm:text-5xl md:text-6xl font-montserrat font-semibold tracking-[0.22em] uppercase text-foreground mb-3 sm:mb-4">
          Welcome back, {firstName}
        </h1>

        {lastUsed ? (
          <p className="text-[11px] sm:text-sm text-muted-foreground max-w-xl mb-5 sm:mb-6 px-4">
            Last time you were logged in, you were working on <span className="text-foreground font-medium">{lastUsedLabel(lastUsed)}</span>. Would you like to continue?
          </p>
        ) : (
          <p className="text-[10px] sm:text-xs tracking-[0.35em] uppercase text-muted-foreground mb-5 sm:mb-6">
            WHAT ARE YOU FOCUSING ON TODAY?
          </p>
        )}

        <div className="w-32 sm:w-48 h-px bg-secondary mb-6 sm:mb-8" />

        <nav className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-0">
          <DropdownMenu>
            <DropdownMenuTrigger className="group inline-flex items-center gap-1.5 text-xs sm:text-sm tracking-[0.2em] uppercase font-medium text-foreground hover:text-accent transition-colors px-4 py-2 outline-none">
              Community
              {lastUsed?.section === 'community' && (
                <span className="ml-1 rounded-full bg-secondary/20 text-secondary text-[8px] sm:text-[9px] tracking-[0.15em] uppercase px-2 py-0.5 font-semibold">Last used</span>
              )}
              <ChevronDown className="h-3 w-3 opacity-60 group-hover:opacity-100 transition-opacity" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="min-w-[280px] rounded-none border-border/60 bg-background/95 backdrop-blur">
              {(['tfv','tfba','tffm'] as const).map(prog => (
                <DropdownMenuItem
                  key={prog}
                  onClick={() => go('community', `/workspace-community?program=${prog}`, prog)}
                  className="text-[11px] tracking-[0.2em] uppercase font-medium justify-center py-3 hover:text-secondary focus:text-secondary data-[highlighted]:bg-transparent data-[highlighted]:text-secondary gap-2"
                >
                  {COMMUNITY_LABELS[prog]}
                  {lastUsed?.section === 'community' && lastUsed.program === prog && (
                    <span className="rounded-full bg-secondary/20 text-secondary text-[8px] tracking-[0.15em] uppercase px-2 py-0.5 font-semibold">Last used</span>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="hidden sm:block w-px h-4 bg-secondary mx-2" />
          <div className="sm:hidden w-12 h-px bg-secondary/60 my-1" />

          <button
            onClick={() => go('content', '/classroom')}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm tracking-[0.2em] uppercase font-medium text-foreground hover:text-accent transition-colors px-4 py-2"
          >
            Content
            {lastUsed?.section === 'content' && (
              <span className="rounded-full bg-secondary/20 text-secondary text-[8px] sm:text-[9px] tracking-[0.15em] uppercase px-2 py-0.5 font-semibold">Last used</span>
            )}
          </button>

          <div className="hidden sm:block w-px h-4 bg-secondary mx-2" />
          <div className="sm:hidden w-12 h-px bg-secondary/60 my-1" />

          <button
            onClick={() => go('dashboard', '/dashboard')}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm tracking-[0.2em] uppercase font-medium text-foreground hover:text-accent transition-colors px-4 py-2"
          >
            Digital Family Office
            {lastUsed?.section === 'dashboard' && (
              <span className="rounded-full bg-secondary/20 text-secondary text-[8px] sm:text-[9px] tracking-[0.15em] uppercase px-2 py-0.5 font-semibold">Last used</span>
            )}
          </button>
        </nav>
      </div>

      {user && tutorialOpen && (
        <TutorialVideoModal
          isOpen={tutorialOpen}
          onClose={() => { markAsWatched(); setTutorialOpen(false); }}
          onWatched={() => { markAsWatched(); setTutorialOpen(false); }}
          onSkipped={() => { markAsWatched(); setTutorialOpen(false); }}
          userId={user.id}
        />
      )}
    </main>
  )
}
