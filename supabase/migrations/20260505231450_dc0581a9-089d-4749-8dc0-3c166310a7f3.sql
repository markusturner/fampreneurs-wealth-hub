UPDATE public.community_posts
SET title = 'Welcome to the Community! 🎉 Start Here'
WHERE title IS NULL
  AND content ILIKE '%Congratulations on Joining%'
  AND content ILIKE '%Start Here%';