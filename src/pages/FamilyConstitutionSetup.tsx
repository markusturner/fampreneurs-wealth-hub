import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, CheckCircle, Save, FileText } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

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
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState<Record<string, any>>({});
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [isAutoSaving, setIsAutoSaving] = useState(false);

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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/documents')}
                className="gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                Back to Documents
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Family Constitution Setup</h1>
                <p className="text-muted-foreground">
                  Step {currentStep + 1} of {STEPS.length}: {STEPS[currentStep].title}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isAutoSaving && (
                <Badge variant="secondary" className="gap-2">
                  <Save className="h-3 w-3" />
                  Saving...
                </Badge>
              )}
              <Badge variant="outline">
                {Math.round(progress)}% Complete
              </Badge>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-4">
            <Progress value={progress} className="h-2" />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Progress */}
          <div className="lg:col-span-1">
            <Card className="sticky top-8">
              <CardHeader>
                <CardTitle>Progress</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {STEPS.map((step, index) => (
                  <div
                    key={step.id}
                    className={`flex items-center gap-3 p-2 rounded cursor-pointer transition-colors ${
                      index === currentStep
                        ? 'bg-primary/10 text-primary'
                        : completedSteps.has(index)
                        ? 'bg-green-500/10 text-green-600 hover:bg-green-500/20'
                        : 'text-muted-foreground hover:bg-muted'
                    }`}
                    onClick={() => goToStep(index)}
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
                    <div className="flex-1 text-sm">
                      <div className="font-medium">{step.title}</div>
                      <div className="text-xs opacity-70">{step.description}</div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <Card>
              <CardContent className="p-8">
                <CurrentStepComponent
                  data={data[STEPS[currentStep].id] || {}}
                  onDataChange={(stepData: any) => updateData(STEPS[currentStep].id, stepData)}
                  allData={data}
                />
                
                {/* Navigation */}
                <div className="flex justify-between mt-8 pt-8 border-t">
                  <Button
                    variant="outline"
                    onClick={prevStep}
                    disabled={currentStep === 0}
                    className="gap-2"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => navigate('/documents')}
                    >
                      Save & Exit
                    </Button>
                    
                    {currentStep === STEPS.length - 1 ? (
                      <Button onClick={handleComplete} className="gap-2">
                        Complete Setup
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button onClick={nextStep} className="gap-2">
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