import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { VideoCallDialog } from './VideoCallDialog';
import { Video } from 'lucide-react';

export const VideoCallButton = () => {
  const [isCallDialogOpen, setIsCallDialogOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setIsCallDialogOpen(true)}
        className="flex items-center gap-2"
      >
        <Video className="w-4 h-4" />
        Start Video Call
      </Button>
      
      <VideoCallDialog
        isOpen={isCallDialogOpen}
        onClose={() => setIsCallDialogOpen(false)}
      />
    </>
  );
};