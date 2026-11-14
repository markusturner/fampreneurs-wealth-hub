// GoHighLevel contact helpers (Private Integration token)
const GHL_URL = "https://services.leadconnectorhq.com";

export async function ghlUpsertContact(input: {
  firstName: string; lastName: string; email: string; phone?: string; tags: string[];
}): Promise<{ id?: string; error?: string }> {
  const token = Deno.env.get("GHL_PRIVATE_TOKEN");
  const locationId = Deno.env.get("GHL_LOCATION_ID");
  if (!token || !locationId) return { error: "GoHighLevel is not configured" };
  const res = await fetch(`${GHL_URL}/contacts/upsert`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, Version: "2021-07-28", "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ locationId, firstName: input.firstName, lastName: input.lastName, email: input.email, phone: input.phone, tags: input.tags, source: "Markus AI landing page" }),
  });
  const text = await res.text();
  if (!res.ok) return { error: `[${res.status}] ${text.slice(0, 400)}` };
  try { return { id: JSON.parse(text)?.contact?.id }; } catch { return {}; }
}

export async function ghlAddTags(contactId: string, tags: string[]) {
  const token = Deno.env.get("GHL_PRIVATE_TOKEN");
  if (!token) return;
  const res = await fetch(`${GHL_URL}/contacts/${contactId}/tags`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, Version: "2021-07-28", "Content-Type": "application/json" },
    body: JSON.stringify({ tags }),
  });
  if (!res.ok) console.error("GHL add tags failed", res.status, await res.text());
}

export async function ghlAddNote(contactId: string, body: string) {
  const token = Deno.env.get("GHL_PRIVATE_TOKEN");
  if (!token) return;
  const res = await fetch(`${GHL_URL}/contacts/${contactId}/notes`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, Version: "2021-07-28", "Content-Type": "application/json" },
    body: JSON.stringify({ body }),
  });
  if (!res.ok) console.error("GHL add note failed", res.status, await res.text());
}
