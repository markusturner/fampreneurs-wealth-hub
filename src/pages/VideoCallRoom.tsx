import React, { useEffect, useRef, useState, useCallback } from 'react';
import DailyIframe, { DailyCall } from '@daily-co/daily-js';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Video, VideoOff, Mic, MicOff, PhoneOff, MonitorUp, Circle, Users, Copy, ExternalLink, Plus, Clock, Download, MessageSquare } from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';
import { useOwnerRole } from '@/hooks/useOwnerRole';
import { format } from 'date-fns';

interface CallRoom {
  id: string;
  title: string;
  description: string | null;
  room_name: string;
  daily_room_url: string | null;
  community_group_id: string | null;
  created_by: string;
  status: string;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
}

interface Recording {
  id: string;
  call_room_id: string;
  recording_url: string | null;
  duration_seconds: number | null;
  transcription: string | null;
  summary: string | null;
  status: string;
  community_group_id: string | null;
  community_post_id: string | null;
  expires_at: string;
  created_at: string;
}

interface CommunityGroup {
  id: string;
  name: string;
}

const VideoCallRoom = () => {
  const { user, profile } = useAuth();
  const { isAdmin } = useUserRole();
  const { isOwner } = useOwnerRole(user?.id ?? null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const roomIdParam = searchParams.get('room');

  const isAdminOrOwner = isAdmin || isOwner;

  // State
  const [rooms, setRooms] = useState<CallRoom[]>([]);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [communityGroups, setCommunityGroups] = useState<CommunityGroup[]>([]);
  const [activeRoom, setActiveRoom] = useState<CallRoom | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showPostDialog, setShowPostDialog] = useState(false);
  const [selectedRecording, setSelectedRecording] = useState<Recording | null>(null);
  const [postContent, setPostContent] = useState('');
  const [loading, setLoading] = useState(true);

  // Create form
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCommunityId, setFormCommunityId] = useState('');
  const [creating, setCreating] = useState(false);

  // Daily call state
  const callContainerRef = useRef<HTMLDivElement>(null);
  const callObjectRef = useRef<DailyCall | null>(null);
  const [inCall, setInCall] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [participantCount, setParticipantCount] = useState(0);

  // Fetch data
  useEffect(() => {
    fetchRooms();
    fetchRecordings();
    fetchCommunityGroups();
  }, []);

  // Auto-join room from URL
  useEffect(() => {
    if (roomIdParam && rooms.length > 0) {
      const room = rooms.find(r => r.id === roomIdParam);
      if (room && room.daily_room_url) {
        joinCall(room);
      }
    }
  }, [roomIdParam, rooms]);

  const fetchRooms = async () => {
    const { data } = await supabase
      .from('call_rooms')
      .select('*')
      .order('created_at', { ascending: false });
    setRooms((data as any[]) || []);
    setLoading(false);
  };

  const fetchRecordings = async () => {
    const { data } = await supabase
      .from('call_recordings')
      .select('*')
      .neq('status', 'expired')
      .order('created_at', { ascending: false });
    setRecordings((data as any[]) || []);
  };

  const fetchCommunityGroups = async () => {
    const { data } = await supabase
      .from('community_groups')
      .select('id, name')
      .order('name');
    setCommunityGroups(data || []);
  };

  // Create room
  const handleCreateRoom = async () => {
    if (!formTitle.trim()) {
      toast({ title: 'Title required', variant: 'destructive' });
      return;
    }
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke('daily-create-room', {
        body: {
          title: formTitle.trim(),
          description: formDescription.trim() || null,
          communityGroupId: formCommunityId || null,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({ title: 'Room created!', description: data.recordingEnabled ? 'Cloud recording enabled' : 'Recording not available (upgrade Daily.co plan)' });
      setShowCreateDialog(false);
      setFormTitle('');
      setFormDescription('');
      setFormCommunityId('');
      fetchRooms();

      // Auto-join
      if (data?.room) {
        joinCall(data.room);
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  // Join call
  const joinCall = useCallback(async (room: CallRoom) => {
    if (!room.daily_room_url || !callContainerRef.current) return;

    setActiveRoom(room);

    try {
      const callObject = DailyIframe.createCallObject({
        iframeStyle: {
          width: '100%',
          height: '100%',
          border: 'none',
          borderRadius: '12px',
        },
      });

      callObject.on('joined-meeting', () => {
        setInCall(true);
        // Track participation
        supabase.from('call_participants').insert({
          call_room_id: room.id,
          user_id: user?.id,
          is_admin_or_owner: isAdminOrOwner,
        } as any);
      });

      callObject.on('left-meeting', () => {
        setInCall(false);
        setActiveRoom(null);
        // Update leave time
        supabase.from('call_participants')
          .update({ left_at: new Date().toISOString() } as any)
          .eq('call_room_id', room.id)
          .eq('user_id', user?.id ?? '');
      });

      callObject.on('participant-counts-updated', (event: any) => {
        setParticipantCount(event?.participantCounts?.present || 0);
      });

      callObject.on('error', (error: any) => {
        console.error('Daily call error:', error);
        toast({ title: 'Call Error', description: 'An error occurred during the call', variant: 'destructive' });
      });

      await callObject.join({
        url: room.daily_room_url,
        userName: profile?.display_name || 'User',
      });

      if (callContainerRef.current) {
        callContainerRef.current.appendChild(callObject.iframe());
      }

      callObjectRef.current = callObject;

      // If admin/owner, auto-start recording
      if (isAdminOrOwner) {
        try {
          await supabase.functions.invoke('daily-manage-recording', {
            body: { action: 'start', roomName: room.room_name },
          });
          setIsRecording(true);
        } catch {
          console.log('Recording not available (free plan)');
        }
      }
    } catch (err: any) {
      toast({ title: 'Failed to join', description: err.message, variant: 'destructive' });
    }
  }, [user, profile, isAdminOrOwner, toast]);

  // Leave call
  const leaveCall = async () => {
    if (callObjectRef.current) {
      // Stop recording if active
      if (isRecording && activeRoom) {
        try {
          await supabase.functions.invoke('daily-manage-recording', {
            body: { action: 'stop', roomName: activeRoom.room_name },
          });
        } catch {}
      }
      await callObjectRef.current.leave();
      callObjectRef.current.destroy();
      callObjectRef.current = null;
    }
    setInCall(false);
    setActiveRoom(null);
    setIsRecording(false);
    setIsScreenSharing(false);
  };

  // Toggle controls
  const toggleVideo = () => {
    callObjectRef.current?.setLocalVideo(!isVideoOn);
    setIsVideoOn(!isVideoOn);
  };

  const toggleAudio = () => {
    callObjectRef.current?.setLocalAudio(!isAudioOn);
    setIsAudioOn(!isAudioOn);
  };

  const toggleScreenShare = async () => {
    if (!callObjectRef.current) return;
    if (isScreenSharing) {
      callObjectRef.current.stopScreenShare();
    } else {
      callObjectRef.current.startScreenShare();
    }
    setIsScreenSharing(!isScreenSharing);
  };

  // Post recording to community
  const handlePostRecording = async () => {
    if (!selectedRecording || !postContent.trim()) return;

    try {
      const communityId = selectedRecording.community_group_id;
      // Find group to get program mapping
      const group = communityGroups.find(g => g.id === communityId);
      const programMap: Record<string, string> = {
        'Family Business University': 'fbu',
        'The Family Vault': 'tfv',
        'The Family Business Accelerator': 'tfba',
        'The Family Fortune Mastermind': 'tffm',
      };
      const program = group ? programMap[group.name] || null : null;

      const recordingLink = selectedRecording.recording_url
        ? `\n\n📹 [Watch Recording](${selectedRecording.recording_url}) — Expires ${format(new Date(selectedRecording.expires_at), 'MMM d, yyyy')}`
        : '';

      const summaryText = selectedRecording.summary
        ? `\n\n📝 **Summary:** ${selectedRecording.summary}`
        : '';

      const { data: post, error } = await supabase
        .from('community_posts')
        .insert({
          content: postContent.trim() + recordingLink + summaryText,
          user_id: user?.id,
          program,
          category: 'general',
          channel_id: null,
        })
        .select()
        .single();

      if (error) throw error;

      // Link post to recording
      await supabase
        .from('call_recordings')
        .update({ community_post_id: post.id } as any)
        .eq('id', selectedRecording.id);

      toast({ title: 'Posted!', description: 'Recording posted to the community' });
      setShowPostDialog(false);
      setPostContent('');
      setSelectedRecording(null);
      fetchRecordings();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  // Copy room link
  const copyRoomLink = (room: CallRoom) => {
    const link = `${window.location.origin}/video-call?room=${room.id}`;
    navigator.clipboard.writeText(link);
    toast({ title: 'Link copied!' });
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '--';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const getDaysUntilExpiry = (expiresAt: string) => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  // In-call view
  if (inCall && activeRoom) {
    return (
      <div className="fixed inset-0 bg-background z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-card">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
            <h2 className="font-semibold text-lg">{activeRoom.title}</h2>
            {isRecording && (
              <Badge variant="destructive" className="gap-1">
                <Circle className="h-2 w-2 fill-current" /> REC
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              <Users className="h-3 w-3" /> {participantCount}
            </Badge>
            <Button variant="ghost" size="sm" onClick={() => copyRoomLink(activeRoom)}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Video container */}
        <div className="flex-1 bg-muted" ref={callContainerRef} />

        {/* Controls */}
        <div className="flex items-center justify-center gap-3 p-4 border-t bg-card">
          <Button variant={isAudioOn ? 'default' : 'destructive'} size="lg" onClick={toggleAudio} className="gap-2">
            {isAudioOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
            {isAudioOn ? 'Mute' : 'Unmute'}
          </Button>
          <Button variant={isVideoOn ? 'default' : 'destructive'} size="lg" onClick={toggleVideo} className="gap-2">
            {isVideoOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
            {isVideoOn ? 'Stop Video' : 'Start Video'}
          </Button>
          <Button variant={isScreenSharing ? 'secondary' : 'outline'} size="lg" onClick={toggleScreenShare} className="gap-2">
            <MonitorUp className="h-4 w-4" />
            {isScreenSharing ? 'Stop Share' : 'Share Screen'}
          </Button>
          <Button variant="destructive" size="lg" onClick={leaveCall} className="gap-2">
            <PhoneOff className="h-4 w-4" />
            Leave Call
          </Button>
        </div>
      </div>
    );
  }

  // Lobby / Room list view
  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Video Calls</h1>
          <p className="text-muted-foreground text-sm">Join or start a live video call</p>
        </div>
        {isAdminOrOwner && (
          <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Start Call
          </Button>
        )}
      </div>

      {/* Active / Waiting Rooms */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Live & Upcoming Calls</h2>
        {rooms.filter(r => r.status !== 'ended').length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Video className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No active calls right now</p>
              {isAdminOrOwner && <p className="text-sm mt-1">Click "Start Call" to create one</p>}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {rooms.filter(r => r.status !== 'ended').map(room => (
              <Card key={room.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{room.title}</CardTitle>
                    <Badge variant={room.status === 'active' ? 'default' : 'secondary'}>
                      {room.status === 'active' ? '🟢 Live' : '⏳ Waiting'}
                    </Badge>
                  </div>
                  {room.description && <CardDescription className="text-xs">{room.description}</CardDescription>}
                </CardHeader>
                <CardContent className="pt-2 space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Created {format(new Date(room.created_at), 'MMM d, h:mm a')}
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1 gap-1" onClick={() => joinCall(room)}>
                      <Video className="h-3 w-3" />
                      Join Call
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => copyRoomLink(room)}>
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Recordings */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Recordings</h2>
        {recordings.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <p>No recordings yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {recordings.map(rec => (
              <Card key={rec.id}>
                <CardContent className="py-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Video className="h-4 w-4 text-primary" />
                      <span className="font-medium text-sm">
                        {rooms.find(r => r.id === rec.call_room_id)?.title || 'Recording'}
                      </span>
                    </div>
                    <Badge variant={rec.status === 'ready' ? 'default' : 'secondary'}>
                      {rec.status}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatDuration(rec.duration_seconds)}</span>
                    <span>Expires in {getDaysUntilExpiry(rec.expires_at)} days</span>
                  </div>

                  {rec.summary && (
                    <p className="text-xs text-muted-foreground bg-muted/50 rounded p-2">{rec.summary}</p>
                  )}

                  <div className="flex gap-2">
                    {rec.recording_url && (
                      <Button size="sm" variant="outline" className="gap-1" asChild>
                        <a href={rec.recording_url} target="_blank" rel="noopener noreferrer">
                          <Download className="h-3 w-3" /> Download
                        </a>
                      </Button>
                    )}
                    {isAdminOrOwner && !rec.community_post_id && (
                      <Button size="sm" variant="outline" className="gap-1" onClick={() => {
                        setSelectedRecording(rec);
                        setPostContent(`📹 Call Recording: ${rooms.find(r => r.id === rec.call_room_id)?.title || 'Video Call'}`);
                        setShowPostDialog(true);
                      }}>
                        <MessageSquare className="h-3 w-3" /> Post to Community
                      </Button>
                    )}
                    {rec.community_post_id && (
                      <Badge variant="secondary" className="text-xs">✅ Posted</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create Room Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start a Video Call</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="e.g. Weekly Family Meeting" />
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Textarea value={formDescription} onChange={e => setFormDescription(e.target.value)} placeholder="What's this call about?" rows={2} />
            </div>
            <div>
              <Label>Community (optional)</Label>
              <Select value={formCommunityId} onValueChange={setFormCommunityId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a community to post recording to" />
                </SelectTrigger>
                <SelectContent>
                  {communityGroups.map(g => (
                    <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">Recording will be suggested to post here when ready</p>
            </div>
            <Button onClick={handleCreateRoom} disabled={creating} className="w-full">
              {creating ? 'Creating...' : 'Start Call'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Post Recording Dialog */}
      <Dialog open={showPostDialog} onOpenChange={setShowPostDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Post Recording to Community</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Post Content</Label>
              <Textarea value={postContent} onChange={e => setPostContent(e.target.value)} rows={4} placeholder="Add your message..." />
              <p className="text-xs text-muted-foreground mt-1">Recording link and summary will be appended automatically</p>
            </div>
            <Button onClick={handlePostRecording} className="w-full">Post to Community</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VideoCallRoom;
