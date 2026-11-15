// Markus AI skills. Each one starts a new chat with a guided request.
// The live list is stored in the database and managed by the owner; this copy is the fallback if it cannot load.
export type MarkusSkill = { id: string; title: string; body: string; prompt: string }

export const MARKUS_SKILLS: MarkusSkill[] = [
  { id: 'ask-markus', title: 'Ask Markus anything', body: 'Get answers from his videos, coaching calls and lessons.', prompt: 'I have a question about protecting my family wealth. Answer it the way Markus teaches it in his videos, coaching calls and lessons, and tell me which video or lesson it comes from when you can. My question is: ' },
  { id: 'asset-map', title: 'Map my assets', body: 'List what you own and where it sits, step by step.', prompt: 'Help me map every asset my family owns. Ask me one question at a time, then give me a clear list grouped by type and how each one is titled.' },
  { id: 'exposure-check', title: 'Find what is exposed', body: 'Spot assets open to lawsuits, probate and estate taxes.', prompt: 'Run an exposure check on my family wealth. Ask me what you need, then show which assets are open to lawsuits, probate or estate taxes and what to look at first.' },
  { id: 'trust-explainer', title: 'Explain trusts simply', body: 'Revocable, irrevocable and private trusts in plain English.', prompt: 'Explain the main types of trusts in plain English, how they differ, and which questions I should ask to know what fits my family.' },
  { id: 'document-review', title: 'Review a document', body: 'Paste a policy, deed or statement and get the key points.', prompt: 'I want you to review a document for me. Tell me what to paste, then explain the key points, what is missing, and what questions I should ask.' },
  { id: 'family-meeting', title: 'Plan a family meeting', body: 'An agenda to talk about the plan with your family.', prompt: 'Help me plan a family meeting about our wealth and legacy. Give me a simple agenda, talking points, and how to bring the next generation in.' },
  { id: 'heir-ready', title: 'Get my heirs ready', body: 'What your family needs to know if something happened tomorrow.', prompt: 'If something happened to me tomorrow, what would my family need to know and where would they find it? Help me build that checklist.' },
  { id: 'business-succession', title: 'Protect my business', body: 'Keep your business running and in the family.', prompt: 'Help me think through protecting my business and passing it down. Ask me about it, then outline the main risks and next steps.' },
  { id: 'tax-questions', title: 'Prep for my CPA or attorney', body: 'The right questions to bring to your advisors.', prompt: 'Help me prepare for a meeting with my CPA or estate attorney. Ask what the meeting is about, then give me a short list of the best questions to bring.' },
  { id: 'trust-fit', title: 'Is a trust right for me?', body: 'See which kind of trust fits your family and why.', prompt: 'Help me figure out if a trust makes sense for my family. Ask me a few questions about what we own and our goals, then explain which kind of trust Markus would point me toward and why.' },
  { id: 'lawsuit-protection', title: 'Protect assets from lawsuits', body: 'How Markus keeps family wealth out of reach of lawsuits.', prompt: 'Teach me how Markus protects family assets from lawsuits and creditors. Ask what I own, then walk me through the steps he teaches in plain English.' },
  { id: 'llc-setup', title: 'Set up my LLCs the right way', body: 'Holding companies, series LLCs and operating agreements.', prompt: 'Explain how Markus teaches families to use LLCs, holding companies, series LLCs and operating agreements. Ask about my businesses and properties, then show me a simple structure to talk through with my attorney.' },
  { id: 'real-estate', title: 'Protect my real estate', body: 'How to hold your home and rental properties.', prompt: 'Help me protect my real estate. Ask what properties I own and how they are titled today, then explain how Markus teaches families to hold a home and rental properties.' },
  { id: 'family-office', title: 'Build my family office', body: 'Run your family wealth like a business.', prompt: 'Help me build a simple family office the way Markus teaches it. Ask about my family, then give me the roles, meetings and systems to start with.' },
  { id: 'next-generation', title: 'Teach my kids about wealth', body: 'Raise heirs who keep and grow what you build.', prompt: 'Help me teach my children about money, trusts and our family legacy the way Markus teaches it. Ask their ages, then give me a simple plan for each one.' },
  { id: 'common-mistakes', title: 'Avoid common mistakes', body: 'The planning mistakes Markus sees families make most.', prompt: 'What are the biggest estate planning and asset protection mistakes Markus sees families make? Ask a little about my situation, then tell me which ones I should watch out for.' },
  { id: 'call-recap', title: 'Top coaching call questions', body: 'How Markus answers the questions families ask most.', prompt: 'What are the most common questions families ask Markus on his coaching calls, and how does he answer them? Give me the top ones in plain English.' },
]

export function findSkill(id?: string | null, list: MarkusSkill[] = MARKUS_SKILLS): MarkusSkill | undefined {
  return id ? list.find((s) => s.id === id) : undefined
}

// Turns a skill title into a short, unique link name.
export function skillSlug(title: string, taken: string[] = []): string {
  const base = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'skill'
  let slug = base
  for (let i = 2; taken.includes(slug); i++) slug = `${base}-${i}`
  return slug
}

// Inherited skills come from Markus and are read-only for members; personal skills belong to one member.
export function splitSkills<T extends { ownerUserId: string | null }>(skills: T[], userId?: string | null): { inherited: T[]; mine: T[] } {
  return {
    inherited: skills.filter((s) => s.ownerUserId === null),
    mine: userId ? skills.filter((s) => s.ownerUserId === userId) : [],
  }
}

export function canEditSkill(skill: { ownerUserId: string | null }, userId?: string | null, isOwner = false): boolean {
  if (skill.ownerUserId === null) return isOwner
  return !!userId && skill.ownerUserId === userId
}
