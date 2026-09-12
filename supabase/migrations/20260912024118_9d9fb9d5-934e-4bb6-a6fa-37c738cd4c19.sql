CREATE OR REPLACE FUNCTION public.submit_anonymous_survey(p_survey_id uuid, p_answers jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_submission_id uuid;
  v_answer jsonb;
BEGIN
  -- Only allow submissions to active surveys
  IF NOT EXISTS (SELECT 1 FROM public.surveys WHERE id = p_survey_id AND is_active = true) THEN
    RAISE EXCEPTION 'Survey is not available';
  END IF;

  INSERT INTO public.survey_submissions (survey_id, user_id)
  VALUES (p_survey_id, NULL)
  RETURNING id INTO v_submission_id;

  IF p_answers IS NOT NULL THEN
    FOR v_answer IN SELECT * FROM jsonb_array_elements(p_answers)
    LOOP
      INSERT INTO public.survey_answers (submission_id, question_id, answer_text, answer_number)
      VALUES (
        v_submission_id,
        (v_answer->>'question_id')::uuid,
        NULLIF(v_answer->>'answer_text', ''),
        CASE WHEN v_answer->>'answer_number' IS NOT NULL THEN (v_answer->>'answer_number')::numeric ELSE NULL END
      );
    END LOOP;
  END IF;

  RETURN v_submission_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_anonymous_survey(uuid, jsonb) TO anon;
GRANT EXECUTE ON FUNCTION public.submit_anonymous_survey(uuid, jsonb) TO authenticated;