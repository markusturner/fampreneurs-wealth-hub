const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InFile {
  name: string;
  mime: string;
  data: string; // base64 (no data: prefix)
}

const SYSTEM = `You read uploaded client files (screenshots of texts/emails, scanned letters, invoices, statements, PDFs, spreadsheets).
Transcribe and summarize the useful facts for a client-retention record.
Output plain text only. No markdown headers, no emojis, no em dashes.
For each file, write: the file name, then a short factual summary, then any exact quotes, names, dollar amounts, dates, balances, payment status, or commitments found.
If a file is unreadable, say so plainly.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) return json({ error: "Missing LOVABLE_API_KEY" }, 500);

    const { files } = (await req.json()) as { files: InFile[] };
    if (!Array.isArray(files) || files.length === 0) return json({ error: "files required" }, 400);

    const content: any[] = [
      { type: "text", text: `Read these ${files.length} file(s) and extract everything relevant.` },
    ];
    const skipped: string[] = [];

    for (const f of files.slice(0, 6)) {
      const mime = (f.mime || "").toLowerCase();
      if (mime.startsWith("image/")) {
        content.push({ type: "text", text: `File: ${f.name}` });
        content.push({ type: "image_url", image_url: { url: `data:${mime};base64,${f.data}` } });
      } else if (mime === "application/pdf") {
        content.push({ type: "text", text: `File: ${f.name}` });
        content.push({ type: "file", file: { filename: f.name, file_data: `data:application/pdf;base64,${f.data}` } });
      } else {
        skipped.push(f.name);
      }
    }

    if (content.length === 1) return json({ text: "", skipped });

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Lovable-API-Key": key,
        "Content-Type": "application/json",
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content },
        ],
        temperature: 0.1,
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      return json({ error: `AI gateway ${resp.status}: ${text}` }, resp.status);
    }

    const data = await resp.json();
    const text = String(data?.choices?.[0]?.message?.content ?? "").trim();
    return json({ text, skipped });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
