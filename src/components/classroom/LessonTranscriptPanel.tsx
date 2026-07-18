import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Loader2, Languages, Sparkles } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface Segment { start: number; end: number; text: string }
interface TranscriptRow {
  language: string
  is_source: boolean
  segments: Segment[]
  full_text: string | null
  status: string
  error: string | null
}

const LANGUAGES: { code: string; label: string }[] = [
  { code: 'English', label: 'English' },
  { code: 'Spanish', label: 'Spanish (Español)' },
  { code: 'French', label: 'French (Français)' },
  { code: 'Portuguese', label: 'Portuguese (Português)' },
  { code: 'German', label: 'German (Deutsch)' },
  { code: 'Italian', label: 'Italian (Italiano)' },
  { code: 'Chinese (Simplified)', label: '简体中文' },
  { code: 'Japanese', label: '日本語' },
  { code: 'Korean', label: '한국어' },
  { code: 'Arabic', label: 'العربية' },
  { code: 'Hindi', label: 'हिन्दी' },
  { code: 'Russian', label: 'Русский' },
  { code: 'Vietnamese', label: 'Tiếng Việt' },
  { code: 'Tagalog', label: 'Tagalog' },
  { code: 'Swahili', label: 'Kiswahili' },
  { code: 'Turkish', label: 'Türkçe' },
  { code: 'Dutch', label: 'Nederlands' },
  { code: 'Polish', label: 'Polski' },
]

interface Props {
  lessonId: string
  videoUrl: string | null
  /** Optional: element for direct <video>. When present, we sync a subtitle overlay + click-to-seek. */
  videoRef?: React.RefObject<HTMLVideoElement | null>
  isAdminOrOwner?: boolean
}

function isDirectMedia(url: string | null): boolean {
  if (!url) return false
  return /\.(mp4|m4a|mp3|wav|webm|ogg|mov|aac|flac)(\?|$)/i.test(url)
}

export function LessonTranscriptPanel({ lessonId, videoUrl, videoRef, isAdminOrOwner }: Props) {
  const { toast } = useToast()
  const [source, setSource] = useState<TranscriptRow | null>(null)
  const [translated, setTranslated] = useState<TranscriptRow | null>(null)
  const [language, setLanguage] = useState<string>('__source')
  const [busy, setBusy] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const activeSegRef = useRef<HTMLDivElement | null>(null)

  const canTranscribe = isDirectMedia(videoUrl)

  const loadSource = async () => {
    const { data } = await supabase
      .from('lesson_transcripts')
      .select('*')
      .eq('lesson_id', lessonId)
      .eq('is_source', true)
      .maybeSingle()
    setSource(data as any)
    return data as any
  }

  const loadLanguage = async (lang: string) => {
    if (lang === '__source') { setTranslated(null); return }
    const { data } = await supabase
      .from('lesson_transcripts')
      .select('*')
      .eq('lesson_id', lessonId)
      .eq('language', lang)
      .maybeSingle()
    setTranslated(data as any)
  }

  useEffect(() => {
    setSource(null); setTranslated(null); setLanguage('__source')
    loadSource().then((s) => {
      // Auto-kick transcription for direct videos with no transcript yet
      if (!s && canTranscribe) triggerTranscribe()
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId])

  // Track video time for subtitle sync
  useEffect(() => {
    const el = videoRef?.current
    if (!el) return
    const onTime = () => setCurrentTime(el.currentTime)
    el.addEventListener('timeupdate', onTime)
    return () => el.removeEventListener('timeupdate', onTime)
  }, [videoRef, lessonId])

  const triggerTranscribe = async () => {
    if (!canTranscribe) return
    setBusy(true)
    try {
      const { data, error } = await supabase.functions.invoke('transcribe-lesson', {
        body: { lessonId },
      })
      if (error) throw error
      if (data?.transcript) setSource(data.transcript)
      if (data?.unsupported) toast({ title: 'Not supported', description: data.error, variant: 'destructive' })
    } catch (e: any) {
      toast({ title: 'Transcription failed', description: e.message, variant: 'destructive' })
    } finally { setBusy(false) }
  }

  const handleLanguageChange = async (lang: string) => {
    setLanguage(lang)
    await loadLanguage(lang)
    if (lang === '__source') return
    // Ensure translation exists
    const { data: existing } = await supabase
      .from('lesson_transcripts')
      .select('status')
      .eq('lesson_id', lessonId).eq('language', lang).maybeSingle()
    if (existing?.status === 'ready') return

    setBusy(true)
    try {
      const { data, error } = await supabase.functions.invoke('translate-lesson-transcript', {
        body: { lessonId, language: lang },
      })
      if (error) throw error
      if (data?.transcript) setTranslated(data.transcript)
    } catch (e: any) {
      toast({ title: 'Translation failed', description: e.message, variant: 'destructive' })
    } finally { setBusy(false) }
  }

  const active: TranscriptRow | null = language === '__source' ? source : translated
  const segments: Segment[] = active?.segments || []

  const activeIndex = useMemo(() => {
    if (!videoRef?.current || segments.length === 0) return -1
    return segments.findIndex(s => currentTime >= s.start && currentTime < s.end)
  }, [currentTime, segments, videoRef])

  useEffect(() => {
    if (activeIndex >= 0 && activeSegRef.current) {
      activeSegRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [activeIndex])

  const seekTo = (t: number) => {
    if (videoRef?.current) {
      videoRef.current.currentTime = t
      videoRef.current.play().catch(() => {})
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex flex-wrap items-center gap-3 p-4 border-b border-border">
        <Languages className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Transcript & Subtitles</span>
        <div className="ml-auto flex items-center gap-2">
          <Select value={language} onValueChange={handleLanguageChange} disabled={!source || source.status !== 'ready'}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Language" />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              <SelectItem value="__source">Original</SelectItem>
              {LANGUAGES.map(l => (
                <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isAdminOrOwner && canTranscribe && (
            <Button size="sm" variant="outline" onClick={triggerTranscribe} disabled={busy}>
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              <span className="ml-1">{source ? 'Re-transcribe' : 'Transcribe'}</span>
            </Button>
          )}
        </div>
      </div>

      <div className="p-4">
        {!canTranscribe ? (
          <p className="text-sm text-muted-foreground">
            Auto-transcription is available for direct video files (mp4, m4a, mp3, wav, webm).
            YouTube, Vimeo and Loom embeds are not supported — re-upload the raw file to enable transcripts.
          </p>
        ) : !source ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Preparing transcript…
          </div>
        ) : source.status === 'processing' ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Transcribing this video…
          </div>
        ) : source.status === 'error' ? (
          <p className="text-sm text-destructive">{source.error || 'Transcription failed.'}</p>
        ) : busy && language !== '__source' && (!translated || translated.status !== 'ready') ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Translating to {language}…
          </div>
        ) : segments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No transcript text available.</p>
        ) : (
          <div className="max-h-[420px] overflow-y-auto space-y-1.5 pr-2">
            {segments.map((s, i) => (
              <div
                key={i}
                ref={i === activeIndex ? activeSegRef : null}
                onClick={() => seekTo(s.start)}
                className={`text-sm rounded-md px-3 py-2 cursor-pointer transition-colors ${
                  i === activeIndex
                    ? 'bg-[#290a52] text-white'
                    : 'hover:bg-muted text-foreground'
                }`}
              >
                {s.text}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Subtitle overlay for direct video */}
      {videoRef?.current && activeIndex >= 0 && segments[activeIndex] && (
        <SubtitleOverlay videoEl={videoRef.current} text={segments[activeIndex].text} />
      )}
    </div>
  )
}

function SubtitleOverlay({ videoEl, text }: { videoEl: HTMLVideoElement; text: string }) {
  const [rect, setRect] = useState<DOMRect | null>(null)
  useEffect(() => {
    const update = () => setRect(videoEl.getBoundingClientRect())
    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    const id = window.setInterval(update, 500)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
      window.clearInterval(id)
    }
  }, [videoEl])
  if (!rect) return null
  return (
    <div
      style={{
        position: 'fixed',
        left: rect.left + rect.width / 2,
        top: rect.bottom - 56,
        transform: 'translateX(-50%)',
        maxWidth: rect.width - 32,
        pointerEvents: 'none',
        zIndex: 40,
      }}
      className="px-3 py-1.5 rounded-md bg-black/75 text-white text-sm text-center backdrop-blur-sm"
    >
      {text}
    </div>
  )
}
