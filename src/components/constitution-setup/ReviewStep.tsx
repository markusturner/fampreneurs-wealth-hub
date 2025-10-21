import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, FileText, Eye } from 'lucide-react';

interface ReviewStepProps {
  data: any;
  onDataChange: (data: any) => void;
  allData: Record<string, any>;
}

export function ReviewStep({ allData }: ReviewStepProps) {
  const renderSection = (title: string, icon: React.ReactNode, data: any) => {
    if (!data || Object.keys(data).length === 0) return null;

    return (
      <Card className="mb-3 sm:mb-4">
        <CardHeader className="pb-2 sm:pb-3">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            {icon}
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-2 sm:space-y-3">
          {Object.entries(data).map(([key, value]) => {
            if (!value) return null;
            
            return (
              <div key={key}>
                <div className="text-xs sm:text-sm font-medium text-muted-foreground capitalize mb-1">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </div>
                {Array.isArray(value) ? (
                  <div className="flex flex-wrap gap-1">
                    {value.map((item, index) => (
                      <Badge key={index} variant="outline" className="text-xs">{item}</Badge>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs sm:text-sm bg-muted/30 rounded p-2">
                    {String(value)}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    );
  };

  const completedSections = Object.keys(allData).filter(key => {
    const section = allData[key];
    return section && Object.keys(section).length > 0;
  });

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold mb-2">Review Your Family Constitution</h2>
        <p className="text-base sm:text-lg text-muted-foreground">
          Review all sections of your family constitution before finalizing. You can go back to edit any section if needed.
        </p>
      </div>

      {/* Progress Summary */}
      <Card className="bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-800 dark:text-green-400 text-base sm:text-lg">
            <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5" />
            Constitution Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <div className="text-center">
              <div className="text-xl sm:text-2xl font-bold text-green-600">{completedSections.length}</div>
              <div className="text-xs sm:text-sm text-muted-foreground">Sections</div>
            </div>
            <div className="text-center">
              <div className="text-xl sm:text-2xl font-bold text-green-600">
                {Math.round((completedSections.length / 7) * 100)}%
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground">Progress</div>
            </div>
            <div className="text-center">
              <div className="text-xl sm:text-2xl font-bold text-green-600">
                {Object.values(allData).reduce((total, section) => {
                  return total + (section ? Object.keys(section).length : 0);
                }, 0)}
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground">Fields</div>
            </div>
            <div className="text-center">
              <div className="text-xl sm:text-2xl font-bold text-green-600">
                <FileText className="h-6 w-6 sm:h-8 sm:w-8 mx-auto" />
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground">Ready</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Section Reviews */}
      <div className="space-y-6">
        {renderSection(
          'Family Identity', 
          <FileText className="h-5 w-5" />, 
          allData.identity
        )}
        
        {renderSection(
          'Core Values & Principles', 
          <Eye className="h-5 w-5" />, 
          allData.values
        )}
        
        {renderSection(
          'Governance Structure', 
          <CheckCircle className="h-5 w-5" />, 
          allData.governance
        )}
        
        {renderSection(
          'Leadership & Succession', 
          <CheckCircle className="h-5 w-5" />, 
          allData.leadership
        )}
        
        {renderSection(
          'Wealth Management', 
          <CheckCircle className="h-5 w-5" />, 
          allData.wealth
        )}
        
        {renderSection(
          'Communication & Meetings', 
          <CheckCircle className="h-5 w-5" />, 
          allData.communication
        )}
        
        {renderSection(
          'Legacy & Philanthropy', 
          <CheckCircle className="h-5 w-5" />, 
          allData.philanthropy
        )}
      </div>

      {completedSections.length === 0 && (
        <Card className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30">
          <CardContent className="pt-6 text-center">
            <div className="text-amber-800 dark:text-amber-400">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No sections completed yet</h3>
              <p className="text-sm">
                Go back to previous steps to fill out your family constitution information.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}