// Uploads the Family Protection Plan as a Google Doc using the Lovable connector gateway.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const GOOGLE_DRIVE_API_KEY = Deno.env.get('GOOGLE_DRIVE_API_KEY');

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    if (!LOVABLE_API_KEY || !GOOGLE_DRIVE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Google Drive is not connected to this project.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { content, fileName } = await req.json();
    if (!content) {
      return new Response(JSON.stringify({ error: 'Missing content' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const name = fileName || `Family Protection Plan - ${new Date().toISOString().slice(0, 10)}`;

    // Multipart upload: metadata + plain-text body, converted to a Google Doc.
    const boundary = '----lovable-' + crypto.randomUUID();
    const metadata = {
      name,
      mimeType: 'application/vnd.google-apps.document',
    };
    const body =
      `--${boundary}\r\n` +
      `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
      `${JSON.stringify(metadata)}\r\n` +
      `--${boundary}\r\n` +
      `Content-Type: text/plain; charset=UTF-8\r\n\r\n` +
      `${content}\r\n` +
      `--${boundary}--`;

    const resp = await fetch(
      'https://connector-gateway.lovable.dev/google_drive/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'X-Connection-Api-Key': GOOGLE_DRIVE_API_KEY,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body,
      }
    );

    const text = await resp.text();
    if (!resp.ok) {
      console.error('Drive upload failed', resp.status, text);
      return new Response(JSON.stringify({ error: `Drive error ${resp.status}: ${text}` }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    const data = JSON.parse(text);
    return new Response(JSON.stringify({ id: data.id, link: data.webViewLink }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
