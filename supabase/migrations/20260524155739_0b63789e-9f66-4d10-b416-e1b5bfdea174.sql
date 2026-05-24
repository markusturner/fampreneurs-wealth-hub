
-- 1. calendar_integrations: remove client SELECT access to OAuth tokens
DROP POLICY IF EXISTS "Users can view own calendar integrations" ON public.calendar_integrations;
REVOKE SELECT ON public.calendar_integrations FROM authenticated, anon;

-- 2. course_resources: restrict SELECT to authenticated
DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='course_resources' AND cmd='SELECT' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.course_resources', p.policyname);
  END LOOP;
END $$;
CREATE POLICY "Authenticated can view course resources"
ON public.course_resources FOR SELECT TO authenticated USING (true);

-- 3. Restrict operational tables to authenticated role
-- announcements
DROP POLICY IF EXISTS "Users can view announcements" ON public.announcements;
CREATE POLICY "Users can view announcements" ON public.announcements FOR SELECT TO authenticated USING (true);

-- programs
DO $$ DECLARE p record; BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='programs' AND cmd='SELECT' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.programs', p.policyname);
  END LOOP;
END $$;
CREATE POLICY "Authenticated can view programs" ON public.programs FOR SELECT TO authenticated USING (true);

-- fulfillment_stages
DO $$ DECLARE p record; BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='fulfillment_stages' AND cmd='SELECT' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.fulfillment_stages', p.policyname);
  END LOOP;
END $$;
CREATE POLICY "Authenticated can view fulfillment stages" ON public.fulfillment_stages FOR SELECT TO authenticated USING (true);

-- categories
DROP POLICY IF EXISTS "Categories are viewable by everyone" ON public.categories;
CREATE POLICY "Authenticated can view categories" ON public.categories FOR SELECT TO authenticated USING (true);

-- tutorial_videos
DO $$ DECLARE p record; BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='tutorial_videos' AND cmd='SELECT' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.tutorial_videos', p.policyname);
  END LOOP;
END $$;
CREATE POLICY "Authenticated can view active tutorial videos" ON public.tutorial_videos FOR SELECT TO authenticated USING (is_active = true);

-- stories
DO $$ DECLARE p record; BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='stories' AND cmd='SELECT' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.stories', p.policyname);
  END LOOP;
END $$;
CREATE POLICY "Authenticated can view active stories" ON public.stories FOR SELECT TO authenticated USING (is_active AND expires_at > now());

-- channels
DROP POLICY IF EXISTS "Users can view channels" ON public.channels;
CREATE POLICY "Users can view channels" ON public.channels FOR SELECT TO authenticated USING ((NOT is_private) OR (created_by = auth.uid()));

-- video_comments
DO $$ DECLARE p record; BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='video_comments' AND cmd='SELECT' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.video_comments', p.policyname);
  END LOOP;
END $$;
CREATE POLICY "Authenticated can view video comments" ON public.video_comments FOR SELECT TO authenticated USING (true);

-- video_likes
DO $$ DECLARE p record; BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='video_likes' AND cmd='SELECT' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.video_likes', p.policyname);
  END LOOP;
END $$;
CREATE POLICY "Authenticated can view video likes" ON public.video_likes FOR SELECT TO authenticated USING (true);

-- course_comments
DO $$ DECLARE p record; BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='course_comments' AND cmd='SELECT' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.course_comments', p.policyname);
  END LOOP;
END $$;
CREATE POLICY "Authenticated can view course comments" ON public.course_comments FOR SELECT TO authenticated USING (true);

-- course_comment_likes
DO $$ DECLARE p record; BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='course_comment_likes' AND cmd='SELECT' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.course_comment_likes', p.policyname);
  END LOOP;
END $$;
CREATE POLICY "Authenticated can view course comment likes" ON public.course_comment_likes FOR SELECT TO authenticated USING (true);

-- community_comment_reactions
DO $$ DECLARE p record; BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='community_comment_reactions' AND cmd='SELECT' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.community_comment_reactions', p.policyname);
  END LOOP;
END $$;
CREATE POLICY "Authenticated can view community comment reactions" ON public.community_comment_reactions FOR SELECT TO authenticated USING (true);

-- 4. verification_codes: deny-all client policy (service role bypasses RLS)
CREATE POLICY "No client access to verification codes"
ON public.verification_codes FOR ALL TO authenticated, anon USING (false) WITH CHECK (false);

-- 5. Remove sensitive tables from realtime publication
ALTER PUBLICATION supabase_realtime DROP TABLE public.subscribers;
ALTER PUBLICATION supabase_realtime DROP TABLE public.coaching_call_recordings;

-- 6. realtime.messages: deny anon by default (authenticated only baseline)
DO $$ BEGIN
  EXECUTE 'CREATE POLICY "Authenticated only realtime" ON realtime.messages FOR SELECT TO authenticated USING (true)';
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'skipping realtime.messages policy (insufficient privilege)';
WHEN duplicate_object THEN
  NULL;
END $$;
