const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

const EXT_BY_TYPE: Record<string, string> = {
  'audio/webm': 'webm',
  'audio/mp4': 'mp4',
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/ogg': 'ogg',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'AI is not configured.' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File) || file.size < 1024) {
      return new Response(JSON.stringify({ error: 'That recording was empty — please try again.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (file.size > 20 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: 'Recording is too long. Keep it under a couple of minutes.' }), {
        status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const baseType = (file.type || 'audio/webm').split(';')[0];
    const ext = EXT_BY_TYPE[baseType] ?? 'webm';

    const upstream = new FormData();
    upstream.append('model', 'openai/gpt-4o-mini-transcribe');
    upstream.append('file', file, `recording.${ext}`);

    const res = await fetch('https://ai.gateway.lovable.dev/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}` },
      body: upstream,
    });

    const text = await res.text();
    if (!res.ok) {
      console.error('transcription failed', res.status, text);
      return new Response(JSON.stringify({ error: text || 'Transcription failed.' }), {
        status: res.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let transcript = '';
    try { transcript = JSON.parse(text)?.text ?? ''; } catch { transcript = text; }

    return new Response(JSON.stringify({ text: transcript }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('transcribe-audio error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message || 'Transcription failed' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
