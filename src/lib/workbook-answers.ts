// Shared, read-only grouping of a submitted Family Protection Workbook.
// Used by the on-screen view and the PDF download so both always match.

export type WorkbookAnswerMap = Record<string, unknown>

const SECTIONS: { title: string; fields: [string, string][] }[] = [
  { title: "About You", fields: [
    ["full_name", "Full name"], ["family_name", "Family name"], ["state", "State"],
    ["marital_status", "Marital status"], ["kids_count", "Number of children"], ["has_heirs", "Has heirs"],
    ["heirs_alternative_notes", "Heirs notes"], ["special_notes", "Special notes"],
  ] },
  { title: "Goals and Concerns", fields: [
    ["family_mission", "Family mission"], ["top_goals", "Top goals"], ["top_worry", "Biggest worry"],
    ["structure_priority", "Protection priorities"],
  ] },
  { title: "Trusted People", fields: [
    ["trusted_people", "Trusted people"], ["knows_roles", "Knows trust roles"], ["trustee_name", "Trustee"],
    ["successor_trustee", "Successor trustee"], ["trust_protector", "Trust protector"],
  ] },
  { title: "Assets Overview", fields: [
    ["net_worth_range", "Net worth range"], ["owns_home", "Owns a home"], ["owns_business", "Owns a business"],
    ["assets", "Assets owned"], ["asset_purposes", "Asset purposes"], ["growth_assets", "Has growth assets"],
    ["growth_assets_detail", "Growth assets"], ["foreign_assets", "Has foreign assets"], ["foreign_assets_detail", "Foreign assets"],
  ] },
  { title: "Existing Revocable Trust", fields: [
    ["has_revocable", "Has a revocable trust"], ["rev_name", "Trust name"], ["rev_date", "Year created"],
    ["rev_state", "State"], ["rev_trustee", "Trustee"], ["rev_attorney", "Drafted by"],
    ["rev_signed_copy", "Has signed copy"], ["rev_assets", "Assets in the trust"],
  ] },
  { title: "Asset Details", fields: [
    ["real_estate_details", "Real estate"], ["business_details", "Businesses"], ["bank_accounts", "Bank and investment accounts"],
    ["retirement_insurance", "Retirement and life insurance"], ["commodities", "Commodities"], ["commodities_detail", "Commodity details"],
    ["vehicles_valuables", "Vehicles and valuables"], ["debts", "Debts"],
  ] },
  { title: "Personal Records", fields: [["personal_records", "Records on hand"]] },
]

export const isEmptyAnswer = (v: unknown) => v == null || v === "" || (Array.isArray(v) && v.length === 0)

export const prettyAnswer = (s: string) => {
  const t = s.replace(/_/g, " ").trim()
  if (/^under \d/i.test(t)) return `Under $${t.split(" ")[1]}`
  return /^(yes|no|unsure|single|married|divorced|widowed)$/i.test(t) ? t.charAt(0).toUpperCase() + t.slice(1) : t
}

export const answerLabel = (key: string) => key.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase())

/** Plain text version of an answer, for PDFs. */
export function answerText(value: unknown): string {
  if (Array.isArray(value)) return value.map((v) => prettyAnswer(String(v))).join(", ")
  if (typeof value === "object" && value) {
    return Object.entries(value as WorkbookAnswerMap).map(([k, v]) => `${answerLabel(k)}: ${String(v)}`).join("\n")
  }
  return prettyAnswer(String(value))
}

/** Sections with only the answered fields, plus any unknown answered keys under "Other Answers". */
export function workbookSections(answers: WorkbookAnswerMap) {
  const known = new Set(SECTIONS.flatMap((s) => s.fields.map(([k]) => k)))
  const extra = Object.keys(answers).filter((k) => !known.has(k) && !isEmptyAnswer(answers[k]))
  return [
    ...SECTIONS,
    ...(extra.length ? [{ title: "Other Answers", fields: extra.map((k) => [k, answerLabel(k)] as [string, string]) }] : []),
  ]
    .map((s) => ({ ...s, fields: s.fields.filter(([k]) => !isEmptyAnswer(answers[k])) }))
    .filter((s) => s.fields.length > 0)
}
