import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, CheckCircle, Save, FileText, Menu } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

// Step Components
import { IdentityStep } from '@/components/constitution-setup/IdentityStep';
import { ValuesStep } from '@/components/constitution-setup/ValuesStep';
import { GovernanceStep } from '@/components/constitution-setup/GovernanceStep';
import { LeadershipStep } from '@/components/constitution-setup/LeadershipStep';
import { WealthStep } from '@/components/constitution-setup/WealthStep';
import { CommunicationStep } from '@/components/constitution-setup/CommunicationStep';
import { PhilanthropyStep } from '@/components/constitution-setup/PhilanthropyStep';
import { ReviewStep } from '@/components/constitution-setup/ReviewStep';

interface StepConfig {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  component: React.ComponentType<any>;
}

const STEPS: StepConfig[] = [
  {
    id: 'identity',
    title: 'Family Identity',
    description: 'Basic information and family crest',
    icon: <FileText className="h-4 w-4" />,
    component: IdentityStep
  },
  {
    id: 'values',
    title: 'Core Values',
    description: 'Mission, vision, and principles',
    icon: <CheckCircle className="h-4 w-4" />,
    component: ValuesStep
  },
  {
    id: 'governance',
    title: 'Governance Structure',
    description: 'Decision-making and policies',
    icon: <CheckCircle className="h-4 w-4" />,
    component: GovernanceStep
  },
  {
    id: 'leadership',
    title: 'Leadership & Succession',
    description: 'Roles and next generation',
    icon: <CheckCircle className="h-4 w-4" />,
    component: LeadershipStep
  },
  {
    id: 'wealth',
    title: 'Wealth Management',
    description: 'Financial strategies and education',
    icon: <CheckCircle className="h-4 w-4" />,
    component: WealthStep
  },
  {
    id: 'communication',
    title: 'Communication',
    description: 'Meetings and conflict resolution',
    icon: <CheckCircle className="h-4 w-4" />,
    component: CommunicationStep
  },
  {
    id: 'philanthropy',
    title: 'Legacy & Philanthropy',
    description: 'Giving back and family legacy',
    icon: <CheckCircle className="h-4 w-4" />,
    component: PhilanthropyStep
  },
  {
    id: 'review',
    title: 'Review & Complete',
    description: 'Final review of your constitution',
    icon: <CheckCircle className="h-4 w-4" />,
    component: ReviewStep
  }
];

export default function FamilyConstitutionSetup() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState<Record<string, any>>({});
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Load saved progress
  useEffect(() => {
    if (user?.id) {
      const savedData = localStorage.getItem(`constitution_setup_${user.id}`);
      if (savedData) {
        try {
          const parsed = JSON.parse(savedData);
          setData(parsed.data || {});
          setCompletedSteps(new Set(parsed.completedSteps || []));
          setCurrentStep(parsed.currentStep || 0);
        } catch (error) {
          console.error('Error loading saved data:', error);
        }
      }
    }
  }, [user?.id]);

  // Auto-save progress
  useEffect(() => {
    if (user?.id && Object.keys(data).length > 0) {
      setIsAutoSaving(true);
      const timer = setTimeout(() => {
        const saveData = {
          data,
          completedSteps: Array.from(completedSteps),
          currentStep,
          lastSaved: new Date().toISOString()
        };
        localStorage.setItem(`constitution_setup_${user.id}`, JSON.stringify(saveData));
        setIsAutoSaving(false);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [data, completedSteps, currentStep, user?.id]);

  const updateData = (stepId: string, stepData: any) => {
    setData(prev => ({
      ...prev,
      [stepId]: stepData
    }));
  };

  const markStepComplete = (stepIndex: number) => {
    setCompletedSteps(prev => new Set([...prev, stepIndex]));
  };

  const nextStep = () => {
    if (currentStep < STEPS.length - 1) {
      markStepComplete(currentStep);
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const goToStep = (stepIndex: number) => {
    setCurrentStep(stepIndex);
  };

  const handleComplete = () => {
    // Save to database and mark as complete
    if (user?.id) {
      localStorage.setItem(`governance_onboarding_complete_${user.id}`, 'true');
      toast.success('Family Constitution setup completed!');
      navigate('/documents');
    }
  };

  const progress = ((currentStep + 1) / STEPS.length) * 100;
  const CurrentStepComponent = STEPS[currentStep].component;

  const ProgressSidebar = () => (
    <Card>
      <CardHeader>
        <CardTitle className="text-base sm:text-lg">Progress</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {STEPS.map((step, index) => (
          <div
            key={step.id}
            className={`flex items-center gap-2 sm:gap-3 p-2 rounded cursor-pointer transition-colors ${
              index === currentStep
                ? 'bg-primary/10 text-primary'
                : completedSteps.has(index)
                ? 'bg-green-500/10 text-green-600 hover:bg-green-500/20'
                : 'text-muted-foreground hover:bg-muted'
            }`}
            onClick={() => {
              goToStep(index);
              setSheetOpen(false);
            }}
          >
            <div className={`flex-shrink-0 ${
              completedSteps.has(index) ? 'text-green-600' : ''
            }`}>
              {completedSteps.has(index) ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                step.icon
              )}
            </div>
            <div className="flex-1 text-xs sm:text-sm">
              <div className="font-medium truncate">{step.title}</div>
              <div className="text-xs opacity-70 truncate sm:block hidden">{step.description}</div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex flex-col gap-3 sm:gap-0 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 sm:gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/documents')}
                className="gap-1 sm:gap-2 px-2 sm:px-3"
              >
                <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Back to Documents</span>
                <span className="sm:hidden">Back</span>
              </Button>
              <div className="flex-1 min-w-0">
                <h1 className="text-lg sm:text-2xl font-bold truncate">Family Constitution Setup</h1>
                <p className="text-xs sm:text-sm text-muted-foreground truncate">
                  Step {currentStep + 1} of {STEPS.length}: {STEPS[currentStep].title}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 justify-between sm:justify-end">
              {isAutoSaving && (
                <Badge variant="secondary" className="gap-1 sm:gap-2 text-xs">
                  <Save className="h-3 w-3" />
                  <span className="hidden sm:inline">Saving...</span>
                  <span className="sm:hidden">...</span>
                </Badge>
              )}
              <Badge variant="outline" className="text-xs">
                {Math.round(progress)}%
              </Badge>
              {isMobile && (
                <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Menu className="h-4 w-4" />
                      Steps
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-[280px] sm:w-[350px]">
                    <ProgressSidebar />
                  </SheetContent>
                </Sheet>
              )}
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-3 sm:mt-4">
            <Progress value={progress} className="h-1.5 sm:h-2" />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 lg:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
          {/* Sidebar Progress - Hidden on mobile, shown in sheet */}
          {!isMobile && (
            <div className="lg:col-span-1">
              <div className="sticky top-8">
                <ProgressSidebar />
              </div>
            </div>
          )}

          {/* Main Content */}
          <div className="lg:col-span-3">
            <Card>
              <CardContent className="p-4 sm:p-6 lg:p-8">
                <CurrentStepComponent
                  data={data[STEPS[currentStep].id] || {}}
                  onDataChange={(stepData: any) => updateData(STEPS[currentStep].id, stepData)}
                  allData={data}
                />
                
                {/* Navigation */}
                <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-0 mt-6 sm:mt-8 pt-6 sm:pt-8 border-t">
                  <Button
                    variant="outline"
                    onClick={prevStep}
                    disabled={currentStep === 0}
                    className="gap-2 w-full sm:w-auto"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  
                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <Button
                      variant="outline"
                      onClick={() => navigate('/documents')}
                      className="w-full sm:w-auto"
                    >
                      Save & Exit
                    </Button>
                    
                    {currentStep === STEPS.length - 1 ? (
                      <Button onClick={handleComplete} className="gap-2 w-full sm:w-auto">
                        Complete Setup
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button onClick={nextStep} className="gap-2 w-full sm:w-auto">
                        Continue
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}