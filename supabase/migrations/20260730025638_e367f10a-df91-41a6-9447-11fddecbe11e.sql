INSERT INTO public.survey_questions (survey_id, question_text, question_type, options, section, required, position)
VALUES
 ('11111111-1111-4111-8111-111111111111','On a scale of 1-10, how satisfied are you with your experience so far?','scale','[]'::jsonb,'Satisfaction',true,10),
 ('11111111-1111-4111-8111-111111111111','How supported do you feel by The Fampreneurs team? (1-10)','scale','[]'::jsonb,'Satisfaction',true,11),
 ('11111111-1111-4111-8111-111111111111','Do you feel clear on your next steps inside the program?','single_choice','["Yes","No","Somewhat"]'::jsonb,'Satisfaction',true,12),
 ('11111111-1111-4111-8111-111111111111','What''s one win or breakthrough you''ve had since joining?','long_text','[]'::jsonb,'Satisfaction',true,13),
 ('11111111-1111-4111-8111-111111111111','What''s been your biggest challenge or confusion so far?','long_text','[]'::jsonb,'Satisfaction',true,14),
 ('11111111-1111-4111-8111-111111111111','What''s one thing we can improve to make your experience even better?','long_text','[]'::jsonb,'Satisfaction',true,15),
 ('11111111-1111-4111-8111-111111111111','Anything else you''d like to share?','long_text','[]'::jsonb,'Satisfaction',false,16);