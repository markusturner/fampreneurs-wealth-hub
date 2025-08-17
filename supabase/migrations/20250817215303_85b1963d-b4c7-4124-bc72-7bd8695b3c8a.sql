-- Fix remaining security warnings: Secure community and course content
-- This ensures only authenticated users can access course and community content

-- 1. Secure community posts - only authenticated users can read
DROP POLICY IF EXISTS "Authenticated users can view community posts" ON public.community_posts;
CREATE POLICY "Authenticated users can view community posts" 
ON public.community_posts 
FOR SELECT 
TO authenticated 
USING (true);

-- Block anonymous access to community posts
CREATE POLICY "Block anonymous access to community_posts" 
ON public.community_posts 
FOR ALL 
TO anon 
USING (false);

-- 2. Secure community comments - only authenticated users can read  
DROP POLICY IF EXISTS "Users can view all comments" ON public.community_comments;
CREATE POLICY "Authenticated users can view comments" 
ON public.community_comments 
FOR SELECT 
TO authenticated 
USING (true);

-- Block anonymous access to community comments
CREATE POLICY "Block anonymous access to community_comments" 
ON public.community_comments 
FOR ALL 
TO anon 
USING (false);

-- 3. Secure courses - only authenticated users can view
DROP POLICY IF EXISTS "Courses are viewable by everyone" ON public.courses;
CREATE POLICY "Authenticated users can view courses" 
ON public.courses 
FOR SELECT 
TO authenticated 
USING (true);

-- Block anonymous access to courses
CREATE POLICY "Block anonymous access to courses" 
ON public.courses 
FOR ALL 
TO anon 
USING (false);

-- 4. Secure course videos - only authenticated users can view
DROP POLICY IF EXISTS "Course videos are viewable by everyone" ON public.course_videos;
CREATE POLICY "Authenticated users can view course videos" 
ON public.course_videos 
FOR SELECT 
TO authenticated 
USING (true);

-- Block anonymous access to course videos
CREATE POLICY "Block anonymous access to course_videos" 
ON public.course_videos 
FOR ALL 
TO anon 
USING (false);

-- 5. Secure video documents - only authenticated users can view
DROP POLICY IF EXISTS "Video documents are viewable by everyone" ON public.video_documents;
CREATE POLICY "Authenticated users can view video documents" 
ON public.video_documents 
FOR SELECT 
TO authenticated 
USING (true);

-- Block anonymous access to video documents
CREATE POLICY "Block anonymous access to video_documents" 
ON public.video_documents 
FOR ALL 
TO anon 
USING (false);

-- 6. If course_modules table exists, secure it
CREATE POLICY "Authenticated users can view course modules" 
ON public.course_modules 
FOR SELECT 
TO authenticated 
USING (true);