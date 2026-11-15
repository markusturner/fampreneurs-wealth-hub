// Markus saves short facts from chats as memories, like ChatGPT and Claude do.
export const MEMORY_LIMIT = 200;
export const MEMORY_MAX_CHARS = 300;

export type MemoryUpdate = { add: string[]; forget: string[] };

export const MEMORY_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['add', 'forget'],
  properties: {
    add: { type: 'array', items: { type: 'string' } },
    forget: { type: 'array', items: { type: 'string' } },
  },
} as const;

export function memoryInstructions(existing: { id: string; content: string }[]): string {
  return `You decide what Markus AI should remember about a member for future chats.\nRead the member's latest message. Add a memory only for lasting facts about them: family members, assets, businesses, properties, goals, worries, preferences, or anything they ask you to remember. Write each one as a short sentence in plain English, starting with the fact (example: "Has two kids, Maya (16) and Jordan (12)."). Skip questions, small talk, passing details and anything already saved. Never save passwords, Social Security numbers, account numbers or card numbers. Add at most 2.\nIf the member asks you to forget something, or a saved memory is now wrong, put that memory's id in forget.\nSaved memories:\n${existing.length ? existing.map((m) => `${m.id}: ${m.content}`).join('\n') : 'None yet.'}`;
}

const SENSITIVE = /\b\d{3}-?\d{2}-?\d{4}\b|\b(?:\d[ -]?){13,19}\b|password/i;

// Cleans the model's answer so only safe, new, short memories are saved.
export function cleanMemoryUpdate(raw: unknown, existing: { id: string; content: string }[]): MemoryUpdate {
  const value = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const known = new Set(existing.map((m) => m.content.trim().toLowerCase()));
  const ids = new Set(existing.map((m) => m.id));
  const add = (Array.isArray(value.add) ? value.add : [])
    .filter((t): t is string => typeof t === 'string')
    .map((t) => t.replace(/\s+/g, ' ').replace(/\u2014/g, '-').trim().slice(0, MEMORY_MAX_CHARS))
    .filter((t) => t.length >= 3 && !SENSITIVE.test(t) && !known.has(t.toLowerCase()))
    .slice(0, 2);
  const forget = (Array.isArray(value.forget) ? value.forget : []).filter((id): id is string => typeof id === 'string' && ids.has(id));
  return { add: [...new Set(add)], forget: [...new Set(forget)] };
}
