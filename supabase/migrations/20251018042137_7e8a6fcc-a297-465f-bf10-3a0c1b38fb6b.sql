-- Create ai_chat_history table for conversation memory
CREATE TABLE public.ai_chat_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.ai_chat_history ENABLE ROW LEVEL SECURITY;

-- Users can only view their own chat history
CREATE POLICY "Users can view their own chat history"
  ON public.ai_chat_history
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own chat history
CREATE POLICY "Users can insert their own chat history"
  ON public.ai_chat_history
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_ai_chat_history_user_id_created_at 
  ON public.ai_chat_history(user_id, created_at DESC);

-- Auto-cleanup old messages (keep last 50 per user)
CREATE OR REPLACE FUNCTION public.cleanup_old_chat_history()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.ai_chat_history
  WHERE user_id = NEW.user_id
  AND id NOT IN (
    SELECT id FROM public.ai_chat_history
    WHERE user_id = NEW.user_id
    ORDER BY created_at DESC
    LIMIT 50
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER cleanup_chat_history_trigger
  AFTER INSERT ON public.ai_chat_history
  FOR EACH ROW
  EXECUTE FUNCTION public.cleanup_old_chat_history();