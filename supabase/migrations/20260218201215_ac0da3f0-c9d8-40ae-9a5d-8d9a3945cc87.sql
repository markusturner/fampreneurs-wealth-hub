
-- Chat projects (folders)
CREATE TABLE public.chat_projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own chat projects"
  ON public.chat_projects FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Chat conversations
CREATE TABLE public.chat_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  project_id UUID REFERENCES public.chat_projects(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT 'New Chat',
  persona TEXT NOT NULL DEFAULT 'rachel',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own chat conversations"
  ON public.chat_conversations FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Link existing chat history to conversations
ALTER TABLE public.ai_chat_history ADD COLUMN conversation_id UUID REFERENCES public.chat_conversations(id) ON DELETE CASCADE;

-- Triggers for updated_at
CREATE TRIGGER update_chat_projects_updated_at
  BEFORE UPDATE ON public.chat_projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_chat_conversations_updated_at
  BEFORE UPDATE ON public.chat_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
