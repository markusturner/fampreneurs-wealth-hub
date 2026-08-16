DELETE FROM public.community_posts AS target
WHERE target.program = 'tffm'
  AND EXISTS (
    SELECT 1
    FROM public.community_posts AS sibling
    WHERE sibling.program <> target.program
      AND sibling.user_id = target.user_id
      AND sibling.created_at = target.created_at
      AND sibling.title IS NOT DISTINCT FROM target.title
      AND sibling.content = target.content
  );