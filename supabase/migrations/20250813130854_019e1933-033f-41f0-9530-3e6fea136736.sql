-- Fix remaining security warnings

-- Fix the remaining functions that still need search_path set
-- Need to identify and fix the remaining functions causing warnings

-- These are likely the functions that were missed or have different signatures
ALTER FUNCTION public.log_family_office_action(text, text, uuid, jsonb, jsonb, text, jsonb) SET search_path = 'public', 'pg_temp';
ALTER FUNCTION public.mask_sensitive_data(text, text) SET search_path = 'public', 'pg_temp';
ALTER FUNCTION public.can_access_family_data(uuid, text) SET search_path = 'public', 'pg_temp';
ALTER FUNCTION public.audit_family_members_changes() SET search_path = 'public', 'pg_temp';

-- Also fix the trigger functions that might have been missed
ALTER FUNCTION public.auto_assign_user_to_program_channel() SET search_path = 'public', 'pg_temp';
ALTER FUNCTION public.auto_assign_new_user_to_program_channel() SET search_path = 'public', 'pg_temp';
ALTER FUNCTION public.assign_default_member_role() SET search_path = 'public', 'pg_temp';
ALTER FUNCTION public.auto_grant_channel_access() SET search_path = 'public', 'pg_temp';
ALTER FUNCTION public.handle_first_admin() SET search_path = 'public', 'pg_temp';