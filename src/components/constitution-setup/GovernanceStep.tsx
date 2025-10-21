import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Scale, Users, Gavel, FileCheck } from 'lucide-react';

interface GovernanceStepProps {
  data: {
    decisionMaking?: string;
    votingProcess?: string;
    meetingFrequency?: string;
    conflictResolution?: string;
    employmentPolicy?: string;
    dividentPolicy?: string;
  };
  onDataChange: (data: any) => void;
  allData: Record<string, any>;
}

export function GovernanceStep({ data, onDataChange }: GovernanceStepProps) {
  const handleChange = (field: string, value: string) => {
    onDataChange({
      ...data,
      [field]: value
    });
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold mb-2">Governance Structure</h2>
        <p className="text-base sm:text-lg text-muted-foreground">
          Establish how your family will make decisions, resolve conflicts, and govern itself.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Gavel className="h-4 w-4 sm:h-5 sm:w-5" />
              Decision Making Process
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm sm:text-base">How will major family decisions be made?</Label>
              <RadioGroup 
                value={data.decisionMaking || ''} 
                onValueChange={(value) => handleChange('decisionMaking', value)}
                className="mt-2 space-y-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="consensus" id="consensus" />
                  <Label htmlFor="consensus" className="text-sm sm:text-base font-normal">Consensus (everyone agrees)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="majority" id="majority" />
                  <Label htmlFor="majority" className="text-sm sm:text-base font-normal">Majority vote</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="council" id="council" />
                  <Label htmlFor="council" className="text-sm sm:text-base font-normal">Family council decides</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="patriarch" id="patriarch" />
                  <Label htmlFor="patriarch" className="text-sm sm:text-base font-normal">Family patriarch/matriarch</Label>
                </div>
              </RadioGroup>
            </div>

            <Separator />

            <div>
              <Label className="text-sm sm:text-base">Meeting Frequency</Label>
              <Select value={data.meetingFrequency || ''} onValueChange={(value) => handleChange('meetingFrequency', value)}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="biannual">Twice a year</SelectItem>
                  <SelectItem value="annual">Annual</SelectItem>
                  <SelectItem value="as-needed">As needed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Scale className="h-4 w-4 sm:h-5 sm:w-5" />
              Conflict Resolution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <Label htmlFor="conflictResolution" className="text-sm sm:text-base">How will family conflicts be resolved?</Label>
              <Textarea
                id="conflictResolution"
                value={data.conflictResolution || ''}
                onChange={(e) => handleChange('conflictResolution', e.target.value)}
                placeholder="• Open dialogue and mediation
• Family mediator or counselor
• Cooling-off periods
• Final arbitration process..."
                className="mt-2 min-h-[100px] sm:min-h-[120px] text-sm sm:text-base"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Users className="h-4 w-4 sm:h-5 sm:w-5" />
            Voting Process
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <Label htmlFor="votingProcess" className="text-sm sm:text-base">Describe your family's voting procedures</Label>
            <Textarea
              id="votingProcess"
              value={data.votingProcess || ''}
              onChange={(e) => handleChange('votingProcess', e.target.value)}
              placeholder="• All family members over 18 can vote
• Proxy voting allowed for absent members
• Secret ballot for sensitive issues
• 60% majority required for major decisions..."
              className="mt-2 min-h-[80px] sm:min-h-[100px] text-sm sm:text-base"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <FileCheck className="h-4 w-4 sm:h-5 sm:w-5" />
              Employment Policy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <Label htmlFor="employmentPolicy" className="text-sm sm:text-base">Family business employment guidelines</Label>
              <Textarea
                id="employmentPolicy"
                value={data.employmentPolicy || ''}
                onChange={(e) => handleChange('employmentPolicy', e.target.value)}
                placeholder="• Family members must work outside for 3+ years first
• Must have relevant education/experience
• Performance reviews same as non-family employees
• Clear advancement criteria..."
                className="mt-2 min-h-[80px] sm:min-h-[100px] text-sm sm:text-base"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Dividend Policy</CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <Label htmlFor="dividendPolicy" className="text-sm sm:text-base">How will profits be distributed?</Label>
              <Textarea
                id="dividendPolicy"
                value={data.dividentPolicy || ''}
                onChange={(e) => handleChange('dividentPolicy', e.target.value)}
                placeholder="• Annual dividend review
• Reinvestment vs. distribution balance
• Emergency fund requirements
• Equal distribution among shareholders..."
                className="mt-2 min-h-[80px] sm:min-h-[100px] text-sm sm:text-base"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}