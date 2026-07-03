import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useAuth } from '@/contexts/AuthContext'
import { useUserRole } from '@/hooks/useUserRole'
import { useOwnerRole } from '@/hooks/useOwnerRole'
import { NotificationBell } from '@/components/dashboard/notification-bell'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Loader2, ChevronDown, User, Shield, HeartPulse, ClipboardList, LogOut } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'


export default function Welcome() {
  const { user, profile, loading, signOut } = useAuth()
  const { isAdmin } = useUserRole()
  const { isOwner } = useOwnerRole(user?.id ?? null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth', { replace: true })
    }
  }, [user, loading, navigate])

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

      {/* Subtle dot pattern */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage: 'radial-gradient(circle, hsl(var(--foreground)) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      {/* Top-right utilities */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-8 flex items-center gap-3 z-20">
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
          className="h-24 sm:h-32 w-auto mb-8 sm:mb-10"
        />

        <h1 className="text-3xl sm:text-5xl md:text-6xl font-montserrat font-semibold tracking-[0.22em] uppercase text-foreground mb-4 sm:mb-5">
          Welcome back, {firstName}
        </h1>

        <p className="text-[10px] sm:text-xs tracking-[0.35em] uppercase text-muted-foreground mb-6 sm:mb-8">
          WHAT ARE YOU FOCUSING ON TODAY?
        </p>

        <div className="w-32 sm:w-48 h-px bg-secondary mb-8 sm:mb-10" />

        <nav className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-0">
          <DropdownMenu>
            <DropdownMenuTrigger className="group inline-flex items-center gap-1.5 text-xs sm:text-sm tracking-[0.2em] uppercase font-medium text-foreground hover:text-accent transition-colors px-4 py-2 outline-none">
              Community
              <ChevronDown className="h-3 w-3 opacity-60 group-hover:opacity-100 transition-opacity" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="min-w-[240px] rounded-none border-border/60 bg-background/95 backdrop-blur">
              <DropdownMenuItem
                onClick={() => navigate('/workspace-community?program=tfv')}
                className="text-[11px] tracking-[0.2em] uppercase font-medium justify-center py-3 hover:text-secondary focus:text-secondary data-[highlighted]:bg-transparent data-[highlighted]:text-secondary"
              >
                The Family Vault
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => navigate('/workspace-community?program=tfba')}
                className="text-[11px] tracking-[0.2em] uppercase font-medium justify-center py-3 hover:text-secondary focus:text-secondary data-[highlighted]:bg-transparent data-[highlighted]:text-secondary"
              >
                The Family Business Accelerator
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => navigate('/workspace-community?program=tffm')}
                className="text-[11px] tracking-[0.2em] uppercase font-medium justify-center py-3 hover:text-secondary focus:text-secondary data-[highlighted]:bg-transparent data-[highlighted]:text-secondary"
              >
                The Succession Society
              </DropdownMenuItem>

            </DropdownMenuContent>
          </DropdownMenu>

          <div className="hidden sm:block w-px h-4 bg-secondary mx-2" />
          <div className="sm:hidden w-12 h-px bg-secondary/60 my-1" />

          <button
            onClick={() => navigate('/classroom')}
            className="text-xs sm:text-sm tracking-[0.2em] uppercase font-medium text-foreground hover:text-accent transition-colors px-4 py-2"
          >
            Content
          </button>

          <div className="hidden sm:block w-px h-4 bg-secondary mx-2" />
          <div className="sm:hidden w-12 h-px bg-secondary/60 my-1" />

          <button
            onClick={() => navigate('/dashboard')}
            className="text-xs sm:text-sm tracking-[0.2em] uppercase font-medium text-foreground hover:text-accent transition-colors px-4 py-2"
          >
            Digital Family Office
          </button>
        </nav>
      </div>
    </main>
  )
}
