import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function parseYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/)
  return m ? m[1] : null
}

function parseVimeoId(url: string): string | null {
  const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/)
  return m ? m[1] : null
}

function parseLoomId(url: string): string | null {
  const m = url.match(/loom\.com\/(?:share|embed)\/([a-f0-9]+)/i)
  return m ? m[1] : null
}

async function getYouTubeDuration(videoId: string): Promise<number | null> {
  try {
    const res = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
    })
    const html = await res.text()
    const m = html.match(/"lengthSeconds":"(\d+)"/) || html.match(/"lengthSeconds":(\d+)/)
    return m ? parseInt(m[1], 10) : null
  } catch {
    return null
  }
}

async function getVimeoDuration(videoId: string): Promise<number | null> {
  try {
    const res = await fetch(`https://vimeo.com/api/oembed.json?url=https://vimeo.com/${videoId}`)
    if (!res.ok) return null
    const data = await res.json()
    return typeof data.duration === 'number' ? Math.round(data.duration) : null
  } catch {
    return null
  }
}

async function getLoomDuration(videoId: string): Promise<number | null> {
  try {
    const res = await fetch(`https://www.loom.com/share/${videoId}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
    })
    const html = await res.text()
    // Loom embeds duration (seconds, sometimes float) in its hydration JSON
    const m =
      html.match(/"duration"\s*:\s*(\d+(?:\.\d+)?)/) ||
      html.match(/"videoDuration"\s*:\s*(\d+(?:\.\d+)?)/)
    return m ? Math.round(parseFloat(m[1])) : null
  } catch {
    return null
  }
}

async function getDuration(url: string): Promise<number | null> {
  const yt = parseYouTubeId(url)
  if (yt) return getYouTubeDuration(yt)
  const vm = parseVimeoId(url)
  if (vm) return getVimeoDuration(vm)
  const lm = parseLoomId(url)
  if (lm) return getLoomDuration(lm)
  return null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: videos, error } = await supabase
      .from('course_videos')
      .select('id, video_url')
      .is('duration_seconds', null)
      .not('video_url', 'is', null)

    if (error) throw error

    let updated = 0
    let failed = 0
    for (const v of videos ?? []) {
      if (!v.video_url) continue
      const seconds = await getDuration(v.video_url)
      if (seconds && seconds > 0) {
        const { error: upErr } = await supabase
          .from('course_videos')
          .update({ duration_seconds: seconds })
          .eq('id', v.id)
        if (upErr) failed++
        else updated++
      } else {
        failed++
      }
    }

    return new Response(
      JSON.stringify({ success: true, scanned: videos?.length ?? 0, updated, failed }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
