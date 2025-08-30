-- Create the trigger to automatically cleanup services when family office members are deleted
CREATE OR REPLACE TRIGGER cleanup_family_member_services_trigger
    BEFORE DELETE ON public.family_members
    FOR EACH ROW
    EXECUTE FUNCTION public.cleanup_family_member_services();

-- Fix search path security warning for the cleanup function
ALTER FUNCTION public.cleanup_family_member_services() SET search_path TO 'public', 'pg_temp';