import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DollarSign, TrendingUp, Shield, BookOpen } from 'lucide-react';

interface WealthStepProps {
  data: {
    investmentPhilosophy?: string;
    riskTolerance?: string;
    wealthPreservation?: string;
    financialEducation?: string;
    emergencyFund?: string;
  };
  onDataChange: (data: any) => void;
  allData: Record<string, any>;
}

export function WealthStep({ data, onDataChange }: WealthStepProps) {
  const handleChange = (field: string, value: string) => {
    onDataChange({
      ...data,
      [field]: value
    });
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold mb-2">Wealth Management</h2>
        <p className="text-base sm:text-lg text-muted-foreground">
          Define your family's approach to wealth creation, preservation, and financial education.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
            Investment Philosophy
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="investmentPhilosophy" className="text-sm sm:text-base">What is your family's investment philosophy?</Label>
            <Textarea
              id="investmentPhilosophy"
              value={data.investmentPhilosophy || ''}
              onChange={(e) => handleChange('investmentPhilosophy', e.target.value)}
              placeholder="• Long-term value creation over short-term gains
• Diversified portfolio across asset classes
• Ethical and sustainable investing practices
• Regular review and rebalancing
• Professional advisory support..."
              className="mt-2 min-h-[100px] sm:min-h-[120px] text-sm sm:text-base"
            />
          </div>

          <div>
            <Label className="text-sm sm:text-base">Risk Tolerance</Label>
            <Select value={data.riskTolerance || ''} onValueChange={(value) => handleChange('riskTolerance', value)}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select risk tolerance" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="conservative">Conservative - Preserve capital</SelectItem>
                <SelectItem value="moderate">Moderate - Balanced growth</SelectItem>
                <SelectItem value="aggressive">Aggressive - Maximum growth</SelectItem>
                <SelectItem value="varies">Varies by investment type</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Shield className="h-4 w-4 sm:h-5 sm:w-5" />
              Wealth Preservation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <Label htmlFor="wealthPreservation" className="text-sm sm:text-base">Strategies for preserving wealth across generations</Label>
              <Textarea
                id="wealthPreservation"
                value={data.wealthPreservation || ''}
                onChange={(e) => handleChange('wealthPreservation', e.target.value)}
                placeholder="• Trust structures and estate planning
• Tax optimization strategies
• Asset protection measures
• Insurance coverage
• Emergency fund maintenance..."
                className="mt-2 min-h-[80px] sm:min-h-[100px] text-sm sm:text-base"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <DollarSign className="h-4 w-4 sm:h-5 sm:w-5" />
              Emergency Fund Policy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <Label htmlFor="emergencyFund" className="text-sm sm:text-base">Emergency fund requirements and management</Label>
              <Textarea
                id="emergencyFund"
                value={data.emergencyFund || ''}
                onChange={(e) => handleChange('emergencyFund', e.target.value)}
                placeholder="• Maintain 6-12 months of expenses
• Separate emergency investment fund
• Access procedures for family members
• Replenishment requirements
• Annual review and adjustment..."
                className="mt-2 min-h-[80px] sm:min-h-[100px] text-sm sm:text-base"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <BookOpen className="h-4 w-4 sm:h-5 sm:w-5" />
            Financial Education
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <Label htmlFor="financialEducation" className="text-sm sm:text-base">How will you educate family members about wealth?</Label>
            <Textarea
              id="financialEducation"
              value={data.financialEducation || ''}
              onChange={(e) => handleChange('financialEducation', e.target.value)}
              placeholder="• Age-appropriate financial literacy programs
• Regular family financial meetings
• Investment education and hands-on experience
• External courses and certifications
• Mentoring from financial advisors
• Practice with smaller investment amounts..."
              className="mt-2 min-h-[100px] sm:min-h-[120px] text-sm sm:text-base"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}