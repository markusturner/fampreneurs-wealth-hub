-- CRITICAL SECURITY FIX: Remove public access to user activity data
-- Fix tables that expose user IDs and personal activity to anonymous users

-- 1. COMMUNITY_POSTS: Restrict to authenticated users only
DROP POLICY IF EXISTS "Users can view posts from their family" ON public.community_posts;
DROP POLICY IF EXISTS "Users can create their own posts" ON public.community_posts;
DROP POLICY IF EXISTS "Users can update their own posts" ON public.community_posts;
DROP POLICY IF EXISTS "Users can delete their own posts" ON public.community_posts;

-- Create secure policies for community_posts (authenticated only)
CREATE POLICY "Authenticated users can view community posts"
ON public.community_posts
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create posts"
ON public.community_posts
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own posts only"
ON public.community_posts
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own posts only"
ON public.community_posts
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- 2. COMMUNITY_REACTIONS: Restrict to authenticated users only
DROP POLICY IF EXISTS "Users can view all reactions" ON public.community_reactions;
DROP POLICY IF EXISTS "Users can create reactions" ON public.community_reactions;
DROP POLICY IF EXISTS "Users can update their own reactions" ON public.community_reactions;
DROP POLICY IF EXISTS "Users can delete their own reactions" ON public.community_reactions;

-- Create secure policies for community_reactions (authenticated only)
CREATE POLICY "Authenticated users can view reactions"
ON public.community_reactions
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create reactions"
ON public.community_reactions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reactions only"
ON public.community_reactions
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own reactions only"
ON public.community_reactions
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- 3. USER_ROLES: Severely restrict access - users should not see all roles
DROP POLICY IF EXISTS "Users can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can manage their own member role" ON public.user_roles;

-- Create secure policies for user_roles (very restrictive)
CREATE POLICY "Users can view own roles only"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all user roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND is_admin = true
  )
);

-- 4. FEEDBACK_NOTIFICATIONS: Already properly restricted, but ensure no public access
-- Remove any overly permissive policies
DROP POLICY IF EXISTS "System can manage feedback notifications for all users" ON public.feedback_notifications;

-- Replace with service role only access for system operations
CREATE POLICY "Service role can manage feedback notifications"
ON public.feedback_notifications
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Users can view own feedback notifications only"
ON public.feedback_notifications
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 5. WEEKLY_CHECKIN_NOTIFICATIONS: Same fix as feedback notifications
DROP POLICY IF EXISTS "System can manage weekly checkin notifications for all users" ON public.weekly_checkin_notifications;

-- Replace with service role only access for system operations
CREATE POLICY "Service role can manage weekly checkin notifications"
ON public.weekly_checkin_notifications
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Users can view own weekly checkin notifications only"
ON public.weekly_checkin_notifications
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 6. Remove any anonymous table privileges
REVOKE ALL ON TABLE public.community_posts FROM anon, public;
REVOKE ALL ON TABLE public.community_reactions FROM anon, public;
REVOKE ALL ON TABLE public.user_roles FROM anon, public;
REVOKE ALL ON TABLE public.feedback_notifications FROM anon, public;
REVOKE ALL ON TABLE public.weekly_checkin_notifications FROM anon, public;

-- Grant appropriate privileges to authenticated users only
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.community_posts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.community_reactions TO authenticated;
GRANT SELECT ON TABLE public.user_roles TO authenticated;
GRANT SELECT ON TABLE public.feedback_notifications TO authenticated;
GRANT SELECT ON TABLE public.weekly_checkin_notifications TO authenticated;