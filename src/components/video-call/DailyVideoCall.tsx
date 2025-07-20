import React, { useEffect, useRef, useState } from 'react';
import DailyIframe from '@daily-co/daily-js';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Mic, MicOff, Video, VideoOff, Phone } from 'lucide-react';

interface DailyVideoCallProps {
  roomUrl: string;
  isOpen: boolean;
  onClose: () => void;
  userName?: string;
}

export const DailyVideoCall: React.FC<DailyVideoCallProps> = ({
  roomUrl,
  isOpen,
  onClose,
  userName = 'User'
}) => {
  const callRef = useRef<HTMLDivElement>(null);
  const [callObject, setCallObject] = useState<any>(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen && callRef.current && !callObject) {
      const daily = DailyIframe.createCallObject({
        iframeStyle: {
          width: '100%',
          height: '100%',
          border: 'none',
          borderRadius: '8px'
        }
      });

      daily.join({
        url: roomUrl,
        userName: userName
      });

      daily
        .on('joined-meeting', () => {
          setIsLoading(false);
        })
        .on('left-meeting', () => {
          onClose();
        })
        .on('error', (error: any) => {
          console.error('Daily call error:', error);
          setIsLoading(false);
        });

      if (callRef.current) {
        callRef.current.appendChild(daily.iframe());
      }

      setCallObject(daily);
    }

    return () => {
      if (callObject) {
        callObject.destroy();
        setCallObject(null);
      }
    };
  }, [isOpen, roomUrl, userName]);

  const toggleVideo = () => {
    if (callObject) {
      callObject.setLocalVideo(!isVideoEnabled);
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  const toggleAudio = () => {
    if (callObject) {
      callObject.setLocalAudio(!isAudioEnabled);
      setIsAudioEnabled(!isAudioEnabled);
    }
  };

  const endCall = () => {
    if (callObject) {
      callObject.leave();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full h-[80vh] p-0">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle>Video Call</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 relative">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/50">
              <div className="text-lg">Connecting to call...</div>
            </div>
          )}
          
          <div 
            ref={callRef} 
            className="w-full h-full min-h-[400px]"
            style={{ height: 'calc(100% - 80px)' }}
          />
          
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
            <Button
              variant={isAudioEnabled ? "default" : "destructive"}
              size="sm"
              onClick={toggleAudio}
            >
              {isAudioEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
            </Button>
            
            <Button
              variant={isVideoEnabled ? "default" : "destructive"}
              size="sm"
              onClick={toggleVideo}
            >
              {isVideoEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
            </Button>
            
            <Button
              variant="destructive"
              size="sm"
              onClick={endCall}
            >
              <Phone className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};