// deno-lint-ignore-file no-explicit-any
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  try {
    const url = new URL(req.url)
    const q = url.searchParams.get('q') || ''
    const limit = url.searchParams.get('limit') || '24'
    const apiKey = Deno.env.get('GIPHY_API_KEY')
    if (!apiKey) return new Response(JSON.stringify({ error: 'Missing GIPHY_API_KEY' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    const endpoint = q.trim()
      ? `https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${encodeURIComponent(q)}&limit=${limit}&rating=pg-13`
      : `https://api.giphy.com/v1/gifs/trending?api_key=${apiKey}&limit=${limit}&rating=pg-13`
    const res = await fetch(endpoint)
    const json: any = await res.json()
    const items = (json.data || []).map((g: any) => ({
      id: g.id,
      title: g.title,
      url: g.images?.fixed_height?.url || g.images?.original?.url,
      preview: g.images?.fixed_height_small?.url || g.images?.fixed_height?.url,
    }))
    return new Response(JSON.stringify({ items }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
