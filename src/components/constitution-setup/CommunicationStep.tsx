import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageCircle, Calendar, Phone, Users } from 'lucide-react';

interface CommunicationStepProps {
  data: {
    communicationChannels?: string;
    meetingStructure?: string;
    informationSharing?: string;
    familyTraditions?: string;
    eventPlanning?: string;
  };
  onDataChange: (data: any) => void;
  allData: Record<string, any>;
}

export function CommunicationStep({ data, onDataChange }: CommunicationStepProps) {
  const handleChange = (field: string, value: string) => {
    onDataChange({
      ...data,
      [field]: value
    });
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold mb-2">Communication & Meetings</h2>
        <p className="text-base sm:text-lg text-muted-foreground">
          Establish how your family will communicate, meet, and maintain strong relationships.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5" />
              Communication Channels
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <Label htmlFor="communicationChannels" className="text-sm sm:text-base">How will your family stay connected?</Label>
              <Textarea
                id="communicationChannels"
                value={data.communicationChannels || ''}
                onChange={(e) => handleChange('communicationChannels', e.target.value)}
                placeholder="• Monthly family newsletter
• WhatsApp family group
• Quarterly video calls for remote members
• Email updates for major decisions
• Annual family website updates..."
                className="mt-2 min-h-[80px] sm:min-h-[100px] text-sm sm:text-base"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
              Meeting Structure
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <Label htmlFor="meetingStructure" className="text-sm sm:text-base">How will family meetings be organized?</Label>
              <Textarea
                id="meetingStructure"
                value={data.meetingStructure || ''}
                onChange={(e) => handleChange('meetingStructure', e.target.value)}
                placeholder="• Formal agenda distributed in advance
• Rotating meeting locations
• Virtual participation options
• Meeting minutes and action items
• Time limits and structured discussions..."
                className="mt-2 min-h-[80px] sm:min-h-[100px] text-sm sm:text-base"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Phone className="h-4 w-4 sm:h-5 sm:w-5" />
            Information Sharing
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <Label htmlFor="informationSharing" className="text-sm sm:text-base">Guidelines for sharing family information</Label>
            <Textarea
              id="informationSharing"
              value={data.informationSharing || ''}
              onChange={(e) => handleChange('informationSharing', e.target.value)}
              placeholder="• Confidentiality agreements for sensitive information
• Regular financial reporting to family members
• Transparent decision-making processes
• Clear boundaries on public information
• Privacy protection for individual family members..."
              className="mt-2 min-h-[100px] sm:min-h-[120px] text-sm sm:text-base"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Users className="h-4 w-4 sm:h-5 sm:w-5" />
              Family Traditions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <Label htmlFor="familyTraditions" className="text-sm sm:text-base">What traditions will you maintain and create?</Label>
              <Textarea
                id="familyTraditions"
                value={data.familyTraditions || ''}
                onChange={(e) => handleChange('familyTraditions', e.target.value)}
                placeholder="• Annual family reunion
• Holiday celebrations
• Coming-of-age ceremonies
• Educational trips and retreats
• Charitable activities together..."
                className="mt-2 min-h-[80px] sm:min-h-[100px] text-sm sm:text-base"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Event Planning</CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <Label htmlFor="eventPlanning" className="text-sm sm:text-base">How will family events be organized?</Label>
              <Textarea
                id="eventPlanning"
                value={data.eventPlanning || ''}
                onChange={(e) => handleChange('eventPlanning', e.target.value)}
                placeholder="• Rotating event hosting responsibilities
• Annual event calendar planning
• Budget allocation for family gatherings
• Coordination committee
• Virtual and in-person options..."
                className="mt-2 min-h-[80px] sm:min-h-[100px] text-sm sm:text-base"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}