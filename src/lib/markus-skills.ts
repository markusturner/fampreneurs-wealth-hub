// Ready-made Markus AI skills. Each one starts a new chat with a guided request.
export type MarkusSkill = { id: string; title: string; body: string; prompt: string }

export const MARKUS_SKILLS: MarkusSkill[] = [
  { id: 'asset-map', title: 'Map my assets', body: 'List what you own and where it sits, step by step.', prompt: 'Help me map every asset my family owns. Ask me one question at a time, then give me a clear list grouped by type and how each one is titled.' },
  { id: 'exposure-check', title: 'Find what is exposed', body: 'Spot assets open to lawsuits, probate and estate taxes.', prompt: 'Run an exposure check on my family wealth. Ask me what you need, then show which assets are open to lawsuits, probate or estate taxes and what to look at first.' },
  { id: 'trust-explainer', title: 'Explain trusts simply', body: 'Revocable, irrevocable and private trusts in plain English.', prompt: 'Explain the main types of trusts in plain English, how they differ, and which questions I should ask to know what fits my family.' },
  { id: 'document-review', title: 'Review a document', body: 'Paste a policy, deed or statement and get the key points.', prompt: 'I want you to review a document for me. Tell me what to paste, then explain the key points, what is missing, and what questions I should ask.' },
  { id: 'family-meeting', title: 'Plan a family meeting', body: 'An agenda to talk about the plan with your family.', prompt: 'Help me plan a family meeting about our wealth and legacy. Give me a simple agenda, talking points, and how to bring the next generation in.' },
  { id: 'heir-ready', title: 'Get my heirs ready', body: 'What your family needs to know if something happened tomorrow.', prompt: 'If something happened to me tomorrow, what would my family need to know and where would they find it? Help me build that checklist.' },
  { id: 'business-succession', title: 'Protect my business', body: 'Keep your business running and in the family.', prompt: 'Help me think through protecting my business and passing it down. Ask me about it, then outline the main risks and next steps.' },
  { id: 'tax-questions', title: 'Prep for my CPA or attorney', body: 'The right questions to bring to your advisors.', prompt: 'Help me prepare for a meeting with my CPA or estate attorney. Ask what the meeting is about, then give me a short list of the best questions to bring.' },
]

export function findSkill(id?: string | null): MarkusSkill | undefined {
  return id ? MARKUS_SKILLS.find((s) => s.id === id) : undefined
}
