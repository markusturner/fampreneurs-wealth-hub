-- Fix remaining database functions missing search_path
-- Based on the function list in supabase-info, these are the pg_trgm functions that need fixing

-- Fix the pg_trgm extension functions
DROP FUNCTION IF EXISTS public.set_limit(real);
DROP FUNCTION IF EXISTS public.show_limit();
DROP FUNCTION IF EXISTS public.show_trgm(text);
DROP FUNCTION IF EXISTS public.similarity(text, text);
DROP FUNCTION IF EXISTS public.similarity_op(text, text);

-- These functions are part of the pg_trgm extension and should not be in public schema
-- They will be automatically available through the extension in the extensions schema