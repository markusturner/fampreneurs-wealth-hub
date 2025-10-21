import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Upload, Building2 } from 'lucide-react';
import { toast } from 'sonner';

interface IdentityStepProps {
  data: {
    familyName?: string;
    establishedYear?: string;
    location?: string;
    familyMotto?: string;
    overview?: string;
    familyCrestUrl?: string;
    corporateSealUrl?: string;
  };
  onDataChange: (data: any) => void;
  allData: Record<string, any>;
}

export function IdentityStep({ data, onDataChange }: IdentityStepProps) {
  const handleChange = (field: string, value: string) => {
    onDataChange({
      ...data,
      [field]: value
    });
  };

  const handleFileUpload = async (type: 'familyCrest' | 'corporateSeal') => {
    // Placeholder for file upload functionality
    toast.info(`${type === 'familyCrest' ? 'Family crest' : 'Corporate seal'} upload coming soon!`);
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold mb-2">Welcome to Your Family Constitution</h2>
        <p className="text-base sm:text-lg text-muted-foreground">
          Let's start with your family's basic identity and heritage. This information forms the foundation of your constitution.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Building2 className="h-4 w-4 sm:h-5 sm:w-5" />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4">
            <div>
              <Label htmlFor="familyName" className="text-sm sm:text-base">Family Name *</Label>
              <Input
                id="familyName"
                value={data.familyName || ''}
                onChange={(e) => handleChange('familyName', e.target.value)}
                placeholder="The Smith Family"
                className="mt-1 text-sm sm:text-base"
              />
            </div>

            <div>
              <Label htmlFor="establishedYear" className="text-sm sm:text-base">Established Year</Label>
              <Input
                id="establishedYear"
                type="number"
                value={data.establishedYear || ''}
                onChange={(e) => handleChange('establishedYear', e.target.value)}
                placeholder="1985"
                className="mt-1 text-sm sm:text-base"
              />
            </div>

            <div>
              <Label htmlFor="location" className="text-sm sm:text-base">Primary Location</Label>
              <Input
                id="location"
                value={data.location || ''}
                onChange={(e) => handleChange('location', e.target.value)}
                placeholder="New York, United States"
                className="mt-1 text-sm sm:text-base"
              />
            </div>

            <div>
              <Label htmlFor="familyMotto" className="text-sm sm:text-base">Family Motto</Label>
              <Input
                id="familyMotto"
                value={data.familyMotto || ''}
                onChange={(e) => handleChange('familyMotto', e.target.value)}
                placeholder="Unity, Integrity, Growth"
                className="mt-1 text-sm sm:text-base"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Family Symbols</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4">
            <div>
              <Label className="text-sm sm:text-base">Family Crest</Label>
              <div className="mt-2 border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 sm:p-6 text-center">
                <Upload className="mx-auto h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground mb-2" />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleFileUpload('familyCrest')}
                  className="mb-2 text-xs sm:text-sm"
                >
                  Upload Family Crest
                </Button>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Optional: Upload your family crest or coat of arms
                </p>
              </div>
            </div>

            <div>
              <Label className="text-sm sm:text-base">Corporate Seal</Label>
              <div className="mt-2 border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 sm:p-6 text-center">
                <Upload className="mx-auto h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground mb-2" />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleFileUpload('corporateSeal')}
                  className="mb-2 text-xs sm:text-sm"
                >
                  Upload Corporate Seal
                </Button>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Optional: Upload your family business seal
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Family Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <Label htmlFor="overview" className="text-sm sm:text-base">Tell us about your family's story</Label>
            <Textarea
              id="overview"
              value={data.overview || ''}
              onChange={(e) => handleChange('overview', e.target.value)}
              placeholder="Share your family's history, achievements, and what makes you unique..."
              className="mt-1 min-h-[100px] sm:min-h-[120px] text-sm sm:text-base"
            />
            <p className="text-xs sm:text-sm text-muted-foreground mt-2">
              This will appear in the introduction of your family constitution
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}