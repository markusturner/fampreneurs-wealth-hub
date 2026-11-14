CREATE TABLE public.markus_user_knowledge (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.chat_projects(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  content text NOT NULL CHECK (char_length(content) <= 60000),
  source_type text NOT NULL DEFAULT 'note' CHECK (source_type IN ('note','file')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.markus_user_knowledge TO authenticated;
GRANT ALL ON public.markus_user_knowledge TO service_role;
ALTER TABLE public.markus_user_knowledge ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage their Markus knowledge" ON public.markus_user_knowledge
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX markus_user_knowledge_user_idx ON public.markus_user_knowledge(user_id, project_id);