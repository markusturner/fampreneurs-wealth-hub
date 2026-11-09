import { answerText, workbookSections, type WorkbookAnswerMap } from "@/lib/workbook-answers"
import { buildStructure, documentsToBring } from "@/lib/workbook"

// Brand colors (PDF output cannot read CSS tokens).
const PURPLE: [number, number, number] = [41, 10, 82]
const GOLD: [number, number, number] = [255, 181, 0]
const MUTED: [number, number, number] = [110, 110, 120]
const TEXT: [number, number, number] = [30, 30, 35]

/** Builds and downloads a branded PDF of a submitted Family Protection Workbook. */
export async function downloadWorkbookPdf(answers: WorkbookAnswerMap, clientName: string, submittedAt?: string | null) {
  const { jsPDF } = await import("jspdf")
  const doc = new jsPDF({ unit: "pt", format: "letter" })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const margin = 48
  const width = pageW - margin * 2
  let y = margin

  const ensure = (h: number) => {
    if (y + h > pageH - margin) { doc.addPage(); y = margin }
  }

  // Header band
  doc.setFillColor(...PURPLE)
  doc.rect(0, 0, pageW, 96, "F")
  doc.setFillColor(...GOLD)
  doc.rect(0, 96, pageW, 4, "F")
  doc.setTextColor(255, 255, 255)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(20)
  doc.text("Family Protection Workbook", margin, 46)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(11)
  const date = submittedAt ? new Date(submittedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : ""
  doc.text([clientName, date ? `Submitted ${date}` : ""].filter(Boolean).join("  |  "), margin, 70)
  y = 132

  const heading = (title: string) => {
    ensure(40)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(10)
    doc.setTextColor(...PURPLE)
    doc.text(title.toUpperCase(), margin, y)
    doc.setDrawColor(...GOLD)
    doc.setLineWidth(1)
    doc.line(margin, y + 6, margin + width, y + 6)
    y += 22
  }

  const labelW = width * 0.38
  const valueW = width - labelW - 12
  const row = (label: string, value: string) => {
    doc.setFontSize(10)
    const labelLines = doc.splitTextToSize(label, labelW)
    doc.setFont("helvetica", "bold")
    const valueLines = doc.splitTextToSize(value, valueW)
    const h = Math.max(labelLines.length, valueLines.length) * 13 + 6
    ensure(h)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(...MUTED)
    doc.text(labelLines, margin, y)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(...TEXT)
    doc.text(valueLines, margin + labelW + 12, y)
    y += h
  }

  const bullet = (text: string) => {
    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    doc.setTextColor(...TEXT)
    const lines = doc.splitTextToSize(text, width - 16)
    ensure(lines.length * 13 + 4)
    doc.text("-", margin + 2, y)
    doc.text(lines, margin + 16, y)
    y += lines.length * 13 + 4
  }

  for (const section of workbookSections(answers)) {
    heading(section.title)
    for (const [key, label] of section.fields) row(label, answerText(answers[key]))
    y += 10
  }

  const docs = documentsToBring(answers as Record<string, any>).filter((g) => g.items.length)
  if (docs.length) {
    heading("Documents to Bring")
    for (const group of docs) {
      ensure(20)
      doc.setFont("helvetica", "bold")
      doc.setFontSize(10)
      doc.setTextColor(...PURPLE)
      doc.text(group.title, margin, y)
      y += 15
      group.items.forEach(bullet)
      y += 6
    }
  }

  const structure = buildStructure(answers as Record<string, any>)
  if (structure.length) {
    heading("Trust Structure")
    for (const node of structure) {
      ensure(30)
      doc.setFont("helvetica", "bold")
      doc.setFontSize(11)
      doc.setTextColor(...PURPLE)
      doc.text(node.title, margin, y)
      y += 14
      if (node.note) {
        doc.setFont("helvetica", "normal")
        doc.setFontSize(9)
        doc.setTextColor(...MUTED)
        const lines = doc.splitTextToSize(node.note, width)
        ensure(lines.length * 12)
        doc.text(lines, margin, y)
        y += lines.length * 12 + 2
      }
      node.assets.forEach(bullet)
      y += 8
    }
  }

  const safe = (clientName || "client").replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "")
  doc.save(`${safe || "client"}_Family_Protection_Workbook.pdf`)
}
