import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Loader2, CheckCircle2, Plus, Trash2 } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"

interface TableRow {
  [key: string]: string
}

const createEmptyRows = (count: number, columns: string[]): TableRow[] =>
  Array.from({ length: count }, () => Object.fromEntries(columns.map(c => [c, ""])))

export function AssetInventoryForm({ onSubmitted }: { onSubmitted: () => void }) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [submitting, setSubmitting] = useState(false)
  const [submitterName, setSubmitterName] = useState("")

  // Beneficiary Information
  const [beneficiaries, setBeneficiaries] = useState<TableRow[]>(
    createEmptyRows(4, ["fullName", "ssn", "relationship", "notes", "contactInfo"])
  )

  // Estate Planning Documents
  const estateDocs = ["Durable Power of Attorney (DPOA) / Healthcare Power of Attorney", "Living Will", "Healthcare Medical Directive", "Guardianship for Minors", "Trusts", "Letter of Instruction"]
  const [estateDocStatus, setEstateDocStatus] = useState<Record<string, { hasIt: string; location: string }>>(
    Object.fromEntries(estateDocs.map(d => [d, { hasIt: "", location: "" }]))
  )

  // Bank Accounts
  const [bankAccounts, setBankAccounts] = useState<TableRow[]>(
    createEmptyRows(3, ["bankName", "loginWebpage", "username", "password", "currentBalance"])
  )

  // Brokerage Accounts
  const [brokerageAccounts, setBrokerageAccounts] = useState<TableRow[]>(
    createEmptyRows(3, ["firmName", "titling", "username", "password", "currentBalance"])
  )

  // Securities
  const [securities, setSecurities] = useState<TableRow[]>(
    createEmptyRows(3, ["name", "titling", "cusipNo", "numShares", "estMarketValue"])
  )

  // Personal Retirement Accounts
  const [retirementAccounts, setRetirementAccounts] = useState<TableRow[]>(
    createEmptyRows(3, ["firmName", "loginWebpage", "username", "password", "currentBalance"])
  )

  // Digital Assets
  const [digitalAssets, setDigitalAssets] = useState<TableRow[]>(
    createEmptyRows(3, ["nameType", "currentBalance"])
  )

  // Phone Passcodes
  const [phonePasscodes, setPhonePasscodes] = useState<TableRow[]>(
    createEmptyRows(4, ["person", "passcode"])
  )

  // Employer Retirement Plans
  const [employerPlans, setEmployerPlans] = useState<TableRow[]>(
    createEmptyRows(5, ["type", "plan", "contactInfo", "accountInfo", "username", "password", "currentBalance"])
  )

  // HSA
  const [hsaAccounts, setHsaAccounts] = useState<TableRow[]>(
    createEmptyRows(2, ["type", "plan", "contactInfo", "accountOwner", "username", "password", "currentBalance"])
  )

  // Annuities
  const [annuities, setAnnuities] = useState<TableRow[]>(
    createEmptyRows(2, ["type", "plan", "contactInfo", "accountOwner", "username", "password", "annualPayments"])
  )

  // Real Estate
  const [realEstate, setRealEstate] = useState<TableRow[]>(
    createEmptyRows(3, ["typeAddress", "titling", "estValue", "mortgageAmount", "lenderContactInfo"])
  )

  // Safe Deposit Box
  const [safeDeposit, setSafeDeposit] = useState<TableRow[]>(
    createEmptyRows(2, ["bankLocation", "branchContactInfo", "boxNumber", "executorAware", "keyLocation"])
  )

  // Personal Property
  const [personalProperty, setPersonalProperty] = useState<TableRow[]>(
    createEmptyRows(6, ["type", "titling", "description", "location", "estMarketValue"])
  )

  // Life Insurance
  const [lifeInsurance, setLifeInsurance] = useState<TableRow[]>(
    createEmptyRows(4, ["type", "insuranceFirm", "policyType", "policyOwner", "beneficiary", "deathBenefit", "contactInfo"])
  )

  // Property & Casualty Insurance
  const [propertyCasualty, setPropertyCasualty] = useState<TableRow[]>(
    createEmptyRows(3, ["type", "insuranceFirm", "contactInfo", "coverageAmount"])
  )

  // Unsecured Debts
  const [unsecuredDebts, setUnsecuredDebts] = useState<TableRow[]>(
    createEmptyRows(3, ["lenderContactInfo", "type", "balanceOutstanding"])
  )

  // Debt Owed To You
  const [debtOwed, setDebtOwed] = useState<TableRow[]>(
    createEmptyRows(3, ["borrower", "contactInfo", "notes", "balanceOutstanding"])
  )

  // Personal Advisors
  const [advisors, setAdvisors] = useState<TableRow[]>(
    createEmptyRows(5, ["advisorType", "name", "firm", "number", "email"])
  )

  // Business Interests
  const [businessInterests, setBusinessInterests] = useState<TableRow[]>(
    createEmptyRows(3, ["businessContact", "titling", "ownershipPercent", "entityType", "successionAddressed"])
  )

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



  const renderTableSection = (
    title: string,
    columns: { key: string; label: string; width?: string }[],
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

      {renderTableSection("Family & Beneficiary Information", [
        { key: "fullName", label: "Full Name & DOB" },
        { key: "ssn", label: "Social Security No." },
        { key: "relationship", label: "Relationship" },
        { key: "notes", label: "Notes" },
        { key: "contactInfo", label: "Contact Info" },
      ], beneficiaries, setBeneficiaries)}

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

      {renderTableSection("Bank Accounts", [
        { key: "bankName", label: "Bank Name & Account" },
        { key: "loginWebpage", label: "Login Webpage" },
        { key: "username", label: "Username" },
        { key: "password", label: "Password" },
        { key: "currentBalance", label: "Current Balance" },
      ], bankAccounts, setBankAccounts)}

      {renderTableSection("Brokerage Accounts", [
        { key: "firmName", label: "Firm Name & Account No." },
        { key: "titling", label: "Titling" },
        { key: "username", label: "Username" },
        { key: "password", label: "Password" },
        { key: "currentBalance", label: "Current Balance" },
      ], brokerageAccounts, setBrokerageAccounts)}

      {renderTableSection("Securities in Certificate Form", [
        { key: "name", label: "Name of Stock, Bond, etc." },
        { key: "titling", label: "Titling" },
        { key: "cusipNo", label: "CUSIP No." },
        { key: "numShares", label: "Number of Shares" },
        { key: "estMarketValue", label: "Est. Market Value" },
      ], securities, setSecurities)}

      {renderTableSection("Personal Retirement Accounts", [
        { key: "firmName", label: "Firm Name & Account No." },
        { key: "loginWebpage", label: "Login Webpage" },
        { key: "username", label: "Username" },
        { key: "password", label: "Password" },
        { key: "currentBalance", label: "Current Balance" },
      ], retirementAccounts, setRetirementAccounts)}

      {renderTableSection("Digital Assets", [
        { key: "nameType", label: "Name & Type of Account" },
        { key: "currentBalance", label: "Current Balance" },
      ], digitalAssets, setDigitalAssets)}

      {renderTableSection("Phone Passcodes", [
        { key: "person", label: "Person" },
        { key: "passcode", label: "Passcode" },
      ], phonePasscodes, setPhonePasscodes)}

      {renderTableSection("Employer-Sponsored Retirement Plans", [
        { key: "type", label: "Type" },
        { key: "plan", label: "Plan" },
        { key: "contactInfo", label: "Contact Info / Website" },
        { key: "accountInfo", label: "Account Info" },
        { key: "username", label: "Username" },
        { key: "password", label: "Password" },
        { key: "currentBalance", label: "Current Balance" },
      ], employerPlans, setEmployerPlans)}

      {renderTableSection("Health Savings Accounts", [
        { key: "type", label: "Type" },
        { key: "plan", label: "Plan" },
        { key: "contactInfo", label: "Contact Info / Website" },
        { key: "accountOwner", label: "Account Owner" },
        { key: "username", label: "Username" },
        { key: "password", label: "Password" },
        { key: "currentBalance", label: "Current Balance" },
      ], hsaAccounts, setHsaAccounts)}

      {renderTableSection("Annuities / Pensions", [
        { key: "type", label: "Type" },
        { key: "plan", label: "Plan" },
        { key: "contactInfo", label: "Contact Info / Website" },
        { key: "accountOwner", label: "Account Owner" },
        { key: "username", label: "Username" },
        { key: "password", label: "Password" },
        { key: "annualPayments", label: "Annual Payments" },
      ], annuities, setAnnuities)}

      {renderTableSection("Real Estate", [
        { key: "typeAddress", label: "Type & Address" },
        { key: "titling", label: "Titling" },
        { key: "estValue", label: "Est. Value" },
        { key: "mortgageAmount", label: "Outstanding Mortgage" },
        { key: "lenderContactInfo", label: "Lender Contact Info" },
      ], realEstate, setRealEstate)}

      {renderTableSection("Safe Deposit Box", [
        { key: "bankLocation", label: "Bank / Location" },
        { key: "branchContactInfo", label: "Branch Contact" },
        { key: "boxNumber", label: "Box Number" },
        { key: "executorAware", label: "Executor Aware?" },
        { key: "keyLocation", label: "Key Location" },
      ], safeDeposit, setSafeDeposit)}

      {renderTableSection("Personal Property", [
        { key: "type", label: "Type" },
        { key: "titling", label: "Titling" },
        { key: "description", label: "Description" },
        { key: "location", label: "Location" },
        { key: "estMarketValue", label: "Est. Market Value" },
      ], personalProperty, setPersonalProperty)}

      {renderTableSection("Life Insurance", [
        { key: "type", label: "Type" },
        { key: "insuranceFirm", label: "Insurance Firm" },
        { key: "policyType", label: "Policy Type" },
        { key: "policyOwner", label: "Policy Owner" },
        { key: "beneficiary", label: "Beneficiary" },
        { key: "deathBenefit", label: "Death Benefit" },
        { key: "contactInfo", label: "Contact Info" },
      ], lifeInsurance, setLifeInsurance)}

      {renderTableSection("Property & Casualty Insurance", [
        { key: "type", label: "Type" },
        { key: "insuranceFirm", label: "Insurance Firm" },
        { key: "contactInfo", label: "Contact Info" },
        { key: "coverageAmount", label: "Coverage Amount" },
      ], propertyCasualty, setPropertyCasualty)}

      {renderTableSection("Unsecured Debts", [
        { key: "lenderContactInfo", label: "Lender Contact Info" },
        { key: "type", label: "Type" },
        { key: "balanceOutstanding", label: "Balance Outstanding" },
      ], unsecuredDebts, setUnsecuredDebts)}

      {renderTableSection("Debt Owed To You", [
        { key: "borrower", label: "Borrower" },
        { key: "contactInfo", label: "Contact Info" },
        { key: "notes", label: "Notes" },
        { key: "balanceOutstanding", label: "Balance Outstanding" },
      ], debtOwed, setDebtOwed)}

      {renderTableSection("Personal Advisors", [
        { key: "advisorType", label: "Advisor Type" },
        { key: "name", label: "Name" },
        { key: "firm", label: "Firm" },
        { key: "number", label: "Number" },
        { key: "email", label: "Email" },
      ], advisors, setAdvisors)}

      {renderTableSection("Business Interests", [
        { key: "businessContact", label: "Business Contact" },
        { key: "titling", label: "Titling" },
        { key: "ownershipPercent", label: "Ownership %" },
        { key: "entityType", label: "Entity Type" },
        { key: "successionAddressed", label: "Succession Addressed?" },
      ], businessInterests, setBusinessInterests)}

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
        <div className="flex justify-end">
          <Button onClick={handleSubmit} disabled={submitting || !submitterName.trim()} className="gap-2 bg-[#ffb500] hover:bg-[#2eb2ff] text-[#290a52] hover:text-white">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Submit Asset Inventory
          </Button>
        </div>
      </div>
    </div>
  )
}
