import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Heart, Target, Compass } from 'lucide-react';

const CORE_VALUES_OPTIONS = [
  'Integrity', 'Innovation', 'Excellence', 'Respect', 'Responsibility',
  'Teamwork', 'Leadership', 'Service', 'Growth', 'Sustainability',
  'Tradition', 'Education', 'Family First', 'Hard Work', 'Honesty'
];

interface ValuesStepProps {
  data: {
    missionStatement?: string;
    visionStatement?: string;
    coreValues?: string[];
    familyPrinciples?: string;
  };
  onDataChange: (data: any) => void;
  allData: Record<string, any>;
}

export function ValuesStep({ data, onDataChange }: ValuesStepProps) {
  const handleChange = (field: string, value: any) => {
    onDataChange({
      ...data,
      [field]: value
    });
  };

  const toggleValue = (value: string) => {
    const currentValues = data.coreValues || [];
    const newValues = currentValues.includes(value)
      ? currentValues.filter(v => v !== value)
      : [...currentValues, value];
    handleChange('coreValues', newValues);
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold mb-2">Core Values & Principles</h2>
        <p className="text-base sm:text-lg text-muted-foreground">
          Define the fundamental values and principles that guide your family's decisions and behavior.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Target className="h-4 w-4 sm:h-5 sm:w-5" />
              Mission Statement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <Label htmlFor="mission" className="text-sm sm:text-base">What is your family's purpose?</Label>
              <Textarea
                id="mission"
                value={data.missionStatement || ''}
                onChange={(e) => handleChange('missionStatement', e.target.value)}
                placeholder="Our mission is to create lasting wealth through ethical business practices while fostering strong family bonds and giving back to our community..."
                className="mt-1 min-h-[80px] sm:min-h-[100px] text-sm sm:text-base"
              />
              <p className="text-xs sm:text-sm text-muted-foreground mt-2">
                Your mission statement should describe your family's purpose and primary objectives
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Compass className="h-4 w-4 sm:h-5 sm:w-5" />
              Vision Statement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <Label htmlFor="vision" className="text-sm sm:text-base">What do you aspire to become?</Label>
              <Textarea
                id="vision"
                value={data.visionStatement || ''}
                onChange={(e) => handleChange('visionStatement', e.target.value)}
                placeholder="To be a multi-generational family that creates positive impact in business and society while maintaining strong family values..."
                className="mt-1 min-h-[80px] sm:min-h-[100px] text-sm sm:text-base"
              />
              <p className="text-xs sm:text-sm text-muted-foreground mt-2">
                Your vision statement should paint a picture of your family's future aspirations
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Heart className="h-4 w-4 sm:h-5 sm:w-5" />
            Core Values
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <Label className="text-sm sm:text-base">Select your family's core values (choose 3-7)</Label>
            <div className="mt-3 flex flex-wrap gap-1.5 sm:gap-2">
              {CORE_VALUES_OPTIONS.map((value) => (
                <Badge
                  key={value}
                  variant={data.coreValues?.includes(value) ? "default" : "outline"}
                  className="cursor-pointer hover:bg-primary/20 transition-colors text-xs sm:text-sm"
                  onClick={() => toggleValue(value)}
                >
                  {value}
                </Badge>
              ))}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-2">
              Selected values: {data.coreValues?.length || 0}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Family Principles</CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <Label htmlFor="principles" className="text-sm sm:text-base">Additional principles and beliefs</Label>
            <Textarea
              id="principles"
              value={data.familyPrinciples || ''}
              onChange={(e) => handleChange('familyPrinciples', e.target.value)}
              placeholder="• We believe in treating all people with dignity and respect
• Education is the foundation of success
• We have a responsibility to give back to society
• Family comes first, but we support each other's individual growth..."
              className="mt-1 min-h-[100px] sm:min-h-[120px] text-sm sm:text-base"
            />
            <p className="text-xs sm:text-sm text-muted-foreground mt-2">
              List specific principles, beliefs, or rules that guide your family's behavior
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}