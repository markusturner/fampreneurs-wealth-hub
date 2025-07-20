import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { VideoCallDialog } from './VideoCallDialog';
import { Video, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface ActiveCall {
  id: string;
  room_name: string;
  created_by: string;
  created_at: string;
  creator_name: string;
}

export const VideoCallButton = () => {
  const [isCallDialogOpen, setIsCallDialogOpen] = useState(false);
  const [activeCalls, setActiveCalls] = useState<ActiveCall[]>([]);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch active calls
  const fetchActiveCalls = async () => {
    try {
      const { data: callsData, error: callsError } = await supabase
        .from('video_call_rooms')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (callsError) throw callsError;

      // Get creator names for each call
      const callsWithNames = await Promise.all(
        (callsData || []).map(async (call) => {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('display_name, first_name, last_name')
            .eq('user_id', call.created_by)
            .single();

          return {
            ...call,
            creator_name: profileData?.display_name || 
              `${profileData?.first_name || ''} ${profileData?.last_name || ''}`.trim() || 
              'Unknown User'
          };
        })
      );

      setActiveCalls(callsWithNames);
    } catch (error) {
      console.error('Error fetching active calls:', error);
    }
  };

  // Start a new call
  const startNewCall = async () => {
    if (!user) return;

    try {
      const roomName = `call-${Date.now()}`;
      const { data, error } = await supabase
        .from('video_call_rooms')
        .insert({
          room_name: roomName,
          room_url: `https://your-domain.daily.co/${roomName}`,
          created_by: user.id,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;

      // Send notifications to all users about the video call
      try {
        const { error: notificationError } = await supabase.functions.invoke('notify-video-call-start', {
          body: {
            callId: data.id,
            roomName: roomName,
            createdBy: user.id
          }
        });

        if (notificationError) {
          console.error('Error sending video call notifications:', notificationError);
        } else {
          console.log('Video call notifications sent successfully');
        }
      } catch (notificationError) {
        console.error('Failed to send notifications:', notificationError);
        // Don't fail the call creation if notifications fail
      }

      setCurrentRoomId(data.id);
      setIsCallDialogOpen(true);
      
      toast({
        title: "Call Started",
        description: "Your video call is now live! Notifications sent to all users."
      });

      fetchActiveCalls();
    } catch (error) {
      console.error('Error starting call:', error);
      toast({
        title: "Error",
        description: "Failed to start video call",
        variant: "destructive"
      });
    }
  };

  // Join an existing call
  const joinCall = (callId: string) => {
    setCurrentRoomId(callId);
    setIsCallDialogOpen(true);
  };

  // End the current call
  const endCall = async () => {
    if (currentRoomId) {
      try {
        await supabase
          .from('video_call_rooms')
          .update({ is_active: false })
          .eq('id', currentRoomId);
      } catch (error) {
        console.error('Error ending call:', error);
      }
    }
    setCurrentRoomId(null);
    setIsCallDialogOpen(false);
    fetchActiveCalls();
  };

  useEffect(() => {
    fetchActiveCalls();
    
    // Set up real-time subscription for active calls
    const channel = supabase
      .channel('video_calls')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'video_call_rooms'
        },
        () => {
          fetchActiveCalls();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <>
      <div className="flex items-center gap-2">
        {activeCalls.length > 0 ? (
          <div className="flex items-center gap-2">
            {activeCalls.map((call) => (
              <Button
                key={call.id}
                onClick={() => joinCall(call.id)}
                variant="outline"
                size="sm"
                className="flex items-center gap-2 bg-green-500/10 border-green-500/20 text-green-600 hover:bg-green-500/20"
              >
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                Join {call.creator_name}'s call
              </Button>
            ))}
            <Button
              onClick={startNewCall}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Video className="w-4 h-4" />
              New Call
            </Button>
          </div>
        ) : (
          <Button
            onClick={startNewCall}
            className="flex items-center gap-2"
          >
            <Video className="w-4 h-4" />
            Start Video Call
          </Button>
        )}
      </div>
      
      <VideoCallDialog
        isOpen={isCallDialogOpen}
        onClose={endCall}
        roomId={currentRoomId || 'default-room'}
      />
    </>
  );
};