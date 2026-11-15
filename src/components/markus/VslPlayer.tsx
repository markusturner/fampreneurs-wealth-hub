import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { Play, Pause, Volume2, VolumeX, Maximize } from 'lucide-react'

export function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const s = Math.floor(seconds)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = String(s % 60).padStart(2, '0')
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`
}

export type VslChapter = { t: number; title: string }

/** Seconds of the muted preview loop shown before the visitor clicks play. */
export const PREVIEW_LOOP_SECONDS = 5

type Props = {
  src: string
  poster: string
  fallbackDuration?: number
  title?: string
  chapters?: VslChapter[]
}

export function currentChapter(chapters: VslChapter[], time: number) {
  let found: VslChapter | undefined
  for (const c of chapters) if (time >= c.t) found = c
  return found
}

export function VslPlayer({ src, poster, fallbackDuration = 0, title = 'Video', chapters = [] }: Props) {
  const ref = useRef<HTMLVideoElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const startedRef = useRef(false)
  const [started, setStarted] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(true)
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(fallbackDuration)
  const [hoverChapter, setHoverChapter] = useState<number | null>(null)
  const [frameReady, setFrameReady] = useState(false)

  useEffect(() => {
    const v = ref.current
    if (!v) return
    const onTime = () => {
      if (!startedRef.current) {
        if (v.currentTime >= PREVIEW_LOOP_SECONDS) v.currentTime = 0
        return
      }
      setTime(v.currentTime)
    }
    const onMeta = () => { if (Number.isFinite(v.duration) && v.duration > 0) setDuration(v.duration) }
    const onPlay = () => setPlaying(true)
    const onPlaying = () => setFrameReady(true)
    v.addEventListener('playing', onPlaying)
    const onPause = () => setPlaying(false)
    v.addEventListener('timeupdate', onTime)
    v.addEventListener('loadedmetadata', onMeta)
    v.addEventListener('durationchange', onMeta)
    v.addEventListener('play', onPlay)
    v.addEventListener('pause', onPause)
    v.addEventListener('ended', onPause)
    // Muted preview autoplay loop
    v.muted = true
    void v.play().catch(() => undefined)
    return () => {
      v.removeEventListener('playing', onPlaying)
      v.removeEventListener('timeupdate', onTime)
      v.removeEventListener('loadedmetadata', onMeta)
      v.removeEventListener('durationchange', onMeta)
      v.removeEventListener('play', onPlay)
      v.removeEventListener('pause', onPause)
      v.removeEventListener('ended', onPause)
    }
  }, [])

  const startWithSound = () => {
    const v = ref.current
    if (!v) return
    startedRef.current = true
    setStarted(true)
    v.currentTime = 0
    v.muted = false
    setMuted(false)
    setTime(0)
    void v.play().catch(() => setPlaying(false))
  }

  const toggle = () => {
    const v = ref.current
    if (!v) return
    if (!startedRef.current) { startWithSound(); return }
    if (v.paused) void v.play().catch(() => setPlaying(false))
    else v.pause()
  }
  const seek = (value: number) => {
    const v = ref.current
    if (!v) return
    const next = Math.max(0, Math.min(duration || value, value))
    v.currentTime = next
    setTime(next)
  }
  const seekFromPointer = (clientX: number) => {
    const el = trackRef.current
    if (!el || !duration) return
    const rect = el.getBoundingClientRect()
    seek(((clientX - rect.left) / rect.width) * duration)
  }
  const onTrackDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    seekFromPointer(e.clientX)
  }
  const onTrackMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) seekFromPointer(e.clientX)
  }
  const toggleMute = () => {
    const v = ref.current
    if (!v) return
    v.muted = !v.muted
    setMuted(v.muted)
  }
  const fullscreen = () => {
    const el = wrapRef.current as (HTMLDivElement & { webkitRequestFullscreen?: () => void }) | null
    const v = ref.current as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null
    if (document.fullscreenElement) { void document.exitFullscreen(); return }
    if (el?.requestFullscreen) void el.requestFullscreen()
    else if (v?.webkitEnterFullscreen) v.webkitEnterFullscreen()
  }

  const pct = duration > 0 ? Math.min(100, (time / duration) * 100) : 0
  const active = currentChapter(chapters, time)

  return (
    <div ref={wrapRef} className="group relative h-full w-full overflow-hidden bg-background">
      <video
        ref={ref}
        src={src}
        poster={poster}
        playsInline
        muted
        autoPlay
        preload="auto"
        onClick={toggle}
        className="h-full w-full cursor-pointer object-cover"
        aria-label={title}
      />

      {!frameReady && (
        <img src={poster} alt="" className="pointer-events-none absolute inset-0 h-full w-full object-cover" />
      )}

      {!started && (
        <button
          type="button"
          onClick={startWithSound}
          aria-label={`Watch ${title} with sound`}
          className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/45 transition hover:bg-background/35"
        >
          <span className="absolute left-3 top-3 flex items-center gap-2 rounded-lg bg-background/70 px-3 py-1.5 text-sm font-medium text-foreground backdrop-blur sm:left-5 sm:top-5">
            <Play className="h-3.5 w-3.5 fill-current" /> Watch first
          </span>
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-foreground text-background shadow-2xl transition group-hover:scale-105 sm:h-24 sm:w-24">
            <Play className="ml-1 h-7 w-7 fill-current sm:h-10 sm:w-10" />
          </span>
          <span className="text-base font-medium text-foreground drop-shadow sm:text-lg">Watch with sound</span>
        </button>
      )}

      {started && (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/95 via-background/70 to-transparent px-3 pb-2.5 pt-10">
          <div className="flex items-center gap-3 text-foreground">
            <button type="button" onClick={toggle} aria-label={playing ? 'Pause' : 'Play'} className="shrink-0 hover:text-secondary">
              {playing ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current" />}
            </button>
            <span className="shrink-0 font-mono text-xs font-semibold tabular-nums sm:text-sm">{formatTime(time)} / {formatTime(duration)}</span>

            <div
              ref={trackRef}
              onPointerDown={onTrackDown}
              onPointerMove={onTrackMove}
              role="slider"
              aria-label="Seek"
              aria-valuemin={0}
              aria-valuemax={Math.round(duration)}
              aria-valuenow={Math.round(time)}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'ArrowRight') seek(time + 5)
                if (e.key === 'ArrowLeft') seek(time - 5)
              }}
              className="relative flex h-6 min-w-0 flex-1 cursor-pointer touch-none items-center"
            >
              <div className="h-1 w-full rounded-full bg-foreground/30" />
              <div className="absolute left-0 h-1 rounded-full bg-secondary" style={{ width: `${pct}%` }} />
              {duration > 0 && chapters.map((c, i) => (
                <button
                  key={c.t}
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); seek(c.t) }}
                  onMouseEnter={() => setHoverChapter(i)}
                  onMouseLeave={() => setHoverChapter(null)}
                  onFocus={() => setHoverChapter(i)}
                  onBlur={() => setHoverChapter(null)}
                  aria-label={`Skip to ${c.title} at ${formatTime(c.t)}`}
                  className={`absolute h-3 w-3 -translate-x-1/2 rounded-full border-2 border-foreground transition hover:scale-125 ${time >= c.t ? 'bg-secondary' : 'bg-background'}`}
                  style={{ left: `${(c.t / duration) * 100}%` }}
                >
                  {hoverChapter === i && (
                    <span className={`pointer-events-none absolute bottom-5 whitespace-nowrap rounded-md bg-background/95 px-2 py-1 text-xs font-medium text-foreground shadow-lg ${i === 0 ? 'left-0' : i === chapters.length - 1 ? 'right-0' : 'left-1/2 -translate-x-1/2'}`}>
                      {formatTime(c.t)} · {c.title}
                    </span>
                  )}
                </button>
              ))}
              <span className="pointer-events-none absolute h-3.5 w-3.5 -translate-x-1/2 rounded-full bg-foreground shadow" style={{ left: `${pct}%` }} />
            </div>

            <button type="button" onClick={toggleMute} aria-label={muted ? 'Unmute' : 'Mute'} className="shrink-0 hover:text-secondary">
              {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </button>
            <button type="button" onClick={fullscreen} aria-label="Full screen" className="shrink-0 hover:text-secondary">
              <Maximize className="h-5 w-5" />
            </button>
          </div>
          {active && (
            <p className="mt-1 truncate pl-8 text-xs font-medium text-foreground/80">{active.title}</p>
          )}
        </div>
      )}
    </div>
  )
}
