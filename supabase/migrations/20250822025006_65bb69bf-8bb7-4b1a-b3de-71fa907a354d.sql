-- Fix Security Definer View issue by removing the problematic view
-- The connected_accounts table is already secure with proper RLS

-- Remove the display view that may be causing the security definer issue
DROP VIEW IF EXISTS public.connected_accounts_display;

-- The original connected_accounts table already has secure RLS policies:
-- - Users can only access their own records (user_id = auth.uid())
-- - No anonymous access allowed
-- - All operations properly restricted

-- This is the secure solution - use the main table with RLS instead of views