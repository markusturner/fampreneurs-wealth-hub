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
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold mb-2">Governance Structure</h2>
        <p className="text-lg text-muted-foreground">
          Establish how your family will make decisions, resolve conflicts, and govern itself.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gavel className="h-5 w-5" />
              Decision Making Process
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>How will major family decisions be made?</Label>
              <RadioGroup 
                value={data.decisionMaking || ''} 
                onValueChange={(value) => handleChange('decisionMaking', value)}
                className="mt-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="consensus" id="consensus" />
                  <Label htmlFor="consensus">Consensus (everyone agrees)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="majority" id="majority" />
                  <Label htmlFor="majority">Majority vote</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="council" id="council" />
                  <Label htmlFor="council">Family council decides</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="patriarch" id="patriarch" />
                  <Label htmlFor="patriarch">Family patriarch/matriarch</Label>
                </div>
              </RadioGroup>
            </div>

            <Separator />

            <div>
              <Label>Meeting Frequency</Label>
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
            <CardTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5" />
              Conflict Resolution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <Label htmlFor="conflictResolution">How will family conflicts be resolved?</Label>
              <Textarea
                id="conflictResolution"
                value={data.conflictResolution || ''}
                onChange={(e) => handleChange('conflictResolution', e.target.value)}
                placeholder="• Open dialogue and mediation
• Family mediator or counselor
• Cooling-off periods
• Final arbitration process..."
                className="mt-2 min-h-[120px]"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Voting Process
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <Label htmlFor="votingProcess">Describe your family's voting procedures</Label>
            <Textarea
              id="votingProcess"
              value={data.votingProcess || ''}
              onChange={(e) => handleChange('votingProcess', e.target.value)}
              placeholder="• All family members over 18 can vote
• Proxy voting allowed for absent members
• Secret ballot for sensitive issues
• 60% majority required for major decisions..."
              className="mt-2 min-h-[100px]"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileCheck className="h-5 w-5" />
              Employment Policy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <Label htmlFor="employmentPolicy">Family business employment guidelines</Label>
              <Textarea
                id="employmentPolicy"
                value={data.employmentPolicy || ''}
                onChange={(e) => handleChange('employmentPolicy', e.target.value)}
                placeholder="• Family members must work outside for 3+ years first
• Must have relevant education/experience
• Performance reviews same as non-family employees
• Clear advancement criteria..."
                className="mt-2 min-h-[100px]"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dividend Policy</CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <Label htmlFor="dividendPolicy">How will profits be distributed?</Label>
              <Textarea
                id="dividendPolicy"
                value={data.dividentPolicy || ''}
                onChange={(e) => handleChange('dividentPolicy', e.target.value)}
                placeholder="• Annual dividend review
• Reinvestment vs. distribution balance
• Emergency fund requirements
• Equal distribution among shareholders..."
                className="mt-2 min-h-[100px]"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}