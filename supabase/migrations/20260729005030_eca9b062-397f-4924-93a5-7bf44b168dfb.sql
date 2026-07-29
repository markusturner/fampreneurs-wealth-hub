DO $$
DECLARE
  new_course_id uuid;
  llc_id uuid := 'da97fe97-07c7-4454-a60e-718a0c091053';
  llc_row RECORD;
BEGIN
  SELECT * INTO llc_row FROM public.courses WHERE id = llc_id;

  INSERT INTO public.courses (title, description, instructor, duration, level, price, image_url, category, created_by, status, is_private, community_ids, order_index)
  VALUES ('Succession Planning Course',
          'Family Governance, Family Identity, and Legacy Communication — the succession planning track originally weeks 7–9 of Legacy Launchpad.',
          llc_row.instructor, llc_row.duration, llc_row.level, llc_row.price, llc_row.image_url, llc_row.category,
          llc_row.created_by, COALESCE(llc_row.status, 'published'), COALESCE(llc_row.is_private, false), llc_row.community_ids,
          COALESCE((SELECT MAX(order_index) FROM public.courses), 0) + 1)
  RETURNING id INTO new_course_id;

  -- Move Week #7 -> Month #1 (Family Governance)
  UPDATE public.course_modules
  SET course_id = new_course_id, title = 'Month #1: Family Governance', order_index = 1
  WHERE id = '99d3b109-e2b9-4f77-8ff7-f9611eed05fc';

  -- Move Week #8 -> Month #2 (Family Identity)
  UPDATE public.course_modules
  SET course_id = new_course_id, title = 'Month #2: Family Identity', order_index = 2
  WHERE id = '8a5426d2-ffe3-4cd9-8942-1004652400ab';

  -- Move Week #9 -> Month #3 (Legacy Communication)
  UPDATE public.course_modules
  SET course_id = new_course_id, title = 'Month #3: Legacy Communication', order_index = 3
  WHERE id = '5e40a26b-54bf-4b75-af14-9210372d5188';

  -- Renumber remaining LLC modules: Week 10->7, 11->8, 12->9 (order_index 10->7, 11->8, 12->9)
  UPDATE public.course_modules SET title = 'Week #7: Operations & Taxes',   order_index = 7 WHERE id = '7089d057-0bed-4098-9b43-e2abbf2f22f1';
  UPDATE public.course_modules SET title = 'Week #8: Intellectual Property', order_index = 8 WHERE id = '3d5cb643-17e6-45d3-bb79-1a5647e9051b';
  UPDATE public.course_modules SET title = 'Week #9: Trust Certification',   order_index = 9 WHERE id = 'f35a9e68-7087-433c-99d4-2719f64a8c34';

  -- Keep "Additional Resources" at the end
  UPDATE public.course_modules SET order_index = 10 WHERE id = '55e21aa4-8350-4a8b-8e20-ea44bb4cd15f';
END $$;