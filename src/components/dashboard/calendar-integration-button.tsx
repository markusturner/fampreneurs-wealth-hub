import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Calendar, Video, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";

interface CalendarIntegration {
  provider: 'google_calendar' | 'zoom';
  is_active: boolean;
  email: string | null;
}

export function CalendarIntegrationButton() {
  const [integrations, setIntegrations] = useState<CalendarIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const fetchIntegrations = async () => {
    try {
      const { data, error } = await supabase
        .from('calendar_integrations')
        .select('provider, is_active, email')
        .eq('is_active', true);

      if (error) throw error;
      setIntegrations((data || []) as CalendarIntegration[]);
    } catch (error) {
      console.error('Error fetching integrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const connectGoogleCalendar = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const clientId = import.meta.env.VITE_GOOGLE_CALENDAR_CLIENT_ID;
      const redirectUri = `https://tbofkvyezmpovoezjyyl.supabase.co/functions/v1/google-calendar-oauth-callback`;
      
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'https://www.googleapis.com/auth/calendar.events',
        access_type: 'offline',
        prompt: 'consent',
        state: user.id,
      })}`;

      window.open(authUrl, '_blank', 'width=600,height=700');
      
      toast({
        title: "Opening Google Calendar Authorization",
        description: "Please authorize the app in the popup window",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const connectZoom = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const clientId = import.meta.env.VITE_ZOOM_CLIENT_ID;
      const redirectUri = `https://tbofkvyezmpovoezjyyl.supabase.co/functions/v1/zoom-oauth-callback`;
      
      const authUrl = `https://zoom.us/oauth/authorize?${new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        state: user.id,
      })}`;

      window.open(authUrl, '_blank', 'width=600,height=700');
      
      toast({
        title: "Opening Zoom Authorization",
        description: "Please authorize the app in the popup window",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const disconnectIntegration = async (provider: string) => {
    try {
      const { error } = await supabase
        .from('calendar_integrations')
        .update({ is_active: false })
        .eq('provider', provider);

      if (error) throw error;

      toast({
        title: "Disconnected",
        description: `${provider === 'google_calendar' ? 'Google Calendar' : 'Zoom'} has been disconnected`,
      });
      
      fetchIntegrations();
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const googleIntegration = integrations.find(i => i.provider === 'google_calendar');
  const zoomIntegration = integrations.find(i => i.provider === 'zoom');

  if (loading) return <div>Loading integrations...</div>;

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Calendar Integrations</h3>
      
      <div className="space-y-4">
        {/* Google Calendar */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium">Google Calendar</p>
              {googleIntegration && (
                <p className="text-sm text-muted-foreground">{googleIntegration.email}</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {googleIntegration ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => disconnectIntegration('google_calendar')}
                >
                  Disconnect
                </Button>
              </>
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={connectGoogleCalendar}
              >
                Connect
              </Button>
            )}
          </div>
        </div>

        {/* Zoom */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center gap-3">
            <Video className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium">Zoom</p>
              {zoomIntegration && (
                <p className="text-sm text-muted-foreground">{zoomIntegration.email}</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {zoomIntegration ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => disconnectIntegration('zoom')}
                >
                  Disconnect
                </Button>
              </>
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={connectZoom}
              >
                Connect
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}