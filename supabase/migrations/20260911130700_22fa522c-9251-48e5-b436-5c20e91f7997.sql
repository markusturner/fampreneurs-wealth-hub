
ALTER TABLE public.survey_submissions ALTER COLUMN user_id DROP NOT NULL;

GRANT SELECT ON public.surveys TO anon;
GRANT SELECT ON public.survey_questions TO anon;
GRANT INSERT ON public.survey_submissions TO anon;
GRANT INSERT ON public.survey_answers TO anon;

CREATE POLICY "Public can view active surveys"
ON public.surveys FOR SELECT TO anon
USING (is_active = true);

CREATE POLICY "Public can view active survey questions"
ON public.survey_questions FOR SELECT TO anon
USING (EXISTS (SELECT 1 FROM public.surveys s WHERE s.id = survey_questions.survey_id AND s.is_active = true));

CREATE POLICY "Public can submit surveys"
ON public.survey_submissions FOR INSERT TO anon
WITH CHECK (user_id IS NULL AND EXISTS (SELECT 1 FROM public.surveys s WHERE s.id = survey_submissions.survey_id AND s.is_active = true));

CREATE POLICY "Public can submit answers"
ON public.survey_answers FOR INSERT TO anon
WITH CHECK (EXISTS (SELECT 1 FROM public.survey_submissions s WHERE s.id = survey_answers.submission_id AND s.user_id IS NULL));
