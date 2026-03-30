
-- Table to persist AI persona settings (instructions + metadata)
CREATE TABLE public.ai_persona_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  persona TEXT NOT NULL UNIQUE,
  instructions TEXT DEFAULT '',
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.ai_persona_settings ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read
CREATE POLICY "Authenticated users can read persona settings"
  ON public.ai_persona_settings FOR SELECT TO authenticated USING (true);

-- Only admins/owners can update
CREATE POLICY "Admins can manage persona settings"
  ON public.ai_persona_settings FOR ALL TO authenticated
  USING (public.is_current_user_admin() OR public.is_current_user_owner())
  WITH CHECK (public.is_current_user_admin() OR public.is_current_user_owner());

-- Seed default rows
INSERT INTO public.ai_persona_settings (persona, instructions) VALUES
  ('rachel', ''),
  ('asset_protection', ''),
  ('business_structure', ''),
  ('trust_writer', '');

-- Storage bucket for persona documents
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('ai-persona-documents', 'ai-persona-documents', false, 10485760)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Authenticated users can read persona docs"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'ai-persona-documents');

CREATE POLICY "Admins can upload persona docs"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'ai-persona-documents' AND (public.is_current_user_admin() OR public.is_current_user_owner()));

CREATE POLICY "Admins can delete persona docs"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'ai-persona-documents' AND (public.is_current_user_admin() OR public.is_current_user_owner()));
