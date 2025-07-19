-- Add expiry date to announcements and auto-grant channel access based on program
ALTER TABLE public.announcements 
ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE;

-- Create program to channel mapping function
CREATE OR REPLACE FUNCTION public.auto_grant_channel_access()
RETURNS TRIGGER AS $$
DECLARE
  channel_id_to_grant UUID;
BEGIN
  -- Map programs to specific channel IDs (you'll need to replace these with actual channel IDs)
  CASE NEW.program_name
    WHEN 'The Family Business University' THEN
      -- Find or create the private channel for this program
      SELECT id INTO channel_id_to_grant 
      FROM public.channels 
      WHERE name = 'Family Business University' AND is_private = true
      LIMIT 1;
      
    WHEN 'The Family Vault' THEN
      SELECT id INTO channel_id_to_grant 
      FROM public.channels 
      WHERE name = 'Family Vault' AND is_private = true
      LIMIT 1;
      
    WHEN 'The Family Business Accelerator' THEN
      SELECT id INTO channel_id_to_grant 
      FROM public.channels 
      WHERE name = 'Family Business Accelerator' AND is_private = true
      LIMIT 1;
      
    WHEN 'The Family Legacy: VIP Weekend' THEN
      SELECT id INTO channel_id_to_grant 
      FROM public.channels 
      WHERE name = 'Family Legacy VIP' AND is_private = true
      LIMIT 1;
      
    WHEN 'The Family Fortune Mastermind' THEN
      SELECT id INTO channel_id_to_grant 
      FROM public.channels 
      WHERE name = 'Family Fortune Mastermind' AND is_private = true
      LIMIT 1;
      
    ELSE
      channel_id_to_grant := NULL;
  END CASE;
  
  -- Grant access to the channel if found
  IF channel_id_to_grant IS NOT NULL THEN
    INSERT INTO public.channel_members (channel_id, user_id, role)
    VALUES (channel_id_to_grant, NEW.user_id, 'member')
    ON CONFLICT (channel_id, user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for auto-granting channel access when program is updated
CREATE TRIGGER auto_grant_channel_access_trigger
  AFTER UPDATE OF program_name ON public.profiles
  FOR EACH ROW
  WHEN (NEW.program_name IS NOT NULL AND NEW.program_name IS DISTINCT FROM OLD.program_name)
  EXECUTE FUNCTION public.auto_grant_channel_access();

-- Also trigger on INSERT for new users
CREATE TRIGGER auto_grant_channel_access_insert_trigger
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  WHEN (NEW.program_name IS NOT NULL)
  EXECUTE FUNCTION public.auto_grant_channel_access();

-- Add profile_photo_uploaded flag to track mandatory photo upload
ALTER TABLE public.profiles 
ADD COLUMN profile_photo_uploaded BOOLEAN NOT NULL DEFAULT FALSE;