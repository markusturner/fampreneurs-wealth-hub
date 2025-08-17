-- Create search indexes for improved performance
-- This migration adds database indexes to optimize search performance

-- Create GIN indexes for full-text search on content columns
CREATE INDEX IF NOT EXISTS idx_community_posts_content_search 
ON public.community_posts USING gin(to_tsvector('english', content));

CREATE INDEX IF NOT EXISTS idx_courses_search 
ON public.courses USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')));

CREATE INDEX IF NOT EXISTS idx_course_videos_search 
ON public.course_videos USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')));

CREATE INDEX IF NOT EXISTS idx_coaching_recordings_search 
ON public.coaching_call_recordings USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')));

-- Create B-tree indexes for efficient filtering and sorting
CREATE INDEX IF NOT EXISTS idx_community_posts_created_at 
ON public.community_posts (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_courses_status_created_at 
ON public.courses (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_course_videos_course_created_at 
ON public.course_videos (course_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_profiles_names 
ON public.profiles (display_name, first_name, last_name);

-- Create composite indexes for common search patterns
CREATE INDEX IF NOT EXISTS idx_community_posts_user_created 
ON public.community_posts (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_courses_category_status 
ON public.courses (category, status, created_at DESC);

-- Add trigram indexes for fuzzy search capabilities (requires pg_trgm extension)
-- These will be created only if the extension is available
DO $$
BEGIN
  -- Check if pg_trgm extension exists, if not, create it
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm') THEN
    CREATE EXTENSION IF NOT EXISTS pg_trgm;
  END IF;
  
  -- Create trigram indexes for fuzzy search
  CREATE INDEX IF NOT EXISTS idx_courses_title_trgm 
  ON public.courses USING gin(title gin_trgm_ops);
  
  CREATE INDEX IF NOT EXISTS idx_profiles_display_name_trgm 
  ON public.profiles USING gin(display_name gin_trgm_ops);
  
  CREATE INDEX IF NOT EXISTS idx_community_posts_content_trgm 
  ON public.community_posts USING gin(content gin_trgm_ops);
  
EXCEPTION
  WHEN OTHERS THEN
    -- If extension creation fails, log and continue without trigram indexes
    RAISE NOTICE 'Could not create pg_trgm extension or trigram indexes: %', SQLERRM;
END
$$;