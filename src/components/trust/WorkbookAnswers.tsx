import { Badge } from "@/components/ui/badge"

type Answers = Record<string, unknown>

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

const isEmpty = (v: unknown) => v == null || v === "" || (Array.isArray(v) && v.length === 0)
const pretty = (s: string) => {
  const t = s.replace(/_/g, " ").trim()
  if (/^under \d/i.test(t)) return `Under $${t.split(" ")[1]}`
  return /^(yes|no|unsure|single|married|divorced|widowed)$/i.test(t) ? t.charAt(0).toUpperCase() + t.slice(1) : t
}
const labelFor = (key: string) => key.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase())

function Value({ value }: { value: unknown }) {
  if (Array.isArray(value)) {
    return (
      <div className="flex flex-wrap gap-1.5">
        {value.map((v, i) => <Badge key={i} variant="secondary" className="font-normal">{pretty(String(v))}</Badge>)}
      </div>
    )
  }
  if (typeof value === "object" && value) {
    return <span className="whitespace-pre-wrap break-words">{Object.entries(value as Answers).map(([k, v]) => `${labelFor(k)}: ${String(v)}`).join("\n")}</span>
  }
  return <span className="whitespace-pre-wrap break-words">{pretty(String(value))}</span>
}

/** Read-only, sectioned view of a submitted Family Protection Workbook. */
export function WorkbookAnswers({ answers }: { answers: Answers }) {
  const known = new Set(SECTIONS.flatMap((s) => s.fields.map(([k]) => k)))
  const extra = Object.keys(answers).filter((k) => !known.has(k) && !isEmpty(answers[k]))
  const sections = [
    ...SECTIONS,
    ...(extra.length ? [{ title: "Other Answers", fields: extra.map((k) => [k, labelFor(k)] as [string, string]) }] : []),
  ]
    .map((s) => ({ ...s, fields: s.fields.filter(([k]) => !isEmpty(answers[k])) }))
    .filter((s) => s.fields.length > 0)

  if (!sections.length) return <p className="text-sm text-muted-foreground">No answers were saved.</p>

  return (
    <div className="space-y-3">
      {sections.map((section) => (
        <div key={section.title} className="rounded-lg bg-muted/50 p-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{section.title}</p>
          <div className="divide-y divide-border/40">
            {section.fields.map(([key, label]) => (
              <div key={key} className="grid gap-1 py-2 text-sm sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] sm:gap-4">
                <span className="text-muted-foreground">{label}</span>
                <div className="font-medium text-foreground"><Value value={answers[key]} /></div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
