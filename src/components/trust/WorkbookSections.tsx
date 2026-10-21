import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { FileCheck2 } from "lucide-react"
import { COMMODITY_OPTIONS, PERSONAL_RECORD_OPTIONS, buildStructure, documentsToBring } from "@/lib/workbook"

type Form = Record<string, any>

export const QuestionGroup = ({ title, card, children }: { title?: string; card?: boolean; children: React.ReactNode }) => (
  <div className={card ? "space-y-5 rounded-xl border border-border bg-card p-4 sm:p-5" : "space-y-5"}>
    {card && title ? (
      <h3 className="text-sm font-semibold uppercase tracking-widest text-sidebar">{title}</h3>
    ) : null}
    {children}
  </div>
)

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <QuestionGroup title={title} card>{children}</QuestionGroup>
)

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-2"><Label>{label}</Label>{children}</div>
)

export function WorkbookQuestions({ form, update }: { form: Form; update: (k: string, v: any) => void }) {
  const toggle = (k: string, v: string) => {
    const list: string[] = form[k] || []
    update(k, list.includes(v) ? list.filter(x => x !== v) : [...list, v])
  }
  const area = (k: string, placeholder?: string) => (
    <Textarea value={form[k] || ""} onChange={e => update(k, e.target.value)} rows={3} placeholder={placeholder} />
  )

  return (
    <div className="space-y-5">
      <Section title="Existing Revocable Trust">
        <Field label="21. Do you already have a revocable trust?">
          <RadioGroup value={form.has_revocable} onValueChange={v => update("has_revocable", v)} className="flex gap-4">
            {["yes", "no", "unsure"].map(v => (
              <div key={v} className="flex items-center gap-2"><RadioGroupItem value={v} id={`rv-${v}`} /><Label htmlFor={`rv-${v}`} className="capitalize">{v}</Label></div>
            ))}
          </RadioGroup>
        </Field>
        {form.has_revocable === "yes" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name of the trust"><Input value={form.rev_name} onChange={e => update("rev_name", e.target.value)} /></Field>
            <Field label="Year it was created"><Input value={form.rev_date} onChange={e => update("rev_date", e.target.value)} /></Field>
            <Field label="State it was made in"><Input value={form.rev_state} onChange={e => update("rev_state", e.target.value)} /></Field>
            <Field label="Who is the trustee?"><Input value={form.rev_trustee} onChange={e => update("rev_trustee", e.target.value)} /></Field>
            <Field label="Attorney or company that drafted it"><Input value={form.rev_attorney} onChange={e => update("rev_attorney", e.target.value)} /></Field>
            <Field label="Do you have the full signed copy?">
              <RadioGroup value={form.rev_signed_copy} onValueChange={v => update("rev_signed_copy", v)} className="flex gap-4">
                {["yes", "no"].map(v => (
                  <div key={v} className="flex items-center gap-2"><RadioGroupItem value={v} id={`rs-${v}`} /><Label htmlFor={`rs-${v}`} className="capitalize">{v}</Label></div>
                ))}
              </RadioGroup>
            </Field>
            <div className="sm:col-span-2"><Field label="What assets are in it right now?">{area("rev_assets", "Home, savings account...")}</Field></div>
          </div>
        )}
      </Section>

      <Section title="Real Estate">
        <Field label="22. List each property: address, whose name is on the deed, mortgage lender and balance, and if it is your home or a rental.">
          {area("real_estate_details", "123 Main St, Atlanta GA - my name - Chase, $180k left - primary home")}
        </Field>
      </Section>

      <Section title="Business">
        <Field label="23. List each business: name, type (LLC, S-Corp, etc.), state, EIN if you know it, and your ownership percent.">
          {area("business_details", "Smith Holdings LLC - Georgia - 100%")}
        </Field>
      </Section>

      <Section title="Bank and Investment Accounts">
        <Field label="24. List each account: bank or brokerage, account type, and about how much is in it.">
          {area("bank_accounts", "Navy Federal checking ~$20k, Fidelity brokerage ~$60k")}
        </Field>
      </Section>

      <Section title="Retirement and Life Insurance">
        <Field label="25. List retirement accounts and life insurance policies, plus who is named as beneficiary today.">
          {area("retirement_insurance", "401k at work ~$90k - spouse; Term life $500k - spouse")}
        </Field>
      </Section>

      <Section title="Commodities">
        <Field label="26. Do you own any of these? (check all that apply)">
          <div className="grid gap-2 sm:grid-cols-2">
            {COMMODITY_OPTIONS.map(c => (
              <div key={c} className="flex items-center gap-2">
                <Checkbox id={`c-${c}`} checked={(form.commodities || []).includes(c)} onCheckedChange={() => toggle("commodities", c)} />
                <Label htmlFor={`c-${c}`} className="text-sm font-normal">{c}</Label>
              </div>
            ))}
          </div>
        </Field>
        {(form.commodities || []).length > 0 && (
          <Field label="For each one: how much, and where is it held (home safe, vault, exchange, wallet)?">
            {area("commodities_detail", "20 oz gold in a home safe; Bitcoin on Coinbase")}
          </Field>
        )}
      </Section>

      <Section title="Vehicles and Valuables">
        <Field label="27. List vehicles (and if they are paid off) and any art, jewelry, or collectibles.">
          {area("vehicles_valuables")}
        </Field>
      </Section>

      <Section title="Debts">
        <Field label="28. List any loans, liens, judgments, or open lawsuits.">
          {area("debts", "Leave blank if none")}
        </Field>
      </Section>

      <Section title="Personal Records">
        <Field label="29. Which of these do you have on hand today? (check all that apply)">
          <div className="grid gap-2 sm:grid-cols-2">
            {PERSONAL_RECORD_OPTIONS.map(c => (
              <div key={c} className="flex items-center gap-2">
                <Checkbox id={`pr-${c}`} checked={(form.personal_records || []).includes(c)} onCheckedChange={() => toggle("personal_records", c)} />
                <Label htmlFor={`pr-${c}`} className="text-sm font-normal">{c}</Label>
              </div>
            ))}
          </div>
        </Field>
      </Section>

      <Section title="Your Structure">
        <Field label="30. Which assets do you want protected first? Which do you want kept private, and which do you want used to grow money?">
          {area("structure_priority", "Protect the home first, keep the gold private, use the LLC for growth")}
        </Field>
      </Section>
    </div>
  )
}

export function WorkbookResults({ form }: { form: Form }) {
  const nodes = buildStructure(form)
  const docs = documentsToBring(form)
  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-sidebar mb-4 text-center">Your Trust Structure</h3>
        <div className="flex flex-col items-center gap-2">
          {nodes.map((n, i) => (
            <div key={n.key} className="w-full flex flex-col items-center">
              {i > 0 && <div className="h-4 w-px bg-sidebar/40" />}
              <div className={`w-full max-w-xl rounded-lg border-2 p-3 ${n.key === "personal" ? "border-dashed border-border bg-muted/40" : "border-sidebar bg-sidebar/5"}`}>
                <p className="font-semibold text-sidebar">{n.title}</p>
                <p className="text-xs text-muted-foreground mb-2">{n.note}</p>
                <div className="flex flex-wrap gap-1.5">
                  {(n.assets.length ? n.assets : ["To be decided at VIP Weekend"]).map(a => (
                    <span key={a} className="rounded-full bg-secondary/20 px-2.5 py-0.5 text-xs text-foreground">{a}</span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-sidebar mb-1 flex items-center gap-2"><FileCheck2 className="h-5 w-5" /> Documents to Bring to VIP Weekend</h3>
        <p className="text-xs text-muted-foreground mb-4">Based on what you told us you own.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          {docs.map(g => (
            <div key={g.title}>
              <p className="text-sm font-semibold mb-1">{g.title}</p>
              <ul className="space-y-1">
                {g.items.map(it => <li key={it} className="text-sm text-muted-foreground flex gap-2"><span className="mt-1.5 h-2 w-2 shrink-0 rounded-sm border border-sidebar" />{it}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
