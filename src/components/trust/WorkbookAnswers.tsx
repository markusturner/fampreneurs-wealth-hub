import { Badge } from "@/components/ui/badge"
import { answerLabel, prettyAnswer, workbookSections, type WorkbookAnswerMap } from "@/lib/workbook-answers"

function Value({ value }: { value: unknown }) {
  if (Array.isArray(value)) {
    return (
      <div className="flex flex-wrap gap-1.5">
        {value.map((v, i) => <Badge key={i} variant="secondary" className="font-normal">{prettyAnswer(String(v))}</Badge>)}
      </div>
    )
  }
  if (typeof value === "object" && value) {
    return <span className="whitespace-pre-wrap break-words">{Object.entries(value as WorkbookAnswerMap).map(([k, v]) => `${answerLabel(k)}: ${String(v)}`).join("\n")}</span>
  }
  return <span className="whitespace-pre-wrap break-words">{prettyAnswer(String(value))}</span>
}

/** Read-only, sectioned view of a submitted Family Protection Workbook. */
export function WorkbookAnswers({ answers }: { answers: WorkbookAnswerMap }) {
  const sections = workbookSections(answers)

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
