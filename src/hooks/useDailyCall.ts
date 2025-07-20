import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useDailyCall = () => {
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);

  const createRoom = async (roomName: string, privacy: 'public' | 'private' = 'private') => {
    setIsCreatingRoom(true);
    
    try {
      // Create a unique room name if not provided
      const uniqueRoomName = roomName || `room-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // In a real implementation, you would call Daily.co API to create a room
      // For now, we'll create a mock room URL
      const roomUrl = `https://your-domain.daily.co/${uniqueRoomName}`;
      
      return roomUrl;
    } catch (error) {
      console.error('Error creating room:', error);
      throw error;
    } finally {
      setIsCreatingRoom(false);
    }
  };

  const joinRoom = (roomUrl: string) => {
    // This will be handled by the DailyVideoCall component
    return roomUrl;
  };

  return {
    createRoom,
    joinRoom,
    isCreatingRoom
  };
};