import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Crown, Users, GraduationCap, ArrowRight } from 'lucide-react';

interface LeadershipStepProps {
  data: {
    leadershipStructure?: string;
    successionPlanning?: string;
    nextGenDevelopment?: string;
    leadershipTerms?: string;
    mentoringProgram?: string;
  };
  onDataChange: (data: any) => void;
  allData: Record<string, any>;
}

export function LeadershipStep({ data, onDataChange }: LeadershipStepProps) {
  const handleChange = (field: string, value: string) => {
    onDataChange({
      ...data,
      [field]: value
    });
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold mb-2">Leadership & Succession</h2>
        <p className="text-base sm:text-lg text-muted-foreground">
          Define leadership roles, succession planning, and next-generation development strategies.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Crown className="h-4 w-4 sm:h-5 sm:w-5" />
            Leadership Structure
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="leadershipStructure" className="text-sm sm:text-base">Describe your family's leadership roles and responsibilities</Label>
            <Textarea
              id="leadershipStructure"
              value={data.leadershipStructure || ''}
              onChange={(e) => handleChange('leadershipStructure', e.target.value)}
              placeholder="• Family Council Chairman - oversees major decisions
• CEO/President - manages daily operations
• Board of Directors - strategic oversight
• Committee chairs - specific focus areas..."
              className="mt-2 min-h-[100px] sm:min-h-[120px] text-sm sm:text-base"
            />
          </div>

          <div>
            <Label className="text-sm sm:text-base">Leadership Term Length</Label>
            <Select value={data.leadershipTerms || ''} onValueChange={(value) => handleChange('leadershipTerms', value)}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select term length" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2-years">2 years</SelectItem>
                <SelectItem value="3-years">3 years</SelectItem>
                <SelectItem value="5-years">5 years</SelectItem>
                <SelectItem value="indefinite">Indefinite</SelectItem>
                <SelectItem value="retirement">Until retirement</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
            Succession Planning
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <Label htmlFor="successionPlanning" className="text-sm sm:text-base">How will leadership transition to the next generation?</Label>
            <Textarea
              id="successionPlanning"
              value={data.successionPlanning || ''}
              onChange={(e) => handleChange('successionPlanning', e.target.value)}
              placeholder="• Identify potential successors early
• Gradual transition of responsibilities
• External experience requirements
• Emergency succession procedures
• Performance evaluations and readiness assessments..."
              className="mt-2 min-h-[100px] sm:min-h-[120px] text-sm sm:text-base"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <GraduationCap className="h-4 w-4 sm:h-5 sm:w-5" />
              Next Generation Development
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <Label htmlFor="nextGenDevelopment" className="text-sm sm:text-base">Programs for developing future leaders</Label>
              <Textarea
                id="nextGenDevelopment"
                value={data.nextGenDevelopment || ''}
                onChange={(e) => handleChange('nextGenDevelopment', e.target.value)}
                placeholder="• Formal education requirements
• Leadership training programs
• Internships and work experience
• Board observer positions
• External mentorship..."
                className="mt-2 min-h-[100px] text-sm sm:text-base"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Users className="h-4 w-4 sm:h-5 sm:w-5" />
              Mentoring Program
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <Label htmlFor="mentoringProgram" className="text-sm sm:text-base">How will you mentor the next generation?</Label>
              <Textarea
                id="mentoringProgram"
                value={data.mentoringProgram || ''}
                onChange={(e) => handleChange('mentoringProgram', e.target.value)}
                placeholder="• Pair younger members with experienced leaders
• Regular mentoring meetings
• Goal setting and progress tracking
• Cross-generational projects
• External advisors and coaches..."
                className="mt-2 min-h-[100px] text-sm sm:text-base"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}