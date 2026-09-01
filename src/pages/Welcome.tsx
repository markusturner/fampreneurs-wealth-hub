import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useAuth } from '@/contexts/AuthContext'
import { useUserRole } from '@/hooks/useUserRole'
import { useOwnerRole } from '@/hooks/useOwnerRole'
import { NotificationBell } from '@/components/dashboard/notification-bell'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Loader2, ChevronDown, User, Shield, HeartPulse, ClipboardList, FileText, LogOut, Video, Search, Sparkles, Send, BarChart3, Paperclip, Mic, Square, X } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { TutorialVideoModal } from '@/components/dashboard/tutorial-video-modal'
import { StartHereChecklist } from '@/components/dashboard/start-here-checklist'

import { useTutorialVideo } from '@/hooks/useTutorialVideo'
import { profileProgramCodes, programLabel, type ProgramCode } from '@/lib/programs'
import { supabase } from '@/integrations/supabase/client'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import ReactMarkdown from 'react-markdown'



const LAST_USED_KEY = 'truheirs:lastUsed'

const COMMUNITY_LABELS: Record<string, string> = {
  tfv: 'The Family Vault',
  tfba: 'The Private Estate Accelerator',
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

const RACHEL_SUGGESTIONS = [
  'Where is my Family Protection Plan?',
  'How do I create my trust?',
  'Where are the coaching call recordings?',
  'How do I update my profile photo?',
  'Where is the SOP Library?',
]


export default function Welcome() {
  const { user, profile, loading, signOut } = useAuth()
  const { isAdmin } = useUserRole()
  const { isOwner } = useOwnerRole(user?.id ?? null)
  const navigate = useNavigate()
  const [tutorialOpen, setTutorialOpen] = useState(false)
  const [lastUsed, setLastUsed] = useState<LastUsed | null>(() => readLastUsed())
  const [communityOpen, setCommunityOpen] = useState(false)
  const [rachelQuestion, setRachelQuestion] = useState('')
  const [rachelAnswer, setRachelAnswer] = useState('')
  const [rachelLoading, setRachelLoading] = useState(false)
  const [searchFocused, setSearchFocused] = useState(false)
  const [answerAtBottom, setAnswerAtBottom] = useState(false)
  const [answerScrollable, setAnswerScrollable] = useState(false)
  const answerRef = useRef<HTMLDivElement | null>(null)
  const { toast } = useToast()
  const [attachments, setAttachments] = useState<{ name: string; mimeType: string; dataUrl?: string; text?: string }[]>([])
  const [recording, setRecording] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const searchActive = searchFocused || rachelLoading || !!rachelAnswer || rachelQuestion.trim().length > 0 || attachments.length > 0

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    const picked = Array.from(files).slice(0, 5 - attachments.length)
    for (const file of picked) {
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: 'File too large', description: `${file.name} is over 10MB.`, variant: 'destructive' })
        continue
      }
      const mime = file.type || 'application/octet-stream'
      const name = file.name
      const lower = name.toLowerCase()
      const isImage = mime.startsWith('image/')
      const isPdf = mime === 'application/pdf' || lower.endsWith('.pdf')
      const isDocx = lower.endsWith('.docx') || mime.includes('officedocument.wordprocessingml')
      const isPlain = mime.startsWith('text/') || /\.(txt|md|csv|json|rtf)$/.test(lower)

      try {
        if (isImage || isPdf) {
          const dataUrl: string = await new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(String(reader.result))
            reader.onerror = () => reject(reader.error)
            reader.readAsDataURL(file)
          })
          setAttachments(prev => [...prev, { name, mimeType: isPdf ? 'application/pdf' : mime, dataUrl }])
        } else if (isDocx) {
          const mammoth = await import('mammoth/mammoth.browser')
          const buffer = await file.arrayBuffer()
          const result = await (mammoth as any).extractRawText({ arrayBuffer: buffer })
          const text = String(result?.value || '').trim()
          if (!text) throw new Error('empty')
          setAttachments(prev => [...prev, { name, mimeType: 'text/plain', text }])
        } else if (isPlain) {
          const text = (await file.text()).trim()
          setAttachments(prev => [...prev, { name, mimeType: 'text/plain', text }])
        } else {
          toast({
            title: 'Unsupported file',
            description: `${name}: please upload a PDF, Word (.docx), image, or text file.`,
            variant: 'destructive',
          })
        }
      } catch {
        toast({ title: 'Could not read file', description: `${name} could not be opened.`, variant: 'destructive' })
      }
    }
  }


  const transcribe = async (blob: Blob) => {
    setTranscribing(true)
    try {
      const form = new FormData()
      form.append('file', blob, 'recording')
      const { data, error } = await supabase.functions.invoke('transcribe-audio', { body: form })
      if (error) throw error
      const text = (data?.text || '').trim()
      if (!text) throw new Error('empty')
      setRachelQuestion(prev => (prev ? `${prev} ${text}` : text))
    } catch {
      toast({ title: 'Could not hear that', description: 'Please try recording again.', variant: 'destructive' })
    } finally {
      setTranscribing(false)
    }
  }

  const toggleRecording = async () => {
    if (recording) {
      recorderRef.current?.stop()
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        setRecording(false)
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        if (blob.size < 1024) {
          toast({ title: 'That recording was empty', description: 'Hold the mic a bit longer.', variant: 'destructive' })
          return
        }
        await transcribe(blob)
      }
      recorder.start()
      recorderRef.current = recorder
      setRecording(true)
    } catch {
      toast({ title: 'Microphone blocked', description: 'Allow mic access to use dictation.', variant: 'destructive' })
    }
  }

  // Invited users who entered with a temporary link must create their login first
  useEffect(() => {
    if (!loading && (user as any)?.user_metadata?.needs_password_setup) {
      navigate('/setup-login', { replace: true })
    }
  }, [loading, user, navigate])



  useEffect(() => {
    const el = answerRef.current
    if (!el) { setAnswerScrollable(false); return }
    const check = () => setAnswerScrollable(el.scrollHeight - el.clientHeight > 24)
    check()
    const ro = new ResizeObserver(check)
    ro.observe(el)
    return () => ro.disconnect()
  }, [rachelAnswer])

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
      let slug = 'tfv'
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
  const userCodes = profileProgramCodes(profile?.program_name)
  const programBadgeLabel = userCodes.length > 0
    ? userCodes.map(code => programLabel(code)).join(' • ')
    : (profile?.program_name || 'TruHeirs Member')

  const askRachel = async (preset?: string) => {
    const typed = (preset ?? rachelQuestion).trim()
    const message = typed || (attachments.length > 0 ? 'Please review the attached file(s).' : '')
    if (preset) setRachelQuestion(preset)
    if (!message || rachelLoading) return
    setAnswerAtBottom(false)

    setRachelLoading(true)
    setRachelAnswer('')
    try {
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: { message, persona: 'rachel', instructions: '', attachments: preset ? [] : attachments }
      })
      if (error) throw error
      setRachelAnswer(data?.response || 'Rachel could not answer right now. Please try again.')
    } catch {
      setRachelAnswer('Rachel could not answer right now. Please try again.')
    } finally {
      setRachelLoading(false)
    }
  }

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
                <DropdownMenuItem onClick={() => navigate('/client-metrics')}>
                  <BarChart3 className="h-4 w-4 mr-2" /> Client Metrics
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/admin-settings')}>
                  <Shield className="h-4 w-4 mr-2" /> Admin Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/client-retention')}>
                  <HeartPulse className="h-4 w-4 mr-2" /> Client Retention
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/client-retention?tab=attendance')}>
                  <ClipboardList className="h-4 w-4 mr-2" /> Attendance Log
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/surveys')}>
                  <FileText className="h-4 w-4 mr-2" /> Surveys
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

      <div className={`relative z-10 flex flex-col items-center text-center w-full max-w-4xl transition-all duration-500 ease-out ${searchActive ? '-translate-y-4 sm:-translate-y-8' : ''}`}>
        <img
          src="/lovable-uploads/00df4658-d6df-420b-8c0d-7af68820837d.png"
          alt="TruHeirs"
          loading="eager"
          decoding="sync"
          fetchPriority="high"
          className={`w-auto transition-all duration-500 ease-out ${searchActive ? 'h-12 sm:h-16 mb-2' : 'h-24 sm:h-32 mb-3 sm:mb-4'}`}
        />

        <h1 className={`font-montserrat font-semibold tracking-[0.22em] uppercase text-foreground transition-all duration-500 ease-out ${searchActive ? 'text-sm sm:text-base mb-2' : 'text-3xl sm:text-5xl md:text-6xl mb-3 sm:mb-4'}`}>
          Welcome back, {firstName}
        </h1>

        <div
          className={`grid transition-all duration-500 ease-out w-full ${searchActive ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100'}`}
        >
          <div className="overflow-hidden flex flex-col items-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-secondary/50 bg-sidebar px-4 py-1.5 text-[10px] sm:text-xs font-semibold uppercase tracking-[0.22em] text-secondary shadow-sm">
              <Sparkles className="h-3.5 w-3.5 text-accent" />
              <span>{programBadgeLabel}</span>
            </div>

            {user && (
              <StartHereChecklist
                userId={user.id}
                onWatchVideo={() => setTutorialOpen(true)}
                onGoCommunity={() => {
                  const slug = (userCodes.filter(c => c !== 'fbu')[0] as string) || 'tfv'
                  go('community', `/workspace-community?program=${slug}`, slug)
                }}
              />
            )}


            {lastUsed ? (
              <p className="text-[11px] sm:text-sm text-muted-foreground max-w-xl mb-5 sm:mb-6 px-4">
                Last time you were logged in, you were working on <span className="text-foreground font-medium">{lastUsedLabel(lastUsed)}</span>. Would you like to continue?
              </p>
            ) : (
              <p className="text-[10px] sm:text-xs tracking-[0.35em] uppercase text-muted-foreground mb-5 sm:mb-6">
                WHAT ARE YOU FOCUSING ON TODAY?
              </p>
            )}
          </div>
        </div>

        <div className={`w-32 sm:w-48 h-px bg-secondary transition-all duration-500 ${searchActive ? 'mb-4' : 'mb-6 sm:mb-8'}`} />



        {(() => {
          const communityCodes = userCodes.filter(c => c !== 'fbu') as Array<Exclude<ProgramCode,'fbu'>>
          const isAdminOrOwner = isOwner || isAdmin
          const availableCommunities: ReadonlyArray<Exclude<ProgramCode,'fbu'>> = isAdminOrOwner
            ? ['tfv','tfba','tffm'] as const
            : (communityCodes.length > 0 ? communityCodes.slice(0, 1) : ['tfv'] as const)
          const hasMultiple = isAdminOrOwner && availableCommunities.length > 1
          return (
        <>
        <nav className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-0">
          {hasMultiple ? (
            <button
              onClick={() => setCommunityOpen(v => !v)}
              className="group inline-flex items-center gap-1.5 text-xs sm:text-sm tracking-[0.2em] uppercase font-medium text-foreground hover:text-accent transition-colors px-4 py-2 outline-none"
            >
              Community
              {lastUsed?.section === 'community' && (
                <span className="ml-1 rounded-full bg-secondary/20 text-secondary text-[8px] sm:text-[9px] tracking-[0.15em] uppercase px-2 py-0.5 font-semibold">Last used</span>
              )}
              <ChevronDown className={`h-3 w-3 opacity-60 group-hover:opacity-100 transition-transform ${communityOpen ? 'rotate-180' : ''}`} />
            </button>
          ) : (
            <button
              onClick={() => go('community', `/workspace-community?program=${availableCommunities[0]}`, availableCommunities[0])}
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm tracking-[0.2em] uppercase font-medium text-foreground hover:text-accent transition-colors px-4 py-2"
            >
              Community
              {lastUsed?.section === 'community' && (
                <span className="ml-1 rounded-full bg-secondary/20 text-secondary text-[8px] sm:text-[9px] tracking-[0.15em] uppercase px-2 py-0.5 font-semibold">Last used</span>
              )}
            </button>
          )}


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
        {hasMultiple && (
          <div
            className={`grid transition-all duration-300 ease-out w-full max-w-md ${communityOpen ? 'grid-rows-[1fr] opacity-100 mt-4' : 'grid-rows-[0fr] opacity-0 mt-0'}`}
          >
            <div className="overflow-hidden">
              <div className="flex flex-col gap-1 rounded-xl border border-border/60 bg-background/70 backdrop-blur px-2 py-2">
                {availableCommunities.map(prog => (
                  <button
                    key={prog}
                    onClick={() => { setCommunityOpen(false); go('community', `/workspace-community?program=${prog}`, prog) }}
                    className="relative w-full text-center text-[11px] tracking-[0.2em] uppercase font-medium py-2.5 rounded-lg hover:text-secondary hover:bg-secondary/5 transition-colors"
                  >
                    {COMMUNITY_LABELS[prog]}
                    {lastUsed?.section === 'community' && lastUsed.program === prog && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-secondary/20 text-secondary text-[8px] tracking-[0.15em] uppercase px-2 py-0.5 font-semibold">Last used</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        </>
          )
        })()}

        <section className={`w-full max-w-md text-left transition-all duration-500 ease-out ${searchActive ? 'mt-4' : 'mt-6 sm:mt-8'}`}>
          <div className="flex items-center gap-2 rounded-full border border-border/70 bg-background/80 pl-3 pr-1 py-1 shadow-sm backdrop-blur transition focus-within:border-secondary/60 focus-within:shadow-md">
            <Search className="h-3.5 w-3.5 text-secondary shrink-0" />
            <input
              type="text"
              value={rachelQuestion}
              onChange={(event) => setRachelQuestion(event.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  askRachel()
                }
              }}
              placeholder={recording ? 'Listening…' : transcribing ? 'Writing what you said…' : 'Ask Rachel anything...'}
              className="flex-1 bg-transparent px-1 py-1 text-xs sm:text-sm outline-none placeholder:text-muted-foreground"
            />
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,application/pdf,.txt,.csv"
              className="hidden"
              onChange={(e) => { handleFiles(e.target.files); e.target.value = '' }}
            />
            <button
              type="button"
              aria-label="Attach a photo or file"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              className="h-7 w-7 shrink-0 rounded-full flex items-center justify-center text-muted-foreground hover:text-secondary transition-colors"
            >
              <Paperclip className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              aria-label={recording ? 'Stop recording' : 'Speak your question'}
              onMouseDown={(e) => e.preventDefault()}
              onClick={toggleRecording}
              disabled={transcribing}
              className={`h-7 w-7 shrink-0 rounded-full flex items-center justify-center transition-colors ${recording ? 'bg-destructive/15 text-destructive animate-pulse' : 'text-muted-foreground hover:text-secondary'}`}
            >
              {transcribing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : recording ? <Square className="h-3 w-3" /> : <Mic className="h-3.5 w-3.5" />}
            </button>
            <Button
              size="icon"
              className="h-7 w-7 rounded-full"
              onClick={() => askRachel()}
              disabled={(!rachelQuestion.trim() && attachments.length === 0) || rachelLoading}
            >
              {rachelLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            </Button>
          </div>

          {attachments.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {attachments.map((a, i) => (
                <span key={`${a.name}-${i}`} className="flex items-center gap-1.5 rounded-full border border-border/70 bg-background/70 px-2.5 py-1 text-[11px] text-muted-foreground">
                  {a.mimeType.startsWith('image/')
                    ? <img src={a.dataUrl} alt={a.name} className="h-4 w-4 rounded object-cover" />
                    : <FileText className="h-3 w-3" />}
                  <span className="max-w-[140px] truncate">{a.name}</span>
                  <button type="button" aria-label={`Remove ${a.name}`} onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))}>
                    <X className="h-3 w-3 hover:text-destructive" />
                  </button>
                </span>
              ))}
            </div>
          )}


          {searchActive && !rachelAnswer && !rachelLoading && (
            <div className="mt-3 flex flex-wrap gap-2">
              {RACHEL_SUGGESTIONS.map(s => (
                <button
                  key={s}
                  onMouseDown={(e) => { e.preventDefault(); askRachel(s) }}
                  className="rounded-full border border-border/70 bg-background/70 px-3 py-1.5 text-[11px] text-muted-foreground hover:text-foreground hover:border-secondary/60 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {rachelAnswer && (
            <div className="relative mt-3">
              <div
                ref={answerRef}
                onScroll={(e) => {
                  const el = e.currentTarget
                  setAnswerAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 24)
                }}
                onWheel={(e) => e.stopPropagation()}
                style={{ WebkitOverflowScrolling: 'touch' }}
                className="max-h-[45vh] overflow-y-auto overscroll-contain touch-pan-y rounded-xl bg-muted/60 px-4 pt-3 pb-10 text-left text-xs sm:text-sm leading-relaxed text-foreground prose prose-sm max-w-none [&_p]:my-2 [&_a]:text-secondary [&_a]:font-medium [&_a]:underline"
              >
                <ReactMarkdown
                  components={{
                    a: ({ href, children, ...props }) => {
                      const isInternal = !!href && href.startsWith('/')
                      return (
                        <a
                          href={href}
                          onClick={(e) => {
                            if (isInternal) {
                              e.preventDefault()
                              navigate(href!)
                            }
                          }}
                          target={isInternal ? undefined : '_blank'}
                          rel={isInternal ? undefined : 'noopener noreferrer'}
                          {...props}
                        >
                          {children}
                        </a>
                      )
                    },
                  }}
                >
                  {rachelAnswer}
                </ReactMarkdown>
              </div>
              <div
                className={`pointer-events-none absolute inset-x-0 bottom-0 h-24 rounded-b-xl transition-opacity duration-500 ease-out ${answerAtBottom || !answerScrollable ? 'opacity-0' : 'opacity-100'}`}
                style={{
                  backdropFilter: 'blur(3px)',
                  WebkitBackdropFilter: 'blur(3px)',
                  maskImage: 'linear-gradient(to top, black 0%, black 30%, transparent 100%)',
                  WebkitMaskImage: 'linear-gradient(to top, black 0%, black 30%, transparent 100%)',
                  background: 'linear-gradient(to top, hsl(var(--background)) 0%, hsl(var(--background) / 0.6) 55%, transparent 100%)',
                }}
              />
            </div>
          )}

        </section>

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
