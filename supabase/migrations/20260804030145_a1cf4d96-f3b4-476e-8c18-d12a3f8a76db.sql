WITH lessons AS (
  SELECT v.id, v.title, v.description, v.order_index, v.created_by
  FROM public.course_videos v
  WHERE v.module_id = 'ae7559fe-59a9-41ec-8a20-7b8e1a84b5ad'
),
res AS (
  SELECT r.lesson_id,
         string_agg('<li><a href="' || COALESCE(r.url, '') || '" target="_blank" rel="noopener noreferrer">' || r.title || '</a></li>', '' ORDER BY r.order_index) AS items
  FROM public.course_resources r
  WHERE r.lesson_id IN (SELECT id FROM lessons) AND COALESCE(r.url, '') <> ''
  GROUP BY r.lesson_id
),
owner AS (
  SELECT user_id FROM public.user_roles WHERE role = 'owner' LIMIT 1
),
ins AS (
  INSERT INTO public.sops (title, description, content, created_by, program_tags, order_index, status)
  SELECT l.title,
         'Standard operating procedure from the Legacy Launchpad Core Trust Setup module.',
         COALESCE(l.description, '') || COALESCE('<hr /><h3>Resources</h3><ul>' || res.items || '</ul>', ''),
         COALESCE(l.created_by, (SELECT user_id FROM owner)),
         ARRAY['tfv','tfba','tffm']::text[],
         1000 + l.order_index,
         'published'
  FROM lessons l
  LEFT JOIN res ON res.lesson_id = l.id
  WHERE NOT EXISTS (SELECT 1 FROM public.sops s WHERE s.title = l.title)
  RETURNING id, title
)
INSERT INTO public.sop_lesson_links (sop_id, lesson_id, link_type)
SELECT ins.id, l.id, 'source'
FROM ins JOIN lessons l ON l.title = ins.title;