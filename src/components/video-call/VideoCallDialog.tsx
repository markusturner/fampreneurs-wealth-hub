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
    initializeCall()
    return () => {
      cleanup()
    }
  }, [])

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
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <Card className="w-full max-w-4xl h-full max-h-[90vh] bg-gray-900 text-white">
        <CardHeader>
          <CardTitle className="text-center">Video Call - Room {roomId}</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col">
          {/* Video Grid */}
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Local Video */}
            <div className="relative bg-gray-800 rounded-lg overflow-hidden">
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 px-2 py-1 rounded text-sm">
                You
              </div>
            </div>

            {/* Remote Video */}
            <div className="relative bg-gray-800 rounded-lg overflow-hidden">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 px-2 py-1 rounded text-sm">
                Remote Participant
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex justify-center items-center gap-4 bg-gray-800 p-4 rounded-lg">
            <Button
              variant={isVideoEnabled ? "default" : "destructive"}
              size="sm"
              onClick={toggleVideo}
              className="gap-2"
            >
              {isVideoEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
              {isVideoEnabled ? 'Video On' : 'Video Off'}
            </Button>

            <Button
              variant={isAudioEnabled ? "default" : "destructive"}
              size="sm"
              onClick={toggleAudio}
              className="gap-2"
            >
              {isAudioEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
              {isAudioEnabled ? 'Mic On' : 'Mic Off'}
            </Button>

            <Button
              variant="destructive"
              size="sm"
              onClick={endCall}
              className="gap-2"
            >
              <PhoneOff className="h-4 w-4" />
              End Call
            </Button>
          </div>

          {/* Participants List */}
          <div className="mt-4 text-center text-sm text-gray-400">
            {participants.length > 0 ? (
              `${participants.length + 1} participants in call`
            ) : (
              'Waiting for participants to join...'
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}