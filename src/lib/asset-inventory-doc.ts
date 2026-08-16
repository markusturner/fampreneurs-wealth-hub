export interface TableRow {
  [key: string]: string
}

export type Column = { key: string; label: string }

export const ASSET_COLS = {
  beneficiaries: [
    { key: "fullName", label: "Full Name & DOB" },
    { key: "ssn", label: "Social Security No." },
    { key: "relationship", label: "Relationship" },
    { key: "notes", label: "Notes" },
    { key: "contactInfo", label: "Contact Info" },
  ],
  bankAccounts: [
    { key: "bankName", label: "Bank Name & Account" },
    { key: "loginWebpage", label: "Login Webpage" },
    { key: "username", label: "Username" },
    { key: "password", label: "Password" },
    { key: "currentBalance", label: "Current Balance" },
  ],
  brokerageAccounts: [
    { key: "firmName", label: "Firm Name & Account No." },
    { key: "titling", label: "Titling" },
    { key: "username", label: "Username" },
    { key: "password", label: "Password" },
    { key: "currentBalance", label: "Current Balance" },
  ],
  securities: [
    { key: "name", label: "Name of Stock, Bond, etc." },
    { key: "titling", label: "Titling" },
    { key: "cusipNo", label: "CUSIP No." },
    { key: "numShares", label: "Number of Shares" },
    { key: "estMarketValue", label: "Est. Market Value" },
  ],
  retirementAccounts: [
    { key: "firmName", label: "Firm Name & Account No." },
    { key: "loginWebpage", label: "Login Webpage" },
    { key: "username", label: "Username" },
    { key: "password", label: "Password" },
    { key: "currentBalance", label: "Current Balance" },
  ],
  digitalAssets: [
    { key: "nameType", label: "Name & Type of Account" },
    { key: "currentBalance", label: "Current Balance" },
  ],
  phonePasscodes: [
    { key: "person", label: "Person" },
    { key: "passcode", label: "Passcode" },
  ],
  employerPlans: [
    { key: "type", label: "Type" },
    { key: "plan", label: "Plan" },
    { key: "contactInfo", label: "Contact Info / Website" },
    { key: "accountInfo", label: "Account Info" },
    { key: "username", label: "Username" },
    { key: "password", label: "Password" },
    { key: "currentBalance", label: "Current Balance" },
  ],
  hsaAccounts: [
    { key: "type", label: "Type" },
    { key: "plan", label: "Plan" },
    { key: "contactInfo", label: "Contact Info / Website" },
    { key: "accountOwner", label: "Account Owner" },
    { key: "username", label: "Username" },
    { key: "password", label: "Password" },
    { key: "currentBalance", label: "Current Balance" },
  ],
  annuities: [
    { key: "type", label: "Type" },
    { key: "plan", label: "Plan" },
    { key: "contactInfo", label: "Contact Info / Website" },
    { key: "accountOwner", label: "Account Owner" },
    { key: "username", label: "Username" },
    { key: "password", label: "Password" },
    { key: "annualPayments", label: "Annual Payments" },
  ],
  realEstate: [
    { key: "typeAddress", label: "Type & Address" },
    { key: "titling", label: "Titling" },
    { key: "estValue", label: "Est. Value" },
    { key: "mortgageAmount", label: "Outstanding Mortgage" },
    { key: "lenderContactInfo", label: "Lender Contact Info" },
  ],
  safeDeposit: [
    { key: "bankLocation", label: "Bank / Location" },
    { key: "branchContactInfo", label: "Branch Contact" },
    { key: "boxNumber", label: "Box Number" },
    { key: "executorAware", label: "Executor Aware?" },
    { key: "keyLocation", label: "Key Location" },
  ],
  personalProperty: [
    { key: "type", label: "Type" },
    { key: "titling", label: "Titling" },
    { key: "description", label: "Description" },
    { key: "location", label: "Location" },
    { key: "estMarketValue", label: "Est. Market Value" },
  ],
  lifeInsurance: [
    { key: "type", label: "Type" },
    { key: "insuranceFirm", label: "Insurance Firm" },
    { key: "policyType", label: "Policy Type" },
    { key: "policyOwner", label: "Policy Owner" },
    { key: "beneficiary", label: "Beneficiary" },
    { key: "deathBenefit", label: "Death Benefit" },
    { key: "contactInfo", label: "Contact Info" },
  ],
  propertyCasualty: [
    { key: "type", label: "Type" },
    { key: "insuranceFirm", label: "Insurance Firm" },
    { key: "contactInfo", label: "Contact Info" },
    { key: "coverageAmount", label: "Coverage Amount" },
  ],
  unsecuredDebts: [
    { key: "lenderContactInfo", label: "Lender Contact Info" },
    { key: "type", label: "Type" },
    { key: "balanceOutstanding", label: "Balance Outstanding" },
  ],
  debtOwed: [
    { key: "borrower", label: "Borrower" },
    { key: "contactInfo", label: "Contact Info" },
    { key: "notes", label: "Notes" },
    { key: "balanceOutstanding", label: "Balance Outstanding" },
  ],
  advisors: [
    { key: "advisorType", label: "Advisor Type" },
    { key: "name", label: "Name" },
    { key: "firm", label: "Firm" },
    { key: "number", label: "Number" },
    { key: "email", label: "Email" },
  ],
  businessInterests: [
    { key: "businessContact", label: "Business Contact" },
    { key: "titling", label: "Titling" },
    { key: "ownershipPercent", label: "Ownership %" },
    { key: "entityType", label: "Entity Type" },
    { key: "successionAddressed", label: "Succession Addressed?" },
  ],
} satisfies Record<string, Column[]>

export const ESTATE_DOCS = [
  "Durable Power of Attorney (DPOA) / Healthcare Power of Attorney",
  "Living Will",
  "Healthcare Medical Directive",
  "Guardianship for Minors",
  "Trusts",
  "Letter of Instruction",
]

/** Ordered list of sections shown in the preview and the PDF. */
export const ASSET_SECTIONS: { key: keyof typeof ASSET_COLS; title: string }[] = [
  { key: "beneficiaries", title: "Family & Beneficiary Information" },
  { key: "bankAccounts", title: "Bank Accounts" },
  { key: "brokerageAccounts", title: "Brokerage Accounts" },
  { key: "securities", title: "Securities in Certificate Form" },
  { key: "retirementAccounts", title: "Personal Retirement Accounts" },
  { key: "digitalAssets", title: "Digital Assets" },
  { key: "phonePasscodes", title: "Phone Passcodes" },
  { key: "employerPlans", title: "Employer-Sponsored Retirement Plans" },
  { key: "hsaAccounts", title: "Health Savings Accounts" },
  { key: "annuities", title: "Annuities / Pensions" },
  { key: "realEstate", title: "Real Estate" },
  { key: "safeDeposit", title: "Safe Deposit Box" },
  { key: "personalProperty", title: "Personal Property" },
  { key: "lifeInsurance", title: "Life Insurance" },
  { key: "propertyCasualty", title: "Property & Casualty Insurance" },
  { key: "unsecuredDebts", title: "Unsecured Debts" },
  { key: "debtOwed", title: "Debt Owed To You" },
  { key: "advisors", title: "Personal Advisors" },
  { key: "businessInterests", title: "Business Interests" },
]

export const estateDocRows = (
  estateDocStatus: Record<string, { hasIt: string; location: string }> = {}
): string[][] =>
  ESTATE_DOCS.map(d => [
    d,
    estateDocStatus?.[d]?.hasIt === "yes" ? "Yes" : estateDocStatus?.[d]?.hasIt === "no" ? "No" : "",
    estateDocStatus?.[d]?.location || "",
  ]).filter(r => r[1] || r[2])

export const filledRows = (cols: Column[], rows: TableRow[] = []): string[][] =>
  (rows || [])
    .map(r => cols.map(c => (r?.[c.key] || "").toString()))
    .filter(r => r.some(c => c.trim()))

export async function downloadAssetInventoryPdf(formData: any, submitterName: string) {
  const { default: jsPDF } = await import("jspdf")
  const autoTable = (await import("jspdf-autotable")).default
  const doc = new jsPDF({ unit: "pt", format: "letter", orientation: "landscape" })
  const pageW = doc.internal.pageSize.getWidth()

  doc.setFillColor(41, 10, 82)
  doc.rect(0, 0, pageW, 84, "F")
  doc.setTextColor(255, 181, 0)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(20)
  doc.text("Asset Inventory", 40, 42)
  doc.setTextColor(255, 255, 255)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  doc.text(`${submitterName || "Prepared"} • ${new Date().toLocaleDateString()}`, 40, 64)

  let startY = 108

  const heading = (title: string) => {
    if (startY > doc.internal.pageSize.getHeight() - 120) {
      doc.addPage()
      startY = 60
    }
    doc.setFont("helvetica", "bold")
    doc.setFontSize(12)
    doc.setTextColor(41, 10, 82)
    doc.text(title, 40, startY)
    startY += 12
  }

  const addTable = (head: string[], body: string[][]) => {
    autoTable(doc, {
      head: [head],
      body,
      startY,
      margin: { left: 40, right: 40 },
      styles: { font: "helvetica", fontSize: 8, cellPadding: 4, overflow: "linebreak", textColor: [40, 40, 40] },
      headStyles: { fillColor: [41, 10, 82], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
      alternateRowStyles: { fillColor: [246, 244, 250] },
      theme: "grid",
      tableLineColor: [220, 216, 228],
      tableLineWidth: 0.5,
    } as any)
    startY = (doc as any).lastAutoTable.finalY + 34
    if (startY > doc.internal.pageSize.getHeight() - 120) {
      doc.addPage()
      startY = 60
    }
  }

  const beneficiaries = filledRows(ASSET_COLS.beneficiaries, formData?.beneficiaries)
  if (beneficiaries.length) {
    heading("Family & Beneficiary Information")
    addTable(ASSET_COLS.beneficiaries.map(c => c.label), beneficiaries)
  }

  const estateBody = estateDocRows(formData?.estateDocStatus)
  if (estateBody.length) {
    heading("Estate Planning Documents")
    addTable(["Document", "Have It?", "Location"], estateBody)
  }

  ASSET_SECTIONS.filter(s => s.key !== "beneficiaries").forEach(({ key, title }) => {
    const cols = ASSET_COLS[key] as Column[]
    const body = filledRows(cols, formData?.[key])
    if (!body.length) return
    heading(title)
    addTable(cols.map(c => c.label), body)
  })

  doc.save(`Asset-Inventory-${(submitterName || "TruHeirs").replace(/\s+/g, "-")}.pdf`)
}
