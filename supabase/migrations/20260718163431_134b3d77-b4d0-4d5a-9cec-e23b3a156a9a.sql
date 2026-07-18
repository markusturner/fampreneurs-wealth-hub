
CREATE TABLE public.lesson_transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES public.course_videos(id) ON DELETE CASCADE,
  language TEXT NOT NULL,
  is_source BOOLEAN NOT NULL DEFAULT false,
  segments JSONB NOT NULL DEFAULT '[]'::jsonb,
  full_text TEXT,
  status TEXT NOT NULL DEFAULT 'ready',
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (lesson_id, language)
);

GRANT SELECT ON public.lesson_transcripts TO authenticated;
GRANT ALL ON public.lesson_transcripts TO service_role;

ALTER TABLE public.lesson_transcripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read transcripts"
  ON public.lesson_transcripts FOR SELECT
  TO authenticated
  USING (true);

CREATE INDEX idx_lesson_transcripts_lesson ON public.lesson_transcripts(lesson_id);
