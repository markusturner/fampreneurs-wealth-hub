
ALTER TABLE public.trust_submissions ADD COLUMN IF NOT EXISTS submitter_name text;
ALTER TABLE public.trust_asset_uploads ADD COLUMN IF NOT EXISTS submitter_name text;
ALTER TABLE public.legacy_meeting_uploads ADD COLUMN IF NOT EXISTS submitter_name text;

-- RLS policies for admin to view all trust_asset_uploads
CREATE POLICY "Admins can view all trust_asset_uploads" ON public.trust_asset_uploads FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- RLS policies for admin to view all legacy_meeting_uploads
CREATE POLICY "Admins can view all legacy_meeting_uploads" ON public.legacy_meeting_uploads FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- RLS policies for admin to view all trust_submissions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'trust_submissions' AND policyname = 'Admins can view all trust_submissions'
  ) THEN
    CREATE POLICY "Admins can view all trust_submissions" ON public.trust_submissions FOR SELECT TO authenticated USING (
      EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
    );
  END IF;
END $$;
