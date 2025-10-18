-- Enable realtime for family_members table
ALTER TABLE public.family_members REPLICA IDENTITY FULL;

-- Note: The supabase_realtime publication is automatically created by Supabase
-- and tables are automatically added when listening via client libraries