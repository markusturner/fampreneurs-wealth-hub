-- Call rooms table
CREATE TABLE public.call_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  room_name text UNIQUE NOT NULL,
  daily_room_url text,
  community_group_id uuid REFERENCES public.community_groups(id) ON DELETE SET NULL,
  created_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'waiting',
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.call_rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view call rooms" ON public.call_rooms
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Owners and admins can create call rooms" ON public.call_rooms
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = created_by AND (
      public.is_current_user_admin() OR public.is_current_user_owner()
    )
  );

CREATE POLICY "Owners and admins can update call rooms" ON public.call_rooms
  FOR UPDATE TO authenticated
  USING (
    public.is_current_user_admin() OR public.is_current_user_owner()
  );

CREATE POLICY "Owners and admins can delete call rooms" ON public.call_rooms
  FOR DELETE TO authenticated
  USING (
    public.is_current_user_admin() OR public.is_current_user_owner()
  );

-- Call recordings table
CREATE TABLE public.call_recordings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_room_id uuid REFERENCES public.call_rooms(id) ON DELETE CASCADE NOT NULL,
  recording_url text,
  storage_path text,
  duration_seconds integer,
  transcription text,
  summary text,
  status text NOT NULL DEFAULT 'processing',
  community_group_id uuid REFERENCES public.community_groups(id) ON DELETE SET NULL,
  community_post_id uuid REFERENCES public.community_posts(id) ON DELETE SET NULL,
  recorded_by uuid NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.call_recordings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view recordings" ON public.call_recordings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Owners and admins can insert recordings" ON public.call_recordings
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_current_user_admin() OR public.is_current_user_owner()
  );

CREATE POLICY "Owners and admins can update recordings" ON public.call_recordings
  FOR UPDATE TO authenticated
  USING (
    public.is_current_user_admin() OR public.is_current_user_owner()
  );

-- Call participants tracking
CREATE TABLE public.call_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_room_id uuid REFERENCES public.call_rooms(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  joined_at timestamptz DEFAULT now(),
  left_at timestamptz,
  is_admin_or_owner boolean DEFAULT false
);

ALTER TABLE public.call_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view participants" ON public.call_participants
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert their own participation" ON public.call_participants
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own participation" ON public.call_participants
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- Storage bucket for recordings
INSERT INTO storage.buckets (id, name, public) VALUES ('call-recordings', 'call-recordings', false);

CREATE POLICY "Authenticated users can read recordings" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'call-recordings');

CREATE POLICY "Admins can upload recordings" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'call-recordings' AND (public.is_current_user_admin() OR public.is_current_user_owner()));

-- Triggers
CREATE TRIGGER update_call_rooms_updated_at BEFORE UPDATE ON public.call_rooms
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_call_recordings_updated_at BEFORE UPDATE ON public.call_recordings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();