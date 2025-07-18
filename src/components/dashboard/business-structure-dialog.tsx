import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import { Building2, ArrowLeft, ArrowRight, CheckCircle, AlertTriangle, DollarSign, Users, FileText } from 'lucide-react'

interface BusinessStructureDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface FormData {
  // Basic LLC Information
  llcCount: string
  llcIndustries: string[]
  
  // Family Member Involvement
  workingWithFamily: string
  familyMemberCount: string
  familyMemberEntities: string
  familyEntityIndustries: string[]
  familyHiring: string
  
  // Children Involvement
  childrenInvolved: string
  childrenAges: string[]
  
  // Real Estate & Medical
  realEstate: string
  medicalExpenses: string
  
  // Business Operations
  legitimateBusiness: string
  doubleTaxationOk: string
  employeeBenefits: string
  
  // LLC Income Details
  llcIncomes: { [key: string]: string }
}

interface Recommendation {
  type: 'success' | 'warning' | 'info'
  title: string
  description: string
  actionItems?: string[]
}

const industries = [
  'Real Estate',
  'Technology',
  'Healthcare',
  'Finance',
  'Retail',
  'Manufacturing',
  'Consulting',
  'Construction',
  'Food & Beverage',
  'Transportation',
  'Education',
  'Entertainment',
  'Other'
]

export function BusinessStructureDialog({ open, onOpenChange }: BusinessStructureDialogProps) {
  const { toast } = useToast()
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState<FormData>({
    llcCount: '',
    llcIndustries: [],
    workingWithFamily: '',
    familyMemberCount: '',
    familyMemberEntities: '',
    familyEntityIndustries: [],
    familyHiring: '',
    childrenInvolved: '',
    childrenAges: [],
    realEstate: '',
    medicalExpenses: '',
    legitimateBusiness: '',
    doubleTaxationOk: '',
    employeeBenefits: '',
    llcIncomes: {}
  })
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [showResults, setShowResults] = useState(false)

  const totalSteps = 7

  const resetForm = () => {
    setFormData({
      llcCount: '',
      llcIndustries: [],
      workingWithFamily: '',
      familyMemberCount: '',
      familyMemberEntities: '',
      familyEntityIndustries: [],
      familyHiring: '',
      childrenInvolved: '',
      childrenAges: [],
      realEstate: '',
      medicalExpenses: '',
      legitimateBusiness: '',
      doubleTaxationOk: '',
      employeeBenefits: '',
      llcIncomes: {}
    })
    setStep(1)
    setShowResults(false)
    setRecommendations([])
  }

  const handleClose = () => {
    resetForm()
    onOpenChange(false)
  }

  const addIndustry = (industry: string, type: 'llc' | 'family') => {
    if (type === 'llc') {
      if (!formData.llcIndustries.includes(industry)) {
        setFormData(prev => ({
          ...prev,
          llcIndustries: [...prev.llcIndustries, industry]
        }))
      }
    } else {
      if (!formData.familyEntityIndustries.includes(industry)) {
        setFormData(prev => ({
          ...prev,
          familyEntityIndustries: [...prev.familyEntityIndustries, industry]
        }))
      }
    }
  }

  const removeIndustry = (industry: string, type: 'llc' | 'family') => {
    if (type === 'llc') {
      setFormData(prev => ({
        ...prev,
        llcIndustries: prev.llcIndustries.filter(i => i !== industry)
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        familyEntityIndustries: prev.familyEntityIndustries.filter(i => i !== industry)
      }))
    }
  }

  const addChildAge = (age: string) => {
    if (age && !formData.childrenAges.includes(age)) {
      setFormData(prev => ({
        ...prev,
        childrenAges: [...prev.childrenAges, age]
      }))
    }
  }

  const removeChildAge = (age: string) => {
    setFormData(prev => ({
      ...prev,
      childrenAges: prev.childrenAges.filter(a => a !== age)
    }))
  }

  const generateRecommendations = (): Recommendation[] => {
    const recs: Recommendation[] = []
    const llcCount = parseInt(formData.llcCount) || 0
    
    // F.L.I.P. Formula Comprehensive Structure Recommendation
    recs.push({
      type: 'success',
      title: 'The F.L.I.P. Formula™ - Family Legacy Inheritance Plan',
      description: 'Based on your responses, here is a comprehensive structure following The F.L.I.P. Formula for optimal family wealth building and tax optimization.',
      actionItems: [
        '1. Establish Family Trust as the foundational holding entity',
        '2. Create Tax-Exempt Trust for charitable giving and tax benefits',
        '3. Form Business Trust to hold operating companies and active investments',
        '4. Set up Private Foundation (PFF) as a Non-Profit Entity for philanthropic activities',
        '5. Structure Wyoming HC (SMLLC with S-Corp Status) for active business operations',
        '6. Create Wyoming PC (SMLLC) for passive investments and real estate',
        '7. Establish Operating Companies (OC #1, #2, #3) as SMLLCs - Foreign Entities for specific business ventures',
        '8. Form Management Companies (FMC I as SMLLC, FMC II as C-Corp) for business management',
        '9. Set up Real Estate Management Company (REMC as SMLLC) for property holdings',
        '10. Create Real Estate Holding Company (REHC as SMLLC - Foreign Entity) for investment properties'
      ]
    })
    
    // S-Corp Election Recommendations
    Object.entries(formData.llcIncomes).forEach(([llcIndex, income]) => {
      const annualIncome = parseFloat(income) || 0
      if (annualIncome > 50000) {
        recs.push({
          type: 'success',
          title: `S-Corp Election Recommended for LLC #${parseInt(llcIndex) + 1}`,
          description: `With $${annualIncome.toLocaleString()} in annual net income, electing S-Corp status can provide significant tax savings through payroll structuring.`,
          actionItems: [
            'File IRS Form 2553 within 75 days of LLC formation or within first 75 days of tax year',
            'Ensure LLC has an EIN (Employer Identification Number)',
            'Have all LLC members sign Form 2553',
            'File via mail or fax to IRS based on your location',
            'Work with a CPA for form accuracy and payroll compliance'
          ]
        })
      }
    })

    // C-Corp Recommendation for Medical Expenses
    if (formData.medicalExpenses === 'yes' && formData.doubleTaxationOk === 'yes') {
      recs.push({
        type: 'success',
        title: 'C-Corporation Structure Recommended',
        description: 'Given your high medical expenses and acceptance of double taxation, a C-Corp can provide full medical expense deductions and comprehensive employee benefits.',
        actionItems: [
          'Form a C-Corporation for medical expense deductions',
          'Set up employee benefit plans (health insurance, medical reimbursement)',
          'Structure W-2 compensation for family members',
          'Implement Employee Reimbursement Medical Plan (ERMP)'
        ]
      })
    }

    // Family Office Recommendation
    if (formData.legitimateBusiness === 'yes' && formData.workingWithFamily === 'yes') {
      recs.push({
        type: 'info',
        title: 'Family Office Structure',
        description: 'Consider establishing a formal family office structure to manage assets, trust coordination, and compliance across family entities.',
        actionItems: [
          'Establish a management company for family office operations',
          'Create clear governance structures and family employment policies',
          'Implement proper documentation and compliance procedures',
          'Set up centralized asset management and reporting'
        ]
      })
    }

    // Real Estate Recommendations
    if (formData.realEstate === 'yes') {
      recs.push({
        type: 'info',
        title: 'Real Estate Entity Structure',
        description: 'Separate LLCs for real estate holdings can provide liability protection and tax optimization.',
        actionItems: [
          'Form separate LLCs for each real estate property or property group',
          'Consider real estate professional status for tax benefits',
          'Implement proper property management structures',
          'Review depreciation and cost segregation opportunities'
        ]
      })
    }

    // Children Involvement Recommendations
    if (formData.childrenInvolved === 'yes' && formData.childrenAges.length > 0) {
      const minorChildren = formData.childrenAges.filter(age => parseInt(age) < 18)
      const adultChildren = formData.childrenAges.filter(age => parseInt(age) >= 18)

      if (minorChildren.length > 0) {
        recs.push({
          type: 'warning',
          title: 'Minor Children Employment Considerations',
          description: 'Special rules apply when employing minor children in family businesses.',
          actionItems: [
            'Ensure work is legitimate and age-appropriate',
            'Follow child labor laws and hour restrictions',
            'Maintain proper employment documentation',
            'Consider tax advantages of paying reasonable wages to children'
          ]
        })
      }

      if (adultChildren.length > 0) {
        recs.push({
          type: 'success',
          title: 'Adult Children Employment Opportunities',
          description: 'Adult children can be valuable employees and potentially owners in family entities.',
          actionItems: [
            'Develop clear job descriptions and compensation structures',
            'Consider gradual ownership transition planning',
            'Implement proper employment agreements',
            'Plan for succession and next-generation involvement'
          ]
        })
      }
    }

    // Employee Benefits Structure
    if (formData.employeeBenefits === 'yes') {
      recs.push({
        type: 'info',
        title: 'Employee Benefits Optimization',
        description: 'Structured employee benefits can provide tax advantages and attract quality team members.',
        actionItems: [
          'Implement health insurance and medical reimbursement plans',
          'Consider retirement plan options (401k, profit sharing)',
          'Set up fringe benefit programs',
          'Structure W-2 vs 1099 compensation appropriately'
        ]
      })
    }

    // General Compliance Recommendation
    recs.push({
      type: 'warning',
      title: 'Professional Consultation Required',
      description: 'These recommendations are general guidance. Professional consultation is essential for proper implementation.',
      actionItems: [
        'Consult with a qualified CPA for tax implications',
        'Work with a business attorney for entity formation and compliance',
        'Review recommendations with a financial advisor',
        'Ensure all structures comply with local and federal regulations'
      ]
    })

    return recs
  }

  const handleComplete = () => {
    const recs = generateRecommendations()
    setRecommendations(recs)
    setShowResults(true)
    
    toast({
      title: "Analysis Complete",
      description: "Your business structure recommendations are ready!"
    })
  }

  const nextStep = () => {
    if (step < totalSteps) {
      setStep(step + 1)
    } else {
      handleComplete()
    }
  }

  const prevStep = () => {
    if (step > 1) {
      setStep(step - 1)
    }
  }

  const canProceed = () => {
    switch (step) {
      case 1:
        return formData.llcCount !== ''
      case 2:
        return formData.workingWithFamily !== ''
      case 3:
        return formData.childrenInvolved !== ''
      case 4:
        return formData.realEstate !== '' && formData.medicalExpenses !== ''
      case 5:
        return formData.legitimateBusiness !== '' && formData.doubleTaxationOk !== ''
      case 6:
        return formData.employeeBenefits !== ''
      case 7:
        return true // Income step is optional for completion
      default:
        return false
    }
  }

  if (showResults) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Business Structure Recommendations
            </DialogTitle>
            <DialogDescription>
              Based on your responses, here are our tailored recommendations for your business structure.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {recommendations.map((rec, index) => (
              <Card key={index} className={`border-l-4 ${
                rec.type === 'success' ? 'border-l-green-500' :
                rec.type === 'warning' ? 'border-l-yellow-500' :
                'border-l-blue-500'
              }`}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    {rec.type === 'success' && <CheckCircle className="h-5 w-5 text-green-500" />}
                    {rec.type === 'warning' && <AlertTriangle className="h-5 w-5 text-yellow-500" />}
                    {rec.type === 'info' && <FileText className="h-5 w-5 text-blue-500" />}
                    {rec.title}
                  </CardTitle>
                  <CardDescription>{rec.description}</CardDescription>
                </CardHeader>
                {rec.actionItems && (
                  <CardContent>
                    <div className="space-y-2">
                      <p className="font-medium text-sm">Action Items:</p>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        {rec.actionItems.map((item, itemIndex) => (
                          <li key={itemIndex}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}

            <Card className="bg-muted/50">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-sm mb-2">Important Disclaimer</p>
                    <p className="text-sm text-muted-foreground">
                      These recommendations are for informational purposes only and do not constitute legal, tax, or financial advice. 
                      Always consult with qualified professionals including CPAs, attorneys, and financial advisors before implementing 
                      any business structure changes. Individual circumstances may require different approaches.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-2">
              <Button onClick={() => setShowResults(false)} variant="outline" className="flex-1">
                Back to Questions
              </Button>
              <Button onClick={handleClose} className="flex-1">
                Complete Analysis
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Business Structure Analysis
          </DialogTitle>
          <DialogDescription>
            Step {step} of {totalSteps} - Answer these questions to get personalized entity structure recommendations.
          </DialogDescription>
          <div className="w-full bg-muted rounded-full h-2 mt-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300" 
              style={{ width: `${(step / totalSteps) * 100}%` }}
            />
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="font-medium">LLC Information</h3>
              
              <div>
                <Label htmlFor="llcCount">How many LLCs do you have?</Label>
                <Input
                  id="llcCount"
                  type="number"
                  min="0"
                  value={formData.llcCount}
                  onChange={(e) => setFormData(prev => ({ ...prev, llcCount: e.target.value }))}
                  placeholder="Enter number of LLCs"
                />
              </div>

              {parseInt(formData.llcCount) > 0 && (
                <div>
                  <Label>What industries are your LLCs in?</Label>
                  <Select onValueChange={(value) => addIndustry(value, 'llc')}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select industries" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border">
                      {industries.map((industry) => (
                        <SelectItem key={industry} value={industry}>
                          {industry}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {formData.llcIndustries.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.llcIndustries.map((industry) => (
                        <Badge key={industry} variant="secondary" className="cursor-pointer">
                          {industry}
                          <button
                            onClick={() => removeIndustry(industry, 'llc')}
                            className="ml-1 text-xs"
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h3 className="font-medium">Family Involvement</h3>
              
              <div>
                <Label>Are you working with any family members?</Label>
                <RadioGroup 
                  value={formData.workingWithFamily} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, workingWithFamily: value }))}
                  className="mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="family-yes" className="data-[state=checked]:border-[#ffb500] data-[state=checked]:text-[#ffb500]" />
                    <Label htmlFor="family-yes" className={formData.workingWithFamily === 'yes' ? 'text-[#ffb500] font-medium' : ''}>Yes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="family-no" className="data-[state=checked]:border-[#ffb500] data-[state=checked]:text-[#ffb500]" />
                    <Label htmlFor="family-no" className={formData.workingWithFamily === 'no' ? 'text-[#ffb500] font-medium' : ''}>No</Label>
                  </div>
                </RadioGroup>
              </div>

              {formData.workingWithFamily === 'yes' && (
                <>
                  <div>
                    <Label htmlFor="familyMemberCount">How many family members are involved?</Label>
                    <Input
                      id="familyMemberCount"
                      type="number"
                      min="0"
                      value={formData.familyMemberCount}
                      onChange={(e) => setFormData(prev => ({ ...prev, familyMemberCount: e.target.value }))}
                      placeholder="Number of family members"
                    />
                  </div>

                  <div>
                    <Label htmlFor="familyMemberEntities">How many entities do they have?</Label>
                    <Input
                      id="familyMemberEntities"
                      type="number"
                      min="0"
                      value={formData.familyMemberEntities}
                      onChange={(e) => setFormData(prev => ({ ...prev, familyMemberEntities: e.target.value }))}
                      placeholder="Number of family member entities"
                    />
                  </div>

                  <div>
                    <Label>What industries are their entities in?</Label>
                    <Select onValueChange={(value) => addIndustry(value, 'family')}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select industries" />
                      </SelectTrigger>
                      <SelectContent className="bg-background border">
                        {industries.map((industry) => (
                          <SelectItem key={industry} value={industry}>
                            {industry}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    {formData.familyEntityIndustries.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {formData.familyEntityIndustries.map((industry) => (
                          <Badge key={industry} variant="secondary" className="cursor-pointer">
                            {industry}
                            <button
                              onClick={() => removeIndustry(industry, 'family')}
                              className="ml-1 text-xs"
                            >
                              ×
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <Label>Are they hiring or involving family in those entities?</Label>
                    <RadioGroup 
                      value={formData.familyHiring} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, familyHiring: value }))}
                      className="mt-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem 
                          value="yes" 
                          id="hiring-yes" 
                          className={formData.familyHiring === 'yes' ? 'border-[#ffb500] text-[#ffb500]' : ''}
                          style={formData.familyHiring === 'yes' ? { borderColor: '#ffb500' } : {}}
                        />
                        <Label 
                          htmlFor="hiring-yes"
                          className={formData.familyHiring === 'yes' ? 'text-[#ffb500] font-medium' : ''}
                        >
                          Yes
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem 
                          value="no" 
                          id="hiring-no"
                          className={formData.familyHiring === 'no' ? 'border-[#ffb500] text-[#ffb500]' : ''}
                          style={formData.familyHiring === 'no' ? { borderColor: '#ffb500' } : {}}
                        />
                        <Label 
                          htmlFor="hiring-no"
                          className={formData.familyHiring === 'no' ? 'text-[#ffb500] font-medium' : ''}
                        >
                          No
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                </>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h3 className="font-medium">Children Involvement</h3>
              
              <div>
                <Label>Do you or they have children involved in the business?</Label>
                <RadioGroup 
                  value={formData.childrenInvolved} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, childrenInvolved: value }))}
                  className="mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="children-yes" className="data-[state=checked]:border-[#ffb500] data-[state=checked]:text-[#ffb500]" />
                    <Label htmlFor="children-yes" className={formData.childrenInvolved === 'yes' ? 'text-[#ffb500] font-medium' : ''}>Yes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="children-no" className="data-[state=checked]:border-[#ffb500] data-[state=checked]:text-[#ffb500]" />
                    <Label htmlFor="children-no" className={formData.childrenInvolved === 'no' ? 'text-[#ffb500] font-medium' : ''}>No</Label>
                  </div>
                </RadioGroup>
              </div>

              {formData.childrenInvolved === 'yes' && (
                <div>
                  <Label>What are the ages of those children?</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      placeholder="Enter age"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          const target = e.target as HTMLInputElement
                          addChildAge(target.value)
                          target.value = ''
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={(e) => {
                        const input = (e.target as HTMLElement).parentElement?.querySelector('input') as HTMLInputElement
                        if (input?.value) {
                          addChildAge(input.value)
                          input.value = ''
                        }
                      }}
                    >
                      Add
                    </Button>
                  </div>
                  
                  {formData.childrenAges.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.childrenAges.map((age) => (
                        <Badge key={age} variant="secondary" className="cursor-pointer">
                          {age} years old
                          <button
                            onClick={() => removeChildAge(age)}
                            className="ml-1 text-xs"
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h3 className="font-medium">Real Estate & Medical Expenses</h3>
              
              <div>
                <Label>Do you own real estate or plan to?</Label>
                <RadioGroup 
                  value={formData.realEstate} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, realEstate: value }))}
                  className="mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="realestate-yes" className="data-[state=checked]:border-[#ffb500] data-[state=checked]:text-[#ffb500]" />
                    <Label htmlFor="realestate-yes" className={formData.realEstate === 'yes' ? 'text-[#ffb500] font-medium' : ''}>Yes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="realestate-no" className="data-[state=checked]:border-[#ffb500] data-[state=checked]:text-[#ffb500]" />
                    <Label htmlFor="realestate-no" className={formData.realEstate === 'no' ? 'text-[#ffb500] font-medium' : ''}>No</Label>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label>Do you or a family member incur more than $7,500 in unreimbursed medical expenses annually?</Label>
                <RadioGroup 
                  value={formData.medicalExpenses} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, medicalExpenses: value }))}
                  className="mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="medical-yes" className="data-[state=checked]:border-[#ffb500] data-[state=checked]:text-[#ffb500]" />
                    <Label htmlFor="medical-yes" className={formData.medicalExpenses === 'yes' ? 'text-[#ffb500] font-medium' : ''}>Yes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="medical-no" className="data-[state=checked]:border-[#ffb500] data-[state=checked]:text-[#ffb500]" />
                    <Label htmlFor="medical-no" className={formData.medicalExpenses === 'no' ? 'text-[#ffb500] font-medium' : ''}>No</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4">
              <h3 className="font-medium">Business Operations & Tax Structure</h3>
              
              <div>
                <Label>Do you operate a legitimate business or family office with a real purpose (managing assets, trust coordination, compliance, etc.)?</Label>
                <RadioGroup 
                  value={formData.legitimateBusiness} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, legitimateBusiness: value }))}
                  className="mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="legitimate-yes" className="data-[state=checked]:border-[#ffb500] data-[state=checked]:text-[#ffb500]" />
                    <Label htmlFor="legitimate-yes" className={formData.legitimateBusiness === 'yes' ? 'text-[#ffb500] font-medium' : ''}>Yes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="legitimate-no" className="data-[state=checked]:border-[#ffb500] data-[state=checked]:text-[#ffb500]" />
                    <Label htmlFor="legitimate-no" className={formData.legitimateBusiness === 'no' ? 'text-[#ffb500] font-medium' : ''}>No</Label>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label>Are you okay with double taxation due to the corporate tax benefits of having a C-Corp?</Label>
                <p className="text-sm text-muted-foreground mt-1 mb-2">
                  While C-Corps are subject to double taxation, they allow full deduction of medical expenses, insurance premiums, and enable strategic employee benefit planning.
                </p>
                <RadioGroup 
                  value={formData.doubleTaxationOk} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, doubleTaxationOk: value }))}
                  className="mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="doubletax-yes" className="data-[state=checked]:border-[#ffb500] data-[state=checked]:text-[#ffb500]" />
                    <Label htmlFor="doubletax-yes" className={formData.doubleTaxationOk === 'yes' ? 'text-[#ffb500] font-medium' : ''}>Yes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="doubletax-no" className="data-[state=checked]:border-[#ffb500] data-[state=checked]:text-[#ffb500]" />
                    <Label htmlFor="doubletax-no" className={formData.doubleTaxationOk === 'no' ? 'text-[#ffb500] font-medium' : ''}>No</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="space-y-4">
              <h3 className="font-medium">Employee Benefits</h3>
              
              <div>
                <Label>Are you looking to structure employee benefits (e.g., W-2 compensation, fringe benefits, ERMP)?</Label>
                <RadioGroup 
                  value={formData.employeeBenefits} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, employeeBenefits: value }))}
                  className="mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="benefits-yes" className="data-[state=checked]:border-[#ffb500] data-[state=checked]:text-[#ffb500]" />
                    <Label htmlFor="benefits-yes" className={formData.employeeBenefits === 'yes' ? 'text-[#ffb500] font-medium' : ''}>Yes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="benefits-no" className="data-[state=checked]:border-[#ffb500] data-[state=checked]:text-[#ffb500]" />
                    <Label htmlFor="benefits-no" className={formData.employeeBenefits === 'no' ? 'text-[#ffb500] font-medium' : ''}>No</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          )}

          {step === 7 && (
            <div className="space-y-4">
              <h3 className="font-medium">LLC Income Analysis</h3>
              <p className="text-sm text-muted-foreground">
                For each active operating LLC, please provide the annual NET income. This helps determine S-Corp election benefits.
              </p>
              
              {Array.from({ length: parseInt(formData.llcCount) || 0 }, (_, index) => (
                <div key={index}>
                  <Label htmlFor={`llc-income-${index}`}>
                    LLC #{index + 1} Annual NET Income ($)
                    {formData.llcIndustries[index] && ` - ${formData.llcIndustries[index]}`}
                  </Label>
                  <Input
                    id={`llc-income-${index}`}
                    type="number"
                    min="0"
                    step="1000"
                    value={formData.llcIncomes[index] || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      llcIncomes: {
                        ...prev.llcIncomes,
                        [index]: e.target.value
                      }
                    }))}
                    placeholder="Enter annual net income"
                  />
                  {parseFloat(formData.llcIncomes[index] || '0') > 50000 && (
                    <p className="text-sm text-green-600 mt-1">
                      ✓ S-Corp election recommended for tax savings
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-4">
          <Button 
            variant="outline" 
            onClick={prevStep}
            disabled={step === 1}
            className="flex-1"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>
          <Button 
            onClick={nextStep}
            disabled={!canProceed()}
            className="flex-1"
          >
            {step === totalSteps ? 'Generate Recommendations' : 'Next'}
            {step < totalSteps && <ArrowRight className="h-4 w-4 ml-2" />}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}