import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Loader2, CheckCircle2, Plus, Trash2, Download } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"

interface TableRow {
  [key: string]: string
}

type Column = { key: string; label: string }

const createEmptyRows = (count: number, columns: string[]): TableRow[] =>
  Array.from({ length: count }, () => Object.fromEntries(columns.map(c => [c, ""])))

const COLS = {
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

const keys = (cols: Column[]) => cols.map(c => c.key)

export function AssetInventoryForm({ onSubmitted }: { onSubmitted: () => void }) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [submitting, setSubmitting] = useState(false)
  const [submitterName, setSubmitterName] = useState("")
  const [restored, setRestored] = useState(false)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const storageKey = `asset-inventory-draft-${user?.id ?? "anon"}`

  const [beneficiaries, setBeneficiaries] = useState<TableRow[]>(createEmptyRows(4, keys(COLS.beneficiaries)))

  const estateDocs = ["Durable Power of Attorney (DPOA) / Healthcare Power of Attorney", "Living Will", "Healthcare Medical Directive", "Guardianship for Minors", "Trusts", "Letter of Instruction"]
  const [estateDocStatus, setEstateDocStatus] = useState<Record<string, { hasIt: string; location: string }>>(
    Object.fromEntries(estateDocs.map(d => [d, { hasIt: "", location: "" }]))
  )

  const [bankAccounts, setBankAccounts] = useState<TableRow[]>(createEmptyRows(3, keys(COLS.bankAccounts)))
  const [brokerageAccounts, setBrokerageAccounts] = useState<TableRow[]>(createEmptyRows(3, keys(COLS.brokerageAccounts)))
  const [securities, setSecurities] = useState<TableRow[]>(createEmptyRows(3, keys(COLS.securities)))
  const [retirementAccounts, setRetirementAccounts] = useState<TableRow[]>(createEmptyRows(3, keys(COLS.retirementAccounts)))
  const [digitalAssets, setDigitalAssets] = useState<TableRow[]>(createEmptyRows(3, keys(COLS.digitalAssets)))
  const [phonePasscodes, setPhonePasscodes] = useState<TableRow[]>(createEmptyRows(4, keys(COLS.phonePasscodes)))
  const [employerPlans, setEmployerPlans] = useState<TableRow[]>(createEmptyRows(5, keys(COLS.employerPlans)))
  const [hsaAccounts, setHsaAccounts] = useState<TableRow[]>(createEmptyRows(2, keys(COLS.hsaAccounts)))
  const [annuities, setAnnuities] = useState<TableRow[]>(createEmptyRows(2, keys(COLS.annuities)))
  const [realEstate, setRealEstate] = useState<TableRow[]>(createEmptyRows(3, keys(COLS.realEstate)))
  const [safeDeposit, setSafeDeposit] = useState<TableRow[]>(createEmptyRows(2, keys(COLS.safeDeposit)))
  const [personalProperty, setPersonalProperty] = useState<TableRow[]>(createEmptyRows(6, keys(COLS.personalProperty)))
  const [lifeInsurance, setLifeInsurance] = useState<TableRow[]>(createEmptyRows(4, keys(COLS.lifeInsurance)))
  const [propertyCasualty, setPropertyCasualty] = useState<TableRow[]>(createEmptyRows(3, keys(COLS.propertyCasualty)))
  const [unsecuredDebts, setUnsecuredDebts] = useState<TableRow[]>(createEmptyRows(3, keys(COLS.unsecuredDebts)))
  const [debtOwed, setDebtOwed] = useState<TableRow[]>(createEmptyRows(3, keys(COLS.debtOwed)))
  const [advisors, setAdvisors] = useState<TableRow[]>(createEmptyRows(5, keys(COLS.advisors)))
  const [businessInterests, setBusinessInterests] = useState<TableRow[]>(createEmptyRows(3, keys(COLS.businessInterests)))

  const formData = {
    beneficiaries,
    estateDocStatus,
    bankAccounts,
    brokerageAccounts,
    securities,
    retirementAccounts,
    digitalAssets,
    phonePasscodes,
    employerPlans,
    hsaAccounts,
    annuities,
    realEstate,
    safeDeposit,
    personalProperty,
    lifeInsurance,
    propertyCasualty,
    unsecuredDebts,
    debtOwed,
    advisors,
    businessInterests,
  }

  const setters: Record<string, React.Dispatch<React.SetStateAction<TableRow[]>>> = {
    beneficiaries: setBeneficiaries,
    bankAccounts: setBankAccounts,
    brokerageAccounts: setBrokerageAccounts,
    securities: setSecurities,
    retirementAccounts: setRetirementAccounts,
    digitalAssets: setDigitalAssets,
    phonePasscodes: setPhonePasscodes,
    employerPlans: setEmployerPlans,
    hsaAccounts: setHsaAccounts,
    annuities: setAnnuities,
    realEstate: setRealEstate,
    safeDeposit: setSafeDeposit,
    personalProperty: setPersonalProperty,
    lifeInsurance: setLifeInsurance,
    propertyCasualty: setPropertyCasualty,
    unsecuredDebts: setUnsecuredDebts,
    debtOwed: setDebtOwed,
    advisors: setAdvisors,
    businessInterests: setBusinessInterests,
  }

  // Restore saved draft
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed?.data) {
          Object.entries(setters).forEach(([key, setter]) => {
            const rows = parsed.data[key]
            if (Array.isArray(rows) && rows.length) setter(rows)
          })
          if (parsed.data.estateDocStatus) setEstateDocStatus(prev => ({ ...prev, ...parsed.data.estateDocStatus }))
        }
        if (parsed?.submitterName) setSubmitterName(parsed.submitterName)
        if (parsed?.savedAt) setSavedAt(new Date(parsed.savedAt))
      }
    } catch (e) {
      console.error("Failed to restore asset inventory draft", e)
    }
    setRestored(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey])

  // Autosave draft
  useEffect(() => {
    if (!restored) return
    const timer = setTimeout(() => {
      try {
        const now = new Date()
        localStorage.setItem(storageKey, JSON.stringify({ data: formData, submitterName, savedAt: now.toISOString() }))
        setSavedAt(now)
      } catch (e) {
        console.error("Failed to autosave asset inventory draft", e)
      }
    }, 800)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(formData), submitterName, restored, storageKey])

  const updateRow = (
    rows: TableRow[],
    setRows: React.Dispatch<React.SetStateAction<TableRow[]>>,
    index: number,
    field: string,
    value: string
  ) => {
    const updated = [...rows]
    updated[index] = { ...updated[index], [field]: value }
    setRows(updated)
  }

  const addRow = (rows: TableRow[], setRows: React.Dispatch<React.SetStateAction<TableRow[]>>, columns: string[]) => {
    setRows([...rows, Object.fromEntries(columns.map(c => [c, ""]))])
  }

  const removeRow = (rows: TableRow[], setRows: React.Dispatch<React.SetStateAction<TableRow[]>>, index: number) => {
    if (rows.length <= 1) return
    setRows(rows.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    if (!user?.id) return
    if (!submitterName.trim()) {
      toast({ title: "Name required", description: "Please enter your full name before submitting.", variant: "destructive" })
      return
    }
    setSubmitting(true)
    try {
      const { error } = await supabase
        .from("trust_submissions")
        .insert({ user_id: user.id, trust_type: "asset_inventory", form_data: formData, submitter_name: submitterName.trim() } as any)
      if (error) throw error
      toast({ title: "Asset Inventory submitted", description: "Your asset inventory has been recorded." })
      onSubmitted()
    } catch (err: any) {
      if (err?.code === "23505") {
        toast({ title: "Already submitted", description: "You have already submitted your asset inventory.", variant: "destructive" })
        onSubmitted()
      } else {
        console.error("Error submitting asset inventory:", err)
        toast({ title: "Error", description: "Failed to submit asset inventory.", variant: "destructive" })
      }
    } finally {
      setSubmitting(false)
    }
  }

  const downloadPdf = async () => {
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

    const addTable = (title: string, head: string[], body: string[][]) => {
      const filled = body.filter(r => r.some(c => c && c.trim()))
      if (!filled.length) return
      autoTable(doc, {
        head: [head],
        body: filled,
        startY,
        margin: { left: 40, right: 40 },
        styles: { font: "helvetica", fontSize: 8, cellPadding: 4, overflow: "linebreak", textColor: [40, 40, 40] },
        headStyles: { fillColor: [41, 10, 82], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
        alternateRowStyles: { fillColor: [246, 244, 250] },
        didDrawPage: () => {},
        willDrawPage: () => {},
        theme: "grid",
        tableLineColor: [220, 216, 228],
        tableLineWidth: 0.5,
        // section heading
        beforePageBreak: () => {},
      } as any)
      // @ts-ignore
      startY = (doc as any).lastAutoTable.finalY + 34
      if (startY > doc.internal.pageSize.getHeight() - 120) {
        doc.addPage()
        startY = 60
      }
    }

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

    const section = (title: string, cols: Column[], rows: TableRow[]) => {
      const body = rows.map(r => cols.map(c => r[c.key] || ""))
      if (!body.some(r => r.some(c => c.trim()))) return
      heading(title)
      addTable(title, cols.map(c => c.label), body)
    }

    section("Family & Beneficiary Information", COLS.beneficiaries, beneficiaries)

    const estateBody = estateDocs
      .map(d => [d, estateDocStatus[d]?.hasIt === "yes" ? "Yes" : estateDocStatus[d]?.hasIt === "no" ? "No" : "", estateDocStatus[d]?.location || ""])
      .filter(r => r[1] || r[2])
    if (estateBody.length) {
      heading("Estate Planning Documents")
      addTable("Estate Planning Documents", ["Document", "Have It?", "Location"], estateBody)
    }

    section("Bank Accounts", COLS.bankAccounts, bankAccounts)
    section("Brokerage Accounts", COLS.brokerageAccounts, brokerageAccounts)
    section("Securities in Certificate Form", COLS.securities, securities)
    section("Personal Retirement Accounts", COLS.retirementAccounts, retirementAccounts)
    section("Digital Assets", COLS.digitalAssets, digitalAssets)
    section("Phone Passcodes", COLS.phonePasscodes, phonePasscodes)
    section("Employer-Sponsored Retirement Plans", COLS.employerPlans, employerPlans)
    section("Health Savings Accounts", COLS.hsaAccounts, hsaAccounts)
    section("Annuities / Pensions", COLS.annuities, annuities)
    section("Real Estate", COLS.realEstate, realEstate)
    section("Safe Deposit Box", COLS.safeDeposit, safeDeposit)
    section("Personal Property", COLS.personalProperty, personalProperty)
    section("Life Insurance", COLS.lifeInsurance, lifeInsurance)
    section("Property & Casualty Insurance", COLS.propertyCasualty, propertyCasualty)
    section("Unsecured Debts", COLS.unsecuredDebts, unsecuredDebts)
    section("Debt Owed To You", COLS.debtOwed, debtOwed)
    section("Personal Advisors", COLS.advisors, advisors)
    section("Business Interests", COLS.businessInterests, businessInterests)

    doc.save(`Asset-Inventory-${(submitterName || "TruHeirs").replace(/\s+/g, "-")}.pdf`)
  }

  const renderTableSection = (
    title: string,
    columns: Column[],
    rows: TableRow[],
    setRows: React.Dispatch<React.SetStateAction<TableRow[]>>
  ) => (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.map((row, idx) => (
          <div key={idx} className="grid gap-2 p-3 rounded-lg border border-border/30 bg-muted/20" style={{ gridTemplateColumns: `repeat(${columns.length}, 1fr) auto` }}>
            {columns.map(col => (
              <div key={col.key}>
                {idx === 0 && <Label className="text-xs text-muted-foreground mb-1 block">{col.label}</Label>}
                <Input
                  value={row[col.key] || ""}
                  onChange={e => updateRow(rows, setRows, idx, col.key, e.target.value)}
                  className="h-8 text-xs"
                  placeholder={col.label}
                />
              </div>
            ))}
            <div className={idx === 0 ? "pt-5" : ""}>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeRow(rows, setRows, idx)} disabled={rows.length <= 1}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ))}
        <Button variant="outline" size="sm" className="gap-1" onClick={() => addRow(rows, setRows, columns.map(c => c.key))}>
          <Plus className="h-3 w-3" /> Add Row
        </Button>
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6">
      <div className="bg-muted/30 p-4 rounded-lg border border-border/30">
        <p className="text-sm text-muted-foreground">
          This worksheet helps you organize your financial information for the purpose of transferring assets into your trust.
          Complete this inventory up to your comfort level. Keep a physical copy somewhere safe.
        </p>
      </div>

      {renderTableSection("Family & Beneficiary Information", COLS.beneficiaries, beneficiaries, setBeneficiaries)}

      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Estate Planning Documents</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {estateDocs.map(doc => (
            <div key={doc} className="grid grid-cols-3 gap-3 items-center p-2 rounded border border-border/30">
              <span className="text-xs font-medium">{doc}</span>
              <Select value={estateDocStatus[doc]?.hasIt || ""} onValueChange={v => setEstateDocStatus(prev => ({ ...prev, [doc]: { ...prev[doc], hasIt: v } }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Yes / No" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
              <Input
                value={estateDocStatus[doc]?.location || ""}
                onChange={e => setEstateDocStatus(prev => ({ ...prev, [doc]: { ...prev[doc], location: e.target.value } }))}
                className="h-8 text-xs"
                placeholder="Location"
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {renderTableSection("Bank Accounts", COLS.bankAccounts, bankAccounts, setBankAccounts)}
      {renderTableSection("Brokerage Accounts", COLS.brokerageAccounts, brokerageAccounts, setBrokerageAccounts)}
      {renderTableSection("Securities in Certificate Form", COLS.securities, securities, setSecurities)}
      {renderTableSection("Personal Retirement Accounts", COLS.retirementAccounts, retirementAccounts, setRetirementAccounts)}
      {renderTableSection("Digital Assets", COLS.digitalAssets, digitalAssets, setDigitalAssets)}
      {renderTableSection("Phone Passcodes", COLS.phonePasscodes, phonePasscodes, setPhonePasscodes)}
      {renderTableSection("Employer-Sponsored Retirement Plans", COLS.employerPlans, employerPlans, setEmployerPlans)}
      {renderTableSection("Health Savings Accounts", COLS.hsaAccounts, hsaAccounts, setHsaAccounts)}
      {renderTableSection("Annuities / Pensions", COLS.annuities, annuities, setAnnuities)}
      {renderTableSection("Real Estate", COLS.realEstate, realEstate, setRealEstate)}
      {renderTableSection("Safe Deposit Box", COLS.safeDeposit, safeDeposit, setSafeDeposit)}
      {renderTableSection("Personal Property", COLS.personalProperty, personalProperty, setPersonalProperty)}
      {renderTableSection("Life Insurance", COLS.lifeInsurance, lifeInsurance, setLifeInsurance)}
      {renderTableSection("Property & Casualty Insurance", COLS.propertyCasualty, propertyCasualty, setPropertyCasualty)}
      {renderTableSection("Unsecured Debts", COLS.unsecuredDebts, unsecuredDebts, setUnsecuredDebts)}
      {renderTableSection("Debt Owed To You", COLS.debtOwed, debtOwed, setDebtOwed)}
      {renderTableSection("Personal Advisors", COLS.advisors, advisors, setAdvisors)}
      {renderTableSection("Business Interests", COLS.businessInterests, businessInterests, setBusinessInterests)}

      <div className="space-y-4 pt-4 border-t">
        <div className="space-y-2">
          <Label htmlFor="submitter-name" className="font-semibold">Your Full Name <span className="text-destructive">*</span></Label>
          <Input
            id="submitter-name"
            placeholder="Enter your full legal name"
            value={submitterName}
            onChange={(e) => setSubmitterName(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">Required to assign this submission to you.</p>
        </div>
        {savedAt && (
          <p className="text-xs text-muted-foreground">
            Draft saved automatically at {savedAt.toLocaleTimeString()}
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-2">
          <Button onClick={downloadPdf} variant="secondary" className="gap-2">
            <Download className="h-4 w-4" /> Download PDF
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || !submitterName.trim()} className="gap-2 bg-[#ffb500] hover:bg-[#2eb2ff] text-[#290a52] hover:text-white">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Submit Asset Inventory
          </Button>
        </div>
      </div>
    </div>
  )
}
