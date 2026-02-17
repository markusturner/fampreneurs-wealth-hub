
-- Add category column to community_posts
ALTER TABLE public.community_posts ADD COLUMN IF NOT EXISTS category text DEFAULT 'discussion';

-- Add upgrade video URL to app_settings
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS upgrade_video_url text;

-- Add audio_url column to community_comments for audio/video in comments
ALTER TABLE public.community_comments ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE public.community_comments ADD COLUMN IF NOT EXISTS audio_url text;
ALTER TABLE public.community_comments ADD COLUMN IF NOT EXISTS video_url text;
