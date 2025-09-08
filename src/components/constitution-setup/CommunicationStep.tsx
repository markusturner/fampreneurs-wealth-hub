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
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold mb-2">Communication & Meetings</h2>
        <p className="text-lg text-muted-foreground">
          Establish how your family will communicate, meet, and maintain strong relationships.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Communication Channels
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <Label htmlFor="communicationChannels">How will your family stay connected?</Label>
              <Textarea
                id="communicationChannels"
                value={data.communicationChannels || ''}
                onChange={(e) => handleChange('communicationChannels', e.target.value)}
                placeholder="• Monthly family newsletter
• WhatsApp family group
• Quarterly video calls for remote members
• Email updates for major decisions
• Annual family website updates..."
                className="mt-2 min-h-[100px]"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Meeting Structure
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <Label htmlFor="meetingStructure">How will family meetings be organized?</Label>
              <Textarea
                id="meetingStructure"
                value={data.meetingStructure || ''}
                onChange={(e) => handleChange('meetingStructure', e.target.value)}
                placeholder="• Formal agenda distributed in advance
• Rotating meeting locations
• Virtual participation options
• Meeting minutes and action items
• Time limits and structured discussions..."
                className="mt-2 min-h-[100px]"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Information Sharing
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <Label htmlFor="informationSharing">Guidelines for sharing family information</Label>
            <Textarea
              id="informationSharing"
              value={data.informationSharing || ''}
              onChange={(e) => handleChange('informationSharing', e.target.value)}
              placeholder="• Confidentiality agreements for sensitive information
• Regular financial reporting to family members
• Transparent decision-making processes
• Clear boundaries on public information
• Privacy protection for individual family members..."
              className="mt-2 min-h-[120px]"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Family Traditions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <Label htmlFor="familyTraditions">What traditions will you maintain and create?</Label>
              <Textarea
                id="familyTraditions"
                value={data.familyTraditions || ''}
                onChange={(e) => handleChange('familyTraditions', e.target.value)}
                placeholder="• Annual family reunion
• Holiday celebrations
• Coming-of-age ceremonies
• Educational trips and retreats
• Charitable activities together..."
                className="mt-2 min-h-[100px]"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Event Planning</CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <Label htmlFor="eventPlanning">How will family events be organized?</Label>
              <Textarea
                id="eventPlanning"
                value={data.eventPlanning || ''}
                onChange={(e) => handleChange('eventPlanning', e.target.value)}
                placeholder="• Rotating event hosting responsibilities
• Annual event calendar planning
• Budget allocation for family gatherings
• Coordination committee
• Virtual and in-person options..."
                className="mt-2 min-h-[100px]"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}