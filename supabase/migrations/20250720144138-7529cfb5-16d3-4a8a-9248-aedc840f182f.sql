-- Function to automatically assign users to community groups based on their program
CREATE OR REPLACE FUNCTION public.auto_assign_user_to_program_channel()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if program_name actually changed
  IF OLD.program_name IS DISTINCT FROM NEW.program_name THEN
    
    -- Remove user from old program channels (if they had one)
    IF OLD.program_name IS NOT NULL THEN
      -- Find the old program channel and remove user from it
      DELETE FROM public.group_memberships 
      WHERE user_id = NEW.user_id 
      AND group_id IN (
        SELECT id FROM public.community_groups 
        WHERE name = CASE OLD.program_name
          WHEN 'The Family Business University' THEN 'Family Business University'
          WHEN 'The Family Vault' THEN 'The Family Vault'  
          WHEN 'The Family Business Accelerator' THEN 'The Family Business Accelerator'
          WHEN 'The Family Legacy: VIP Weekend' THEN 'The Family Legacy: VIP Weekend'
          WHEN 'The Family Fortune Mastermind' THEN 'The Family Fortune Mastermind'
          ELSE OLD.program_name
        END
      );
    END IF;
    
    -- Add user to new program channel (if they have one)
    IF NEW.program_name IS NOT NULL THEN
      -- Map program names to community group names and add user
      INSERT INTO public.group_memberships (group_id, user_id, role)
      SELECT id, NEW.user_id, 'member'
      FROM public.community_groups 
      WHERE name = CASE NEW.program_name
        WHEN 'The Family Business University' THEN 'Family Business University'
        WHEN 'The Family Vault' THEN 'The Family Vault'  
        WHEN 'The Family Business Accelerator' THEN 'The Family Business Accelerator'
        WHEN 'The Family Legacy: VIP Weekend' THEN 'The Family Legacy: VIP Weekend'
        WHEN 'The Family Fortune Mastermind' THEN 'The Family Fortune Mastermind'
        ELSE NEW.program_name
      END
      ON CONFLICT (group_id, user_id) DO NOTHING;
    END IF;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically assign users to channels when program changes
DROP TRIGGER IF EXISTS trigger_auto_assign_program_channel ON public.profiles;
CREATE TRIGGER trigger_auto_assign_program_channel
  AFTER UPDATE OF program_name ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_user_to_program_channel();

-- Also create a function to handle initial signup assignments
CREATE OR REPLACE FUNCTION public.auto_assign_new_user_to_program_channel()
RETURNS TRIGGER AS $$
BEGIN
  -- Add user to program channel if they have a program assigned
  IF NEW.program_name IS NOT NULL THEN
    -- Map program names to community group names and add user
    INSERT INTO public.group_memberships (group_id, user_id, role)
    SELECT id, NEW.user_id, 'member'
    FROM public.community_groups 
    WHERE name = CASE NEW.program_name
      WHEN 'The Family Business University' THEN 'Family Business University'
      WHEN 'The Family Vault' THEN 'The Family Vault'  
      WHEN 'The Family Business Accelerator' THEN 'The Family Business Accelerator'
      WHEN 'The Family Legacy: VIP Weekend' THEN 'The Family Legacy: VIP Weekend'
      WHEN 'The Family Fortune Mastermind' THEN 'The Family Fortune Mastermind'
      ELSE NEW.program_name
    END
    ON CONFLICT (group_id, user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new users (when profile is first created)
DROP TRIGGER IF EXISTS trigger_auto_assign_new_user_program_channel ON public.profiles;
CREATE TRIGGER trigger_auto_assign_new_user_program_channel
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_new_user_to_program_channel();