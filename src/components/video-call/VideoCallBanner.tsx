import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { VideoCallDialog } from './VideoCallDialog';
import { Video, X, Users, Settings } from 'lucide-react';
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

export const VideoCallBanner = () => {
  const [activeCalls, setActiveCalls] = useState<ActiveCall[]>([]);
  const [isCallDialogOpen, setIsCallDialogOpen] = useState(false);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [dismissedCalls, setDismissedCalls] = useState<Set<string>>(new Set());
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

  // Join an existing call
  const joinCall = (callId: string) => {
    setCurrentRoomId(callId);
    setIsCallDialogOpen(true);
  };

  // End a call (only for creators or admins)
  const endCall = async (callId: string) => {
    if (!user) return;

    try {
      const call = activeCalls.find(c => c.id === callId);
      if (!call) return;

      // Check if user can end this call (creator or admin)
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('user_id', user.id)
        .single();

      if (call.created_by !== user.id && !profile?.is_admin) {
        toast({
          title: "Error",
          description: "You can only end calls you created",
          variant: "destructive"
        });
        return;
      }

      await supabase
        .from('video_call_rooms')
        .update({ is_active: false })
        .eq('id', callId);

      toast({
        title: "Call Ended",
        description: "The video call has been ended"
      });

      fetchActiveCalls();
    } catch (error) {
      console.error('Error ending call:', error);
      toast({
        title: "Error",
        description: "Failed to end call",
        variant: "destructive"
      });
    }
  };

  // Dismiss a call banner
  const dismissCall = (callId: string) => {
    setDismissedCalls(prev => new Set([...prev, callId]));
  };

  // Close the dialog
  const closeDialog = () => {
    setCurrentRoomId(null);
    setIsCallDialogOpen(false);
  };

  useEffect(() => {
    fetchActiveCalls();
    
    // Set up real-time subscription for active calls
    const channel = supabase
      .channel('video_calls_banner')
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

  // Filter out dismissed calls
  const visibleCalls = activeCalls.filter(call => !dismissedCalls.has(call.id));

  if (visibleCalls.length === 0) return null;

  return (
    <>
      <div className="w-full bg-gradient-to-r from-purple-600 to-blue-600 border-b">
        {visibleCalls.map((call) => (
          <div key={call.id} className="flex items-center justify-between px-4 py-3 text-white">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              <Video className="h-5 w-5" />
              <div>
                <h3 className="font-medium">Video Call - Room {call.room_name}</h3>
                <p className="text-sm text-white/80">Started by {call.creator_name}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                onClick={() => joinCall(call.id)}
                variant="secondary"
                size="sm"
                className="bg-white/20 hover:bg-white/30 text-white border-white/30"
              >
                <Users className="h-4 w-4 mr-2" />
                Join Call
              </Button>
              
              {(call.created_by === user?.id) && (
                <Button
                  onClick={() => endCall(call.id)}
                  variant="secondary"
                  size="sm"
                  className="bg-red-500/20 hover:bg-red-500/30 text-white border-red-400/30"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  End Call
                </Button>
              )}
              
              <Button
                onClick={() => dismissCall(call.id)}
                variant="ghost"
                size="sm"
                className="text-white/80 hover:text-white hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
      
      <VideoCallDialog
        isOpen={isCallDialogOpen}
        onClose={closeDialog}
        roomId={currentRoomId || 'default-room'}
      />
    </>
  );
};