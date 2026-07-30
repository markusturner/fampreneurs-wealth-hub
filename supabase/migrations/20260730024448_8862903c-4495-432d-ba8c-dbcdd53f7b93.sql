CREATE TABLE public.surveys (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  is_active boolean not null default true,
  is_weekly boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

CREATE TABLE public.survey_questions (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references public.surveys(id) on delete cascade,
  question_text text not null,
  question_type text not null default 'short_text',
  options jsonb not null default '[]'::jsonb,
  section text,
  required boolean not null default true,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

CREATE TABLE public.survey_submissions (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references public.surveys(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  week_of date not null default (now() at time zone 'utc')::date,
  submitted_at timestamptz not null default now()
);

CREATE TABLE public.survey_answers (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.survey_submissions(id) on delete cascade,
  question_id uuid not null references public.survey_questions(id) on delete cascade,
  answer_text text,
  answer_number numeric,
  created_at timestamptz not null default now()
);

CREATE INDEX idx_survey_questions_survey ON public.survey_questions(survey_id, position);
CREATE INDEX idx_survey_submissions_survey ON public.survey_submissions(survey_id, user_id);
CREATE INDEX idx_survey_answers_submission ON public.survey_answers(submission_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.surveys TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.survey_questions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.survey_submissions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.survey_answers TO authenticated;
GRANT ALL ON public.surveys TO service_role;
GRANT ALL ON public.survey_questions TO service_role;
GRANT ALL ON public.survey_submissions TO service_role;
GRANT ALL ON public.survey_answers TO service_role;

ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone signed in can view surveys" ON public.surveys FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage surveys" ON public.surveys FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner'));

CREATE POLICY "Anyone signed in can view questions" ON public.survey_questions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage questions" ON public.survey_questions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner'));

CREATE POLICY "Users view own submissions" ON public.survey_submissions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner'));
CREATE POLICY "Users create own submissions" ON public.survey_submissions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins delete submissions" ON public.survey_submissions FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner'));

CREATE POLICY "Users view own answers" ON public.survey_answers FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.survey_submissions s WHERE s.id = submission_id AND (s.user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner'))));
CREATE POLICY "Users create own answers" ON public.survey_answers FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.survey_submissions s WHERE s.id = submission_id AND s.user_id = auth.uid()));

CREATE TRIGGER update_surveys_updated_at BEFORE UPDATE ON public.surveys
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.surveys (id, title, description, is_active, is_weekly) VALUES
('11111111-1111-4111-8111-111111111111','Weekly Check-In Questionnaire','Please take 5 minutes to answer these questions honestly each week, your feedback helps us support you and keep you moving forward!', true, true),
('22222222-2222-4222-8222-222222222222','The Fampreneurs Satisfaction Survey','This satisfaction survey is for us to get some feedback from you so we can know how we can further improve our company to give you a better experience.', true, false);

INSERT INTO public.survey_questions (survey_id, question_text, question_type, options, section, required, position) VALUES
('11111111-1111-4111-8111-111111111111','What was the #1 thing you were grateful for from this week''s training?','short_text','[]','Check-In',true,1),
('11111111-1111-4111-8111-111111111111','How would you rate your training overall this week (0-10)?','scale','[]','Check-In',true,2),
('11111111-1111-4111-8111-111111111111','How would you rate your energy level this week (0-10)?','scale','[]','Check-In',true,3),
('11111111-1111-4111-8111-111111111111','Did you experience any setbacks this past week? How would you rate (0-10)?','scale','[]','Check-In',true,4),
('11111111-1111-4111-8111-111111111111','Were you able to do all of your session? If no, why not?','long_text','[]','Check-In',true,5),
('11111111-1111-4111-8111-111111111111','What are your goals for this week?','long_text','[]','Check-In',true,6),
('11111111-1111-4111-8111-111111111111','Do you have anything coming up this week that could stop you from hitting your goals?','long_text','[]','Check-In',true,7),
('11111111-1111-4111-8111-111111111111','Did you complete your main action item for the week?','single_choice','["Yes","No"]','Check-In',true,8),
('11111111-1111-4111-8111-111111111111','Did you face any roadblocks or get stuck on anything (logistics, family buy-in, documents, etc.)?','long_text','[]','Roadblocks',true,9),
('22222222-2222-4222-8222-222222222222','On a scale of 1-10, how satisfied are you with your experience so far?','scale','[]','Satisfaction',true,1),
('22222222-2222-4222-8222-222222222222','How supported do you feel by The Fampreneurs team? (1-10)','scale','[]','Satisfaction',true,2),
('22222222-2222-4222-8222-222222222222','Do you feel clear on your next steps inside the program?','single_choice','["Yes","No","Somewhat"]','Satisfaction',true,3),
('22222222-2222-4222-8222-222222222222','What''s one win or breakthrough you''ve had since joining?','long_text','[]','Satisfaction',true,4),
('22222222-2222-4222-8222-222222222222','What''s been your biggest challenge or confusion so far?','long_text','[]','Satisfaction',true,5),
('22222222-2222-4222-8222-222222222222','What''s one thing we can improve to make your experience even better?','long_text','[]','Satisfaction',true,6),
('22222222-2222-4222-8222-222222222222','Anything else you''d like to share?','long_text','[]','Satisfaction',false,7);