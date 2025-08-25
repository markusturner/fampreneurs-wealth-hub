import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Check, Circle, AlertCircle, Plus, X, Upload, Image } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface OnboardingData {
  // Identity & Core Documents
  constitutionName: string;
  familyConstitution: string;
  missionStatement: string;
  visionStatement: string;
  coreValues: string[];
  wealthPhilosophy: string;
  constitutionDate: string;
  primaryLanguage: string;
  jurisdiction: string;
  familyCrestUrl: string;
  crestUsageNotes: string;
  secretCodes: Array<{ code: string; definition: string }>;
  foundingStory: string;
  legacyMilestones: Array<{ year: string; note: string }>;
  longTermGoals: string;
  
  // Governance & Authority
  ownershipEligibility: string;
  quorumPercentage: number;
  eligibleVoters: string[];
  routineThreshold: number;
  majorThreshold: number;
  conflictResolution: string;
  amendmentProcess: string;
  corporateSealUrl: string;
  sealCustodian: { name: string; role: string };
  sealUsagePolicy: string;
  leadershipRoles: Array<{ title: string; duties: string }>;
  successorCriteria: { checklist: string[]; additional: string };
  transitionProtocol: string;
  emergencyContacts: Array<{ name: string; role: string; contact: string }>;
  familyCouncil: {
    members: Array<{ name: string; role: string; termStart: string; termEnd: string }>;
    cadence: string;
    responsibilities: string;
  };
  boardOfTrustees: {
    members: Array<{ name: string; role: string; termStart: string; termEnd: string }>;
    cadence: string;
    responsibilities: string;
  };
  committees: Array<{ name: string; scope: string; members: string[] }>;
  
  // Legacy & Development
  educationOverview: string;
  curriculumTracks: Array<{ name: string; objectives: string }>;
  participationGuidelines: string;
  philanthropyThesis: string;
  focusAreas: string[];
  grantmakingPolicy: string;
  meetingFramework: string;
  meetingCadence: string;
  notableDates: string[];
  minutesPolicy: string;
  awardTypes: Array<{ name: string; criteria: string }>;
  ceremonyNotes: string;
}

interface GovernanceOnboardingModalProps {
  isOpen: boolean;
  onComplete: () => void;
  userId: string;
}

const SECTIONS = [
  {
    id: 'identity',
    title: 'Identity & Core Documents',
    description: 'Define your family\'s foundation and values'
  },
  {
    id: 'governance',
    title: 'Governance & Authority',
    description: 'Establish decision-making structure and processes'
  },
  {
    id: 'legacy',
    title: 'Legacy & Development',
    description: 'Plan for future generations and impact'
  }
];

const CORE_VALUES_OPTIONS = [
  'Integrity', 'Excellence', 'Innovation', 'Stewardship', 'Respect',
  'Transparency', 'Accountability', 'Sustainability', 'Education', 'Service'
];

const FOCUS_AREAS_OPTIONS = [
  'Education', 'Healthcare', 'Environment', 'Arts & Culture', 'Community Development',
  'Social Justice', 'Economic Development', 'Research & Innovation', 'Youth Development'
];

export const GovernanceOnboardingModal: React.FC<GovernanceOnboardingModalProps> = ({
  isOpen,
  onComplete,
  userId
}) => {
  const [currentSection, setCurrentSection] = useState(0);
  const [data, setData] = useState<OnboardingData>({} as OnboardingData);
  const [isLoading, setIsLoading] = useState(false);
  const [showMissingItems, setShowMissingItems] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const { toast } = useToast();

  // Initialize with saved data
  useEffect(() => {
    if (isOpen && userId) {
      loadSavedData();
    }
  }, [isOpen, userId]);

  const loadSavedData = () => {
    try {
      const savedData = localStorage.getItem(`governance_onboarding_${userId}`);
      if (savedData) {
        setData(JSON.parse(savedData));
      }
    } catch (error) {
      console.error('Error loading saved data:', error);
    }
  };

  const saveData = (updatedData: Partial<OnboardingData>) => {
    const newData = { ...data, ...updatedData };
    setData(newData);
    
    try {
      localStorage.setItem(`governance_onboarding_${userId}`, JSON.stringify(newData));
      setLastSaved(new Date());
      toast({
        description: "Progress saved ✓",
        duration: 2000,
      });
    } catch (error) {
      console.error('Error saving data:', error);
      toast({
        title: "Save failed",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const getRequiredFields = () => {
    return {
      identity: [
        'constitutionName', 'familyConstitution', 'missionStatement', 'visionStatement', 'coreValues',
        'wealthPhilosophy', 'constitutionDate', 'primaryLanguage', 'familyCrestUrl', 'secretCodes'
      ],
      governance: [
        'ownershipEligibility', 'quorumPercentage', 'routineThreshold',
        'majorThreshold', 'conflictResolution', 'amendmentProcess',
        'corporateSealUrl', 'sealCustodian', 'sealUsagePolicy'
      ],
      legacy: [
        'educationOverview', 'curriculumTracks', 'philanthropyThesis', 'focusAreas',
        'grantmakingPolicy', 'meetingFramework', 'meetingCadence', 'notableDates', 'minutesPolicy'
      ]
    };
  };

  const getSectionProgress = () => {
    const required = getRequiredFields();
    return SECTIONS.map((section, index) => {
      const sectionKey = section.id as keyof typeof required;
      const requiredFields = required[sectionKey];
      const completedFields = requiredFields.filter(field => {
        const value = data[field as keyof OnboardingData];
        if (Array.isArray(value)) return value.length > 0;
        if (typeof value === 'object' && value !== null) {
          return Object.values(value).some(v => 
            Array.isArray(v) ? v.length > 0 : v !== '' && v !== undefined
          );
        }
        return value !== '' && value !== undefined && value !== null;
      });
      
      return {
        total: requiredFields.length,
        completed: completedFields.length,
        status: completedFields.length === 0 ? 'not-started' : 
                completedFields.length === requiredFields.length ? 'complete' : 'in-progress'
      };
    });
  };

  const getTotalProgress = () => {
    const progress = getSectionProgress();
    const totalRequired = progress.reduce((sum, p) => sum + p.total, 0);
    const totalCompleted = progress.reduce((sum, p) => sum + p.completed, 0);
    return { completed: totalCompleted, total: totalRequired };
  };

  const getMissingItems = () => {
    const required = getRequiredFields();
    const missing: { section: string; field: string; label: string }[] = [];
    
    Object.entries(required).forEach(([sectionKey, fields]) => {
      const sectionTitle = SECTIONS.find(s => s.id === sectionKey)?.title || sectionKey;
      
      fields.forEach(field => {
        const value = data[field as keyof OnboardingData];
        let isEmpty = false;
        
        if (Array.isArray(value)) {
          isEmpty = value.length === 0;
        } else if (typeof value === 'object' && value !== null) {
          isEmpty = !Object.values(value).some(v => 
            Array.isArray(v) ? v.length > 0 : v !== '' && v !== undefined
          );
        } else {
          isEmpty = value === '' || value === undefined || value === null;
        }
        
        if (isEmpty) {
          missing.push({
            section: sectionTitle,
            field,
            label: getFieldLabel(field)
          });
        }
      });
    });
    
    return missing;
  };

  const getFieldLabel = (field: string): string => {
    const labels: { [key: string]: string } = {
      constitutionName: 'Constitution Name',
      familyConstitution: 'Family Constitution',
      missionStatement: 'Mission Statement',
      visionStatement: 'Vision Statement',
      coreValues: 'Core Values',
      wealthPhilosophy: 'Wealth Philosophy',
      constitutionDate: 'Constitution Effective Date',
      primaryLanguage: 'Primary Language',
      familyCrestUrl: 'Family Crest',
      secretCodes: 'Family Secret Codes',
      ownershipEligibility: 'Ownership Eligibility',
      quorumPercentage: 'Quorum Percentage',
      eligibleVoters: 'Eligible Voters',
      routineThreshold: 'Routine Decision Threshold',
      majorThreshold: 'Major Decision Threshold',
      conflictResolution: 'Conflict Resolution Process',
      amendmentProcess: 'Amendment Process',
      corporateSealUrl: 'Corporate Seal',
      sealCustodian: 'Seal Custodian',
      sealUsagePolicy: 'Seal Usage Policy',
      leadershipRoles: 'Leadership Roles',
      successorCriteria: 'Successor Criteria',
      transitionProtocol: 'Transition Protocol',
      emergencyContacts: 'Emergency Contacts',
      familyCouncil: 'Family Council',
      boardOfTrustees: 'Board of Trustees',
      educationOverview: 'Education Program Overview',
      curriculumTracks: 'Curriculum Tracks',
      philanthropyThesis: 'Philanthropy Impact Thesis',
      focusAreas: 'Focus Areas',
      grantmakingPolicy: 'Grantmaking Policy',
      meetingFramework: 'Meeting Framework',
      meetingCadence: 'Meeting Cadence',
      notableDates: 'Notable Dates',
      minutesPolicy: 'Minutes Policy'
    };
    return labels[field] || field;
  };

  const canContinue = () => {
    const currentSectionId = SECTIONS[currentSection].id;
    const required = getRequiredFields()[currentSectionId as keyof ReturnType<typeof getRequiredFields>];
    
    return required.every(field => {
      const value = data[field as keyof OnboardingData];
      if (Array.isArray(value)) return value.length > 0;
      if (typeof value === 'object' && value !== null) {
        return Object.values(value).some(v => 
          Array.isArray(v) ? v.length > 0 : v !== '' && v !== undefined
        );
      }
      return value !== '' && value !== undefined && value !== null;
    });
  };

  const handleFileUpload = async (file: File, type: 'crest' | 'seal') => {
    if (!file || !userId) return;

    // Validate file type
    const allowedTypes = ['image/png', 'image/svg+xml', 'image/jpeg'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload PNG, SVG, or JPG files only",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload files smaller than 10MB",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${type}_${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('governance-assets')
        .upload(fileName, file);

      if (error) {
        throw error;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('governance-assets')
        .getPublicUrl(fileName);

      // Save URL to data
      if (type === 'crest') {
        saveData({ familyCrestUrl: publicUrl });
      } else {
        saveData({ corporateSealUrl: publicUrl });
      }

      toast({
        title: "Upload successful",
        description: `${type === 'crest' ? 'Family crest' : 'Corporate seal'} uploaded successfully`,
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = () => {
    const missing = getMissingItems();
    if (missing.length > 0) {
      setShowMissingItems(true);
      return;
    }

    try {
      localStorage.setItem(`governance_onboarding_complete_${userId}`, 'true');
      localStorage.setItem(`governance_onboarding_${userId}`, JSON.stringify(data));
      
      onComplete();
      toast({
        title: "Governance & Legacy is ready!",
        description: "Your identity, rules, and legacy systems are in place.",
      });
    } catch (error) {
      console.error('Error completing onboarding:', error);
      toast({
        title: "Error",
        description: "Failed to complete setup. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleFinishLater = () => {
    saveData({});
    onComplete();
  };

  const renderProgressSidebar = () => {
    const progress = getSectionProgress();
    
    return (
      <div className="w-80 border-r bg-muted/20 p-6 overflow-y-auto">
        <div className="space-y-6">
          <div>
            <h3 className="font-semibold mb-2">Progress</h3>
            <div className="space-y-2">
              <Progress value={(getTotalProgress().completed / getTotalProgress().total) * 100} className="h-2" />
              <p className="text-sm text-muted-foreground">
                Completed {getTotalProgress().completed} of {getTotalProgress().total} sections
              </p>
            </div>
          </div>
          
          <div>
            <h3 className="font-semibold mb-3">Sections</h3>
            <div className="space-y-2">
              {SECTIONS.map((section, index) => {
                const sectionProgress = progress[index];
                const Icon = sectionProgress.status === 'complete' ? Check :
                           sectionProgress.status === 'in-progress' ? AlertCircle : Circle;
                
                return (
                  <div
                    key={section.id}
                    className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                      currentSection === index ? 'bg-primary/10 border border-primary/20' : 'hover:bg-muted/50'
                    }`}
                    onClick={() => setCurrentSection(index)}
                  >
                    <Icon className={`h-4 w-4 ${
                      sectionProgress.status === 'complete' ? 'text-green-600' :
                      sectionProgress.status === 'in-progress' ? 'text-yellow-600' : 'text-muted-foreground'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{section.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {sectionProgress.completed}/{sectionProgress.total} complete
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          {lastSaved && (
            <div className="text-xs text-muted-foreground">
              Last saved: {lastSaved.toLocaleTimeString()}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderIdentitySection = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-1">Identity & Core Documents</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Add mission, vision, and core values that guide stewardship.
        </p>
      </div>

      <div className="grid gap-6">
        <div>
          <Label htmlFor="constitutionName">Constitution Name *</Label>
          <Input
            id="constitutionName"
            value={data.constitutionName || ''}
            onChange={(e) => saveData({ constitutionName: e.target.value })}
            placeholder="e.g., The Smith Family Constitution"
            className="font-medium"
          />
        </div>

        <div>
          <Label htmlFor="familyConstitution">Family Preamble *</Label>
          <p className="text-sm text-muted-foreground mt-1 mb-3">
            Your family preamble is the opening statement that establishes your family's identity and purpose as wealth stewards. 
            It should capture: <strong>your family's origin story</strong> (how you came to be), <strong>core beliefs about wealth</strong> 
            (responsibility vs. privilege), <strong>commitment to future generations</strong> (preparing successors), and 
            <strong>guiding principles</strong> (integrity, service, stewardship). Example: "We, the [Family Name], 
            united by shared values and committed to responsible stewardship, establish this constitution to guide our family 
            enterprise across generations, ensuring our wealth serves both family prosperity and societal good."
          </p>
          <Textarea
            id="familyConstitution"
            value={data.familyConstitution || ''}
            onChange={(e) => saveData({ familyConstitution: e.target.value })}
            placeholder="We, the [Family Name], united by shared values and committed to responsible stewardship..."
            className="min-h-32"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="missionStatement">Mission Statement *</Label>
            <Input
              id="missionStatement"
              value={data.missionStatement || ''}
              onChange={(e) => saveData({ missionStatement: e.target.value })}
              placeholder="Our purpose and reason for being..."
              maxLength={200}
            />
          </div>
          <div>
            <Label htmlFor="primaryLanguage">Primary Language *</Label>
            <Select
              value={data.primaryLanguage || ''}
              onValueChange={(value) => saveData({ primaryLanguage: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="english">English</SelectItem>
                <SelectItem value="spanish">Spanish</SelectItem>
                <SelectItem value="french">French</SelectItem>
                <SelectItem value="german">German</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="visionStatement">Vision Statement *</Label>
          <Textarea
            id="visionStatement"
            value={data.visionStatement || ''}
            onChange={(e) => saveData({ visionStatement: e.target.value })}
            placeholder="Our aspirational future and long-term goals..."
            maxLength={500}
          />
        </div>

        <div>
          <Label>Core Values * (select at least 3)</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {CORE_VALUES_OPTIONS.map((value) => (
              <Badge
                key={value}
                variant={data.coreValues?.includes(value) ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => {
                  const current = data.coreValues || [];
                  const updated = current.includes(value)
                    ? current.filter(v => v !== value)
                    : [...current, value];
                  saveData({ coreValues: updated });
                }}
              >
                {value}
              </Badge>
            ))}
          </div>
          
          <div className="mt-3">
            <Label htmlFor="customCoreValue">Add Custom Core Value</Label>
            <div className="flex gap-2 mt-1">
              <Input
                id="customCoreValue"
                placeholder="Enter a custom core value"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                    const customValue = e.currentTarget.value.trim();
                    const current = data.coreValues || [];
                    if (!current.includes(customValue)) {
                      saveData({ coreValues: [...current, customValue] });
                    }
                    e.currentTarget.value = '';
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={(e) => {
                  const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                  const customValue = input.value.trim();
                  if (customValue) {
                    const current = data.coreValues || [];
                    if (!current.includes(customValue)) {
                      saveData({ coreValues: [...current, customValue] });
                    }
                    input.value = '';
                  }
                }}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {data.coreValues && data.coreValues.length > 0 && (
            <div className="mt-3">
              <Label>Selected Values:</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {data.coreValues.map((value) => (
                  <Badge
                    key={value}
                    variant="default"
                    className="cursor-pointer"
                    onClick={() => {
                      const updated = data.coreValues.filter(v => v !== value);
                      saveData({ coreValues: updated });
                    }}
                  >
                    {value}
                    <X className="h-3 w-3 ml-1" />
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        <div>
          <Label htmlFor="wealthPhilosophy">Wealth Philosophy / Stewardship Principles *</Label>
          <Textarea
            id="wealthPhilosophy"
            value={data.wealthPhilosophy || ''}
            onChange={(e) => saveData({ wealthPhilosophy: e.target.value })}
            placeholder="How we view and manage our wealth responsibilities..."
            maxLength={300}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="constitutionDate">Constitution Effective Date *</Label>
            <Input
              id="constitutionDate"
              type="date"
              value={data.constitutionDate || ''}
              onChange={(e) => saveData({ constitutionDate: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="jurisdiction">Jurisdiction / Governing Law</Label>
            <Input
              id="jurisdiction"
              value={data.jurisdiction || ''}
              onChange={(e) => saveData({ jurisdiction: e.target.value })}
              placeholder="e.g., Delaware, USA"
            />
          </div>
        </div>

        <div>
          <Label>Family Crest *</Label>
          {data.familyCrestUrl ? (
            <div className="space-y-3">
              <div className="border rounded-lg p-4 bg-muted/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Image className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-medium">Family crest uploaded</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => saveData({ familyCrestUrl: '' })}
                  >
                    Remove
                  </Button>
                </div>
                <img 
                  src={data.familyCrestUrl} 
                  alt="Family Crest" 
                  className="mt-3 max-w-32 max-h-32 object-contain rounded border"
                />
              </div>
            </div>
          ) : (
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
              <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground mb-3">
                Upload PNG or SVG (min 512x512, max 10MB)
              </p>
              <Input
                type="file"
                accept="image/png,image/svg+xml,image/jpeg"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleFileUpload(file, 'crest');
                    e.target.value = '';
                  }
                }}
                className="hidden"
                id="crest-upload"
                disabled={isLoading}
              />
              <Button 
                variant="outline" 
                asChild
                disabled={isLoading}
              >
                <label htmlFor="crest-upload" className="cursor-pointer">
                  {isLoading ? 'Uploading...' : 'Choose File'}
                </label>
              </Button>
            </div>
          )}
        </div>

        <div>
          <Label>Family Secret Codes * (minimum 5)</Label>
          <p className="text-sm text-muted-foreground mb-3">
            Create 5–12 short mantras that shape daily behavior and decisions.
          </p>
          <div className="space-y-3">
            {(data.secretCodes || []).map((item, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={item.code}
                  onChange={(e) => {
                    const updated = [...(data.secretCodes || [])];
                    updated[index] = { ...item, code: e.target.value };
                    saveData({ secretCodes: updated });
                  }}
                  placeholder="Code/Mantra"
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    const updated = (data.secretCodes || []).filter((_, i) => i !== index);
                    saveData({ secretCodes: updated });
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              onClick={() => {
                const updated = [...(data.secretCodes || []), { code: '', definition: '' }];
                saveData({ secretCodes: updated });
              }}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Code
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderGovernanceSection = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-1">Governance & Authority</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Establish decision-making structure and processes.
        </p>
      </div>

      <div className="grid gap-6">
        <div>
          <Label htmlFor="ownershipEligibility">Ownership/Participation Eligibility *</Label>
          <p className="text-sm text-muted-foreground mt-1 mb-3">
            Who in your family can be part of this? Think about: <strong>family members</strong> (kids, grandkids, spouses), 
            <strong>how old they need to be</strong> (like 18 or 21), <strong>where they live</strong>, 
            <strong>if they finished school</strong>, <strong>if they act responsibly</strong>, and <strong>who says yes or no</strong>. 
            Example: "All children and grandchildren of [Your Name], plus spouses married for 2+ years, 
            must be 21 years old, show they can handle money well, and get approval from the family leaders."
          </p>
          <Textarea
            id="ownershipEligibility"
            value={data.ownershipEligibility || ''}
            onChange={(e) => saveData({ ownershipEligibility: e.target.value })}
            placeholder="Who can participate and under what conditions..."
            maxLength={300}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="quorumPercentage">How Many People Need to Show Up * (1-100)</Label>
            <p className="text-xs text-muted-foreground mb-2">
              How many family members need to be at a meeting before you can make decisions? (like 50% means half the family)
            </p>
            <Input
              id="quorumPercentage"
              type="number"
              min="1"
              max="100"
              value={data.quorumPercentage || ''}
              onChange={(e) => saveData({ quorumPercentage: parseInt(e.target.value) })}
              placeholder="50"
            />
          </div>
          <div>
            <Label htmlFor="routineThreshold">Easy Decisions Need * (%)</Label>
            <p className="text-xs text-muted-foreground mb-2">
              How many people need to agree for small decisions? (like paying bills or normal stuff)
            </p>
            <Input
              id="routineThreshold"
              type="number"
              min="1"
              max="100"
              value={data.routineThreshold || ''}
              onChange={(e) => saveData({ routineThreshold: parseInt(e.target.value) })}
              placeholder="51"
            />
          </div>
          <div>
            <Label htmlFor="majorThreshold">Big Decisions Need * (%)</Label>
            <p className="text-xs text-muted-foreground mb-2">
              How many people need to agree for huge decisions? (like selling a house or changing family rules)
            </p>
            <Input
              id="majorThreshold"
              type="number"
              min="1"
              max="100"
              value={data.majorThreshold || ''}
              onChange={(e) => saveData({ majorThreshold: parseInt(e.target.value) })}
              placeholder="75"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="conflictResolution">Conflict Resolution Process *</Label>
          <Textarea
            id="conflictResolution"
            value={data.conflictResolution || ''}
            onChange={(e) => saveData({ conflictResolution: e.target.value })}
            placeholder="How disputes and disagreements are handled..."
            maxLength={400}
          />
        </div>

        <div>
          <Label htmlFor="amendmentProcess">How to Change the Family Rules *</Label>
          <p className="text-sm text-muted-foreground mt-1 mb-3">
            Sometimes your family might need to change these rules later. Write down how to do that. 
            Think about: <strong>who can suggest changes</strong> (any family member or just leaders?), 
            <strong>how many people need to agree</strong> (like 75% of the family), <strong>how much time to think about it</strong> 
            (like 30 days), and <strong>how to vote on it</strong>. 
            Example: "Any family member can suggest rule changes. We'll talk about it for 30 days, then 75% of 
            adult family members must vote yes to make the change official."
          </p>
          <Textarea
            id="amendmentProcess"
            value={data.amendmentProcess || ''}
            onChange={(e) => saveData({ amendmentProcess: e.target.value })}
            placeholder="How can you change these family rules in the future..."
            maxLength={300}
          />
        </div>

        <div>
          <Label>Corporate Seal *</Label>
          {data.corporateSealUrl ? (
            <div className="space-y-3">
              <div className="border rounded-lg p-4 bg-muted/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Image className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-medium">Corporate seal uploaded</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => saveData({ corporateSealUrl: '' })}
                  >
                    Remove
                  </Button>
                </div>
                <img 
                  src={data.corporateSealUrl} 
                  alt="Corporate Seal" 
                  className="mt-3 max-w-32 max-h-32 object-contain rounded border"
                />
              </div>
            </div>
          ) : (
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
              <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground mb-3">
                Upload the official seal used to certify resolutions and trust documents
              </p>
              <Input
                type="file"
                accept="image/png,image/svg+xml,image/jpeg"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleFileUpload(file, 'seal');
                    e.target.value = '';
                  }
                }}
                className="hidden"
                id="seal-upload"
                disabled={isLoading}
              />
              <Button 
                variant="outline" 
                asChild
                disabled={isLoading}
              >
                <label htmlFor="seal-upload" className="cursor-pointer">
                  {isLoading ? 'Uploading...' : 'Choose File'}
                </label>
              </Button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="sealCustodianName">Who Takes Care of the Seal *</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Who in your family will keep the seal safe? This person is like the "keeper" of your family's official stamp.
            </p>
            <Input
              id="sealCustodianName"
              value={data.sealCustodian?.name || ''}
              onChange={(e) => saveData({ 
                sealCustodian: { ...data.sealCustodian, name: e.target.value } 
              })}
              placeholder="Full name"
            />
          </div>
          <div>
            <Label htmlFor="sealCustodianRole">What Job Do They Have *</Label>
            <p className="text-xs text-muted-foreground mb-2">
              What's their role in the family? Like "Family Leader," "Mom," "Oldest Son," or "Family Lawyer."
            </p>
            <Input
              id="sealCustodianRole"
              value={data.sealCustodian?.role || ''}
              onChange={(e) => saveData({ 
                sealCustodian: { ...data.sealCustodian, role: e.target.value } 
              })}
              placeholder="Title/Position"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="sealUsagePolicy">When Do You Use the Seal *</Label>
          <p className="text-sm text-muted-foreground mt-1 mb-3">
            When should your family use this special stamp? Think about <strong>important papers</strong> 
            (like family contracts or trust papers), <strong>official family decisions</strong> (like voting results), 
            and <strong>special certificates</strong> (like when someone joins the family business). 
            Example: "We use our seal on all family meeting minutes, trust documents, family business contracts, 
            and official letters to banks or lawyers. Only the seal keeper can use it, and they must keep a record 
            of every time it's used."
          </p>
          <Textarea
            id="sealUsagePolicy"
            value={data.sealUsagePolicy || ''}
            onChange={(e) => saveData({ sealUsagePolicy: e.target.value })}
            placeholder="When and how your family uses the official seal..."
            maxLength={250}
          />
        </div>
      </div>
    </div>
  );

  const renderLegacySection = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-1">Legacy & Development</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Plan for future generations and impact.
        </p>
      </div>

      <div className="grid gap-6">
        <div>
          <Label htmlFor="educationOverview">How You'll Teach Your Family *</Label>
          <p className="text-sm text-muted-foreground mt-1 mb-3">
            How will you teach your kids and grandkids about money, family values, and being responsible? 
            Think about <strong>what they need to learn</strong> (like how to save money, family history, helping others), 
            <strong>when they start learning</strong> (maybe at age 10 or 16), and <strong>how you'll teach them</strong> 
            (family meetings, classes, working together). 
            Example: "Starting at age 12, kids learn about our family history and values. At 16, they learn about 
            money and budgeting. At 18, they can help choose which charities we support. We have monthly family 
            learning sessions and summer workshops."
          </p>
          <Textarea
            id="educationOverview"
            value={data.educationOverview || ''}
            onChange={(e) => saveData({ educationOverview: e.target.value })}
            placeholder="How you'll teach your kids about money, family values, and responsibility..."
            maxLength={300}
          />
        </div>

        <div>
          <Label>Different Learning Topics * (minimum 2)</Label>
          <p className="text-sm text-muted-foreground mt-1 mb-3">
            What different subjects will you teach your family members? Think of these like school classes. 
            Each topic should have <strong>a name</strong> (like "Money Basics" or "Family History") and 
            <strong>what they'll learn</strong> (the goals for that class). You need at least 2 different topics.
            Examples: "Money Basics" (learn to save and spend wisely), "Family Values" (learn what's important to our family), 
            "Helping Others" (learn about giving back to the community).
          </p>
          <div className="space-y-3">
            {(data.curriculumTracks || []).map((track, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <Input
                  value={track.name}
                  onChange={(e) => {
                    const updated = [...(data.curriculumTracks || [])];
                    updated[index] = { ...track, name: e.target.value };
                    saveData({ curriculumTracks: updated });
                  }}
                  placeholder="Track name"
                />
                <div className="flex gap-2">
                  <Input
                    value={track.objectives}
                    onChange={(e) => {
                      const updated = [...(data.curriculumTracks || [])];
                      updated[index] = { ...track, objectives: e.target.value };
                      saveData({ curriculumTracks: updated });
                    }}
                    placeholder="Learning objectives"
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      const updated = (data.curriculumTracks || []).filter((_, i) => i !== index);
                      saveData({ curriculumTracks: updated });
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            <Button
              variant="outline"
              onClick={() => {
                const updated = [...(data.curriculumTracks || []), { name: '', objectives: '' }];
                saveData({ curriculumTracks: updated });
              }}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Track
            </Button>
          </div>
        </div>

        <div>
          <Label htmlFor="philanthropyThesis">How Your Family Helps Others *</Label>
          <p className="text-sm text-muted-foreground mt-1 mb-3">
            How does your family want to help make the world better? Think about <strong>what problems you care about</strong> 
            (like hungry kids, sick people, protecting animals), <strong>why these are important to your family</strong>, 
            and <strong>how you want to help</strong> (giving money, volunteering time, teaching others). 
            Example: "Our family believes everyone should have enough food and a good education. We help by donating 
            to food banks and schools, volunteering at soup kitchens, and teaching other kids about helping their neighbors."
          </p>
          <Textarea
            id="philanthropyThesis"
            value={data.philanthropyThesis || ''}
            onChange={(e) => saveData({ philanthropyThesis: e.target.value })}
            placeholder="How your family wants to help make the world better..."
            maxLength={300}
          />
        </div>

        <div>
          <Label>Focus Areas * (select at least 3)</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {FOCUS_AREAS_OPTIONS.map((area) => (
              <Badge
                key={area}
                variant={data.focusAreas?.includes(area) ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => {
                  const current = data.focusAreas || [];
                  const updated = current.includes(area)
                    ? current.filter(a => a !== area)
                    : [...current, area];
                  saveData({ focusAreas: updated });
                }}
              >
                {area}
              </Badge>
            ))}
          </div>
        </div>

        <div>
          <Label htmlFor="grantmakingPolicy">How You Decide Who Gets Help *</Label>
          <p className="text-sm text-muted-foreground mt-1 mb-3">
            How does your family choose who to help with money or time? Think about <strong>what kind of groups you like</strong> 
            (schools, hospitals, animal shelters), <strong>how you check if they're good</strong> (do they really help people?), 
            <strong>how much you give</strong> (like $100 or $1000), and <strong>how often</strong> (every month or once a year). 
            Example: "We help local schools and food banks. We visit them first to make sure they really help people. 
            We give $500 every 3 months to groups that show us exactly how our money helps kids and families."
          </p>
          <Textarea
            id="grantmakingPolicy"
            value={data.grantmakingPolicy || ''}
            onChange={(e) => saveData({ grantmakingPolicy: e.target.value })}
            placeholder="How your family decides who to help and how much to give..."
            maxLength={300}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="meetingFramework">Meeting Framework *</Label>
            <Select
              value={data.meetingFramework || ''}
              onValueChange={(value) => saveData({ meetingFramework: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select framework" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5-level">5-Level Meeting Model</SelectItem>
                <SelectItem value="custom">Custom Framework</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="meetingCadence">Meeting Cadence *</Label>
            <Select
              value={data.meetingCadence || ''}
              onValueChange={(value) => saveData({ meetingCadence: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select frequency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
                <SelectItem value="semi-annual">Semi-Annual</SelectItem>
                <SelectItem value="annual">Annual</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="minutesPolicy">How You Keep Meeting Records *</Label>
          <p className="text-sm text-muted-foreground mt-1 mb-3">
            How will you remember what happened in your family meetings? Think about <strong>who writes things down</strong> 
            (maybe the oldest kid or a parent), <strong>what gets written</strong> (big decisions, who was there, what was discussed), 
            and <strong>where you keep these notes</strong> (in a special folder, on the computer, in a safe place). 
            Example: "Mom writes down what we talk about in each meeting. We keep notes about who came, what decisions 
            we made, and any important family news. All meeting notes go in our family binder that we keep in the office."
          </p>
          <Textarea
            id="minutesPolicy"
            value={data.minutesPolicy || ''}
            onChange={(e) => saveData({ minutesPolicy: e.target.value })}
            placeholder="How you'll write down and save what happens in family meetings..."
            maxLength={200}
          />
        </div>
      </div>
    </div>
  );

  const renderMissingItemsSummary = () => {
    const missing = getMissingItems();
    
    return (
      <Card className="border-orange-200 bg-orange-50">
        <CardHeader>
          <CardTitle className="text-orange-800">
            You're almost there—complete these to finish setup
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(
              missing.reduce((acc, item) => {
                if (!acc[item.section]) acc[item.section] = [];
                acc[item.section].push(item);
                return acc;
              }, {} as Record<string, typeof missing>)
            ).map(([section, items]) => (
              <div key={section}>
                <h4 className="font-semibold text-orange-800 mb-2">{section}</h4>
                <ul className="space-y-1">
                  {items.map((item) => (
                    <li key={item.field} className="flex items-center justify-between">
                      <span className="text-sm">{item.label}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const sectionIndex = SECTIONS.findIndex(s => s.title === section);
                          if (sectionIndex !== -1) {
                            setCurrentSection(sectionIndex);
                            setShowMissingItems(false);
                          }
                        }}
                      >
                        Go to field
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (!isOpen) return null;

  const isLastSection = currentSection === SECTIONS.length - 1;
  const totalProgress = getTotalProgress();
  const isComplete = totalProgress.completed === totalProgress.total;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleFinishLater(); }}>
      <DialogContent
        className="max-w-[95vw] md:max-w-7xl h-[90dvh] p-0"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <div className="flex h-full min-h-0">
          {renderProgressSidebar()}
          
          <div className="flex-1 flex flex-col min-h-0">
            <DialogHeader className="p-6 border-b flex-shrink-0">
              <DialogTitle className="text-2xl">Set Up Governance & Legacy</DialogTitle>
              <p className="text-muted-foreground">
                Define who you are, how you decide, and how the legacy endures.
              </p>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto p-6 min-h-0">
              {showMissingItems ? (
                <div className="space-y-6">
                  {renderMissingItemsSummary()}
                  <div className="flex gap-3">
                    <Button onClick={() => setShowMissingItems(false)}>
                      Continue Editing
                    </Button>
                  </div>
                </div>
              ) : currentSection === 0 ? (
                renderIdentitySection()
              ) : currentSection === 1 ? (
                renderGovernanceSection()
              ) : (
                renderLegacySection()
              )}
            </div>

            <div className="border-t p-6 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex gap-3">
                  {currentSection > 0 && !showMissingItems && (
                    <Button
                      variant="outline"
                      onClick={() => setCurrentSection(currentSection - 1)}
                    >
                      Back
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={handleFinishLater}
                  >
                    Finish Later
                  </Button>
                </div>

                <div className="flex gap-3">
                  {!isLastSection && !showMissingItems ? (
                    <Button
                      onClick={() => setCurrentSection(currentSection + 1)}
                      disabled={!canContinue()}
                    >
                      Continue
                    </Button>
                  ) : (
                    <Button
                      onClick={handleComplete}
                      disabled={!isComplete}
                    >
                      Complete Setup
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};