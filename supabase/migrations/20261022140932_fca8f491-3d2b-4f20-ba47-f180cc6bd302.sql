UPDATE public.community_groups SET name='The Legacy InnerCircle' WHERE name IN ('The Succession Society','The Family Fortune Mastermind');
UPDATE public.community_groups SET name='The Trust Vault' WHERE name='The Family Vault';
UPDATE public.profiles SET program_name = replace(replace(replace(program_name,'The Family Fortune Mastermind','The Legacy InnerCircle'),'The Succession Society','The Legacy InnerCircle'),'The Family Vault','The Trust Vault')
 WHERE program_name ~ '(Family Fortune Mastermind|Succession Society|Family Vault)';
UPDATE public.profiles SET program_name = NULLIF(trim(both ', ' from regexp_replace(program_name,'(The )?Family Business University','','g')),'')
 WHERE program_name ILIKE '%Family Business University%';

CREATE OR REPLACE FUNCTION public.program_display_name(p_code text) RETURNS text LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $$
  SELECT CASE p_code WHEN 'fbu' THEN 'the Community' WHEN 'tfv' THEN 'The Trust Vault' WHEN 'tfba' THEN 'The Private Estate Accelerator' WHEN 'tffm' THEN 'The Legacy InnerCircle' ELSE NULL END $$;
CREATE OR REPLACE FUNCTION public.program_group_names(p_key text) RETURNS text[] LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $$
  SELECT CASE
    WHEN p_key IN ('fbu','Community') THEN ARRAY['Community']
    WHEN p_key IN ('tfv','ttv','The Trust Vault','Trust Vault','The Family Vault') THEN ARRAY['The Trust Vault']
    WHEN p_key IN ('tfba','pea','The Private Estate Accelerator','Private Estate Accelerator','The Family Business Accelerator') THEN ARRAY['The Private Estate Accelerator','The Family Business Accelerator']
    WHEN p_key IN ('tffm','tss','The Legacy InnerCircle','Legacy InnerCircle','The Succession Society','Succession Society','The Family Fortune Mastermind') THEN ARRAY['The Legacy InnerCircle']
    WHEN p_key IN ('vip','The Family Legacy: VIP Weekend') THEN ARRAY['The Family Legacy: VIP Weekend']
    ELSE ARRAY[p_key] END $$;

CREATE TABLE public.community_post_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id)
);
GRANT SELECT, INSERT ON public.community_post_views TO authenticated;
GRANT ALL ON public.community_post_views TO service_role;
ALTER TABLE public.community_post_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members record own views" ON public.community_post_views FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins and owner see views" ON public.community_post_views FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_current_user_admin() OR public.is_current_user_owner());
CREATE INDEX community_post_views_post_idx ON public.community_post_views(post_id);

CREATE TABLE public.fathom_community_posts (
  recording_id text PRIMARY KEY,
  post_id uuid REFERENCES public.community_posts(id) ON DELETE SET NULL,
  program text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.fathom_community_posts TO service_role;
ALTER TABLE public.fathom_community_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read posted recordings" ON public.fathom_community_posts FOR SELECT TO authenticated USING (public.is_current_user_admin() OR public.is_current_user_owner());

SELECT cron.schedule('ttv-fathom-recordings-hourly','0 * * * *', $$SELECT net.http_post(url:='https://tbofkvyezmpovoezjyyl.supabase.co/functions/v1/ttv-recordings-sync',headers:='{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRib2Zrdnllem1wb3ZvZXpqeXlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2OTc0NTYsImV4cCI6MjA2ODI3MzQ1Nn0.vsJykXf_N7myBg4iKUJevbXl8FBne4rbv-ruJuuz288"}'::jsonb,body:='{}'::jsonb)$$);