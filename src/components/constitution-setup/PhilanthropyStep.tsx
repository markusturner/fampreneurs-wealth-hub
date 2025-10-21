import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Heart, Globe, GraduationCap, TreePine } from 'lucide-react';

const PHILANTHROPY_FOCUS_AREAS = [
  'Education', 'Healthcare', 'Environment', 'Poverty Alleviation', 'Arts & Culture',
  'Science & Research', 'Community Development', 'Youth Programs', 'Elder Care',
  'Mental Health', 'Disaster Relief', 'Human Rights', 'Technology Access'
];

interface PhilanthropyStepProps {
  data: {
    givingPhilosophy?: string;
    focusAreas?: string[];
    givingStructure?: string;
    familyLegacy?: string;
    nextGenInvolvement?: string;
  };
  onDataChange: (data: any) => void;
  allData: Record<string, any>;
}

export function PhilanthropyStep({ data, onDataChange }: PhilanthropyStepProps) {
  const handleChange = (field: string, value: any) => {
    onDataChange({
      ...data,
      [field]: value
    });
  };

  const toggleFocusArea = (area: string) => {
    const currentAreas = data.focusAreas || [];
    const newAreas = currentAreas.includes(area)
      ? currentAreas.filter(a => a !== area)
      : [...currentAreas, area];
    handleChange('focusAreas', newAreas);
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold mb-2">Legacy & Philanthropy</h2>
        <p className="text-base sm:text-lg text-muted-foreground">
          Define how your family will give back to society and create a lasting positive legacy.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Heart className="h-4 w-4 sm:h-5 sm:w-5" />
            Giving Philosophy
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <Label htmlFor="givingPhilosophy" className="text-sm sm:text-base">What drives your family's philanthropic efforts?</Label>
            <Textarea
              id="givingPhilosophy"
              value={data.givingPhilosophy || ''}
              onChange={(e) => handleChange('givingPhilosophy', e.target.value)}
              placeholder="We believe in giving back to the community that has supported our success. Our philanthropic efforts focus on creating sustainable change through education and economic opportunity..."
              className="mt-2 min-h-[100px] sm:min-h-[120px] text-sm sm:text-base"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Globe className="h-4 w-4 sm:h-5 sm:w-5" />
            Focus Areas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <Label className="text-sm sm:text-base">What causes will your family support? (select all that apply)</Label>
            <div className="mt-3 flex flex-wrap gap-1.5 sm:gap-2">
              {PHILANTHROPY_FOCUS_AREAS.map((area) => (
                <Badge
                  key={area}
                  variant={data.focusAreas?.includes(area) ? "default" : "outline"}
                  className="cursor-pointer hover:bg-primary/20 transition-colors text-xs sm:text-sm"
                  onClick={() => toggleFocusArea(area)}
                >
                  {area}
                </Badge>
              ))}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-2">
              Selected areas: {data.focusAreas?.length || 0}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <TreePine className="h-4 w-4 sm:h-5 sm:w-5" />
              Giving Structure
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <Label htmlFor="givingStructure" className="text-sm sm:text-base">How will your family organize its philanthropic efforts?</Label>
              <Textarea
                id="givingStructure"
                value={data.givingStructure || ''}
                onChange={(e) => handleChange('givingStructure', e.target.value)}
                placeholder="• Family foundation with formal board
• Annual giving budget allocation
• Due diligence process for recipients
• Impact measurement and reporting
• Volunteer time commitments..."
                className="mt-2 min-h-[80px] sm:min-h-[100px] text-sm sm:text-base"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <GraduationCap className="h-4 w-4 sm:h-5 sm:w-5" />
              Next Generation Involvement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <Label htmlFor="nextGenInvolvement" className="text-sm sm:text-base">How will you engage younger generations in philanthropy?</Label>
              <Textarea
                id="nextGenInvolvement"
                value={data.nextGenInvolvement || ''}
                onChange={(e) => handleChange('nextGenInvolvement', e.target.value)}
                placeholder="• Youth advisory committee
• Volunteer requirements for family members
• Educational trips to supported organizations
• Mentoring from experienced board members
• Personal giving allowances..."
                className="mt-2 min-h-[80px] sm:min-h-[100px] text-sm sm:text-base"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Family Legacy Vision</CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <Label htmlFor="familyLegacy" className="text-sm sm:text-base">How do you want your family to be remembered?</Label>
            <Textarea
              id="familyLegacy"
              value={data.familyLegacy || ''}
              onChange={(e) => handleChange('familyLegacy', e.target.value)}
              placeholder="We want to be remembered as a family that created positive change in our community and beyond. Our legacy will be measured not just by our financial success, but by the lives we've touched and the opportunities we've created for others..."
              className="mt-2 min-h-[100px] sm:min-h-[120px] text-sm sm:text-base"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}