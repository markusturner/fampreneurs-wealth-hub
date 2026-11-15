import { useEffect, useRef, useState } from 'react'
import { Play, Pause, Volume2, VolumeX, Maximize } from 'lucide-react'

export function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const s = Math.floor(seconds)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = String(s % 60).padStart(2, '0')
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`
}

type Props = { src: string; poster: string; fallbackDuration?: number; title?: string }

export function VslPlayer({ src, poster, fallbackDuration = 0, title = 'Video' }: Props) {
  const ref = useRef<HTMLVideoElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [started, setStarted] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(false)
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(fallbackDuration)

  useEffect(() => {
    const v = ref.current
    if (!v) return
    const onTime = () => setTime(v.currentTime)
    const onMeta = () => { if (Number.isFinite(v.duration) && v.duration > 0) setDuration(v.duration) }
    const onPlay = () => { setPlaying(true); setStarted(true) }
    const onPause = () => setPlaying(false)
    v.addEventListener('timeupdate', onTime)
    v.addEventListener('loadedmetadata', onMeta)
    v.addEventListener('durationchange', onMeta)
    v.addEventListener('play', onPlay)
    v.addEventListener('pause', onPause)
    v.addEventListener('ended', onPause)
    return () => {
      v.removeEventListener('timeupdate', onTime)
      v.removeEventListener('loadedmetadata', onMeta)
      v.removeEventListener('durationchange', onMeta)
      v.removeEventListener('play', onPlay)
      v.removeEventListener('pause', onPause)
      v.removeEventListener('ended', onPause)
    }
  }, [])

  const toggle = () => {
    const v = ref.current
    if (!v) return
    setStarted(true)
    if (v.paused) void v.play().catch(() => setPlaying(false))
    else v.pause()
  }
  const seek = (value: number) => {
    const v = ref.current
    if (!v) return
    v.currentTime = value
    setTime(value)
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

  const pct = duration > 0 ? (time / duration) * 100 : 0

  return (
    <div ref={wrapRef} className="group relative h-full w-full bg-background">
      <video
        ref={ref}
        src={src}
        poster={poster}
        playsInline
        preload="metadata"
        onClick={toggle}
        className="h-full w-full cursor-pointer object-cover"
        aria-label={title}
      />

      {!started && (
        <button type="button" onClick={toggle} aria-label={`Play ${title}`} className="absolute inset-0 flex items-center justify-center">
          <img src={poster} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <span className="absolute inset-0 bg-background/20 transition group-hover:bg-background/10" />
          <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-secondary text-secondary-foreground shadow-2xl shadow-secondary/40 ring-4 ring-secondary/30 transition group-hover:scale-105 sm:h-20 sm:w-20">
            <Play className="ml-1 h-7 w-7 fill-current sm:h-9 sm:w-9" />
          </span>
          {duration > 0 && (
            <span className="absolute bottom-3 right-3 rounded-md bg-background/80 px-2 py-1 font-mono text-xs font-semibold text-foreground backdrop-blur">{formatTime(duration)}</span>
          )}
        </button>
      )}

      {started && (
        <div className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/90 to-transparent px-3 pb-2 pt-8 transition-opacity ${playing ? 'opacity-0 group-hover:opacity-100 focus-within:opacity-100' : 'opacity-100'}`}>
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={time}
            onChange={(e) => seek(Number(e.target.value))}
            aria-label="Seek"
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full accent-[hsl(var(--secondary))]"
            style={{ background: `linear-gradient(to right, hsl(var(--secondary)) ${pct}%, hsl(var(--foreground) / 0.25) ${pct}%)` }}
          />
          <div className="mt-1.5 flex items-center gap-3 text-foreground">
            <button type="button" onClick={toggle} aria-label={playing ? 'Pause' : 'Play'} className="hover:text-secondary">
              {playing ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current" />}
            </button>
            <button type="button" onClick={toggleMute} aria-label={muted ? 'Unmute' : 'Mute'} className="hover:text-secondary">
              {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </button>
            <span className="font-mono text-xs font-semibold tabular-nums">{formatTime(time)} / {formatTime(duration)}</span>
            <button type="button" onClick={fullscreen} aria-label="Full screen" className="ml-auto hover:text-secondary">
              <Maximize className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
