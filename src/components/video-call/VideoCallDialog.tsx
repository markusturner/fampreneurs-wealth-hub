import React, { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Video, VideoOff, Mic, MicOff, Phone, PhoneOff, Settings } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface VideoCallDialogProps {
  isOpen: boolean;
  onClose: () => void;
  roomId?: string;
}

export const VideoCallDialog = ({ isOpen, onClose, roomId = "default-room" }: VideoCallDialogProps) => {
  const { toast } = useToast()
  const [isVideoEnabled, setIsVideoEnabled] = useState(true)
  const [isAudioEnabled, setIsAudioEnabled] = useState(true)
  const [isCallActive, setIsCallActive] = useState(false)
  const [participants, setParticipants] = useState<string[]>([])
  
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    if (!isOpen) return;
    initializeCall()
    return () => {
      cleanup()
    }
  }, [isOpen])

  const initializeCall = async () => {
    try {
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        video: isVideoEnabled,
        audio: isAudioEnabled
      })
      
      localStreamRef.current = stream
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
      }

      // Initialize peer connection
      peerConnectionRef.current = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      })

      // Add local stream tracks
      stream.getTracks().forEach(track => {
        peerConnectionRef.current?.addTrack(track, stream)
      })

      // Handle remote stream
      peerConnectionRef.current.ontrack = (event) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0]
        }
      }

      setIsCallActive(true)
      toast({
        title: "Call Started",
        description: "Video call is now active"
      })

    } catch (error) {
      console.error('Error starting call:', error)
      toast({
        title: "Error",
        description: "Failed to start video call",
        variant: "destructive"
      })
    }
  }

  const toggleVideo = async () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !isVideoEnabled
        setIsVideoEnabled(!isVideoEnabled)
      }
    }
  }

  const toggleAudio = async () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !isAudioEnabled
        setIsAudioEnabled(!isAudioEnabled)
      }
    }
  }

  const endCall = () => {
    cleanup()
    onClose()
  }

  const cleanup = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop())
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
    }
    setIsCallActive(false)
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-6xl h-full max-h-[90vh] bg-background border rounded-lg shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-card">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <h2 className="text-lg font-semibold">Video Call - Room {roomId}</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={endCall}
            className="text-muted-foreground hover:text-foreground"
          >
            <PhoneOff className="h-4 w-4" />
          </Button>
        </div>

        {/* Video Grid */}
        <div className="flex-1 p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
            {/* Local Video */}
            <div className="relative bg-muted rounded-lg overflow-hidden border">
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute top-3 left-3 bg-background/80 backdrop-blur-sm text-foreground px-2 py-1 rounded-md text-sm font-medium">
                You
              </div>
              {!isVideoEnabled && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted">
                  <div className="text-center">
                    <VideoOff className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Camera is off</p>
                  </div>
                </div>
              )}
            </div>

            {/* Remote Video */}
            <div className="relative bg-muted rounded-lg overflow-hidden border">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute top-3 left-3 bg-background/80 backdrop-blur-sm text-foreground px-2 py-1 rounded-md text-sm font-medium">
                Remote Participant
              </div>
              <div className="absolute inset-0 flex items-center justify-center bg-muted">
                <div className="text-center">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Video className="w-8 h-8 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground">Waiting for participants to join...</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="p-4 border-t bg-card">
          <div className="flex justify-center items-center gap-3">
            <Button
              variant={isVideoEnabled ? "default" : "destructive"}
              size="lg"
              onClick={toggleVideo}
              className="gap-2 min-w-[120px]"
            >
              {isVideoEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
              {isVideoEnabled ? 'Video On' : 'Video Off'}
            </Button>

            <Button
              variant={isAudioEnabled ? "default" : "destructive"}
              size="lg"
              onClick={toggleAudio}
              className="gap-2 min-w-[120px]"
            >
              {isAudioEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
              {isAudioEnabled ? 'Mic On' : 'Mic Off'}
            </Button>

            <Button
              variant="destructive"
              size="lg"
              onClick={endCall}
              className="gap-2 min-w-[120px]"
            >
              <PhoneOff className="h-4 w-4" />
              End Call
            </Button>
          </div>

          {/* Participants Info */}
          <div className="mt-4 text-center">
            <p className="text-sm text-muted-foreground">
              {participants.length > 0 ? (
                `${participants.length + 1} participants in call`
              ) : (
                'Share this room to invite others to join'
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}