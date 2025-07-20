-- Fix function search path security issues
-- Set SECURITY DEFINER with search_path for all public functions

-- Update all existing functions to have secure search_path
ALTER FUNCTION public.auto_assign_user_to_program_channel() 
SET search_path = public, pg_temp;

ALTER FUNCTION public.auto_assign_new_user_to_program_channel() 
SET search_path = public, pg_temp;

ALTER FUNCTION public.update_updated_at_column() 
SET search_path = public, pg_temp;

-- Check for any community_groups table and enable RLS if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'community_groups') THEN
        ALTER TABLE public.community_groups ENABLE ROW LEVEL SECURITY;
        
        -- Create comprehensive RLS policies for community_groups
        DROP POLICY IF EXISTS "Users can view all groups" ON public.community_groups;
        DROP POLICY IF EXISTS "Authenticated users can create groups" ON public.community_groups;
        DROP POLICY IF EXISTS "Group creators can update their groups" ON public.community_groups;
        DROP POLICY IF EXISTS "Group creators can delete their groups" ON public.community_groups;
        
        CREATE POLICY "Users can view all groups" 
        ON public.community_groups 
        FOR SELECT 
        TO authenticated
        USING (true);
        
        CREATE POLICY "Authenticated users can create groups" 
        ON public.community_groups 
        FOR INSERT 
        TO authenticated
        WITH CHECK (auth.uid() = created_by);
        
        CREATE POLICY "Group creators can update their groups" 
        ON public.community_groups 
        FOR UPDATE 
        TO authenticated
        USING (auth.uid() = created_by)
        WITH CHECK (auth.uid() = created_by);
        
        CREATE POLICY "Group creators can delete their groups" 
        ON public.community_groups 
        FOR DELETE 
        TO authenticated
        USING (auth.uid() = created_by);
    END IF;
END
$$;