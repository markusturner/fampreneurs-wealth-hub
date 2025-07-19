-- First, let's create a function to auto-assign users to community groups based on program
CREATE OR REPLACE FUNCTION auto_assign_to_community_group()
RETURNS TRIGGER AS $$
DECLARE
    group_id uuid;
BEGIN
    -- Map program names to community group names and find existing group
    IF NEW.program_name IS NOT NULL THEN
        SELECT id INTO group_id 
        FROM community_groups 
        WHERE name = CASE 
            WHEN NEW.program_name = 'The Family Business University' THEN 'FBU'
            WHEN NEW.program_name = 'The Family Vault' THEN 'TFBV'  
            WHEN NEW.program_name = 'The Family Business Accelerator' THEN 'TFBA'
            WHEN NEW.program_name = 'The Family Legacy: VIP Weekend' THEN 'TFLVIP'
            WHEN NEW.program_name = 'The Family Fortune Mastermind' THEN 'TFFM'
            ELSE NEW.program_name
        END
        LIMIT 1;
        
        -- If group exists, add user to it
        IF group_id IS NOT NULL THEN
            INSERT INTO group_memberships (group_id, user_id, role)
            VALUES (group_id, NEW.user_id, 'member')
            ON CONFLICT (group_id, user_id) DO NOTHING;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for program assignment
DROP TRIGGER IF EXISTS trigger_auto_assign_community_group ON profiles;
CREATE TRIGGER trigger_auto_assign_community_group
    AFTER UPDATE OF program_name ON profiles
    FOR EACH ROW
    WHEN (NEW.program_name IS DISTINCT FROM OLD.program_name AND NEW.program_name IS NOT NULL)
    EXECUTE FUNCTION auto_assign_to_community_group();

-- Also trigger on INSERT for new users
CREATE TRIGGER trigger_auto_assign_community_group_insert
    AFTER INSERT ON profiles
    FOR EACH ROW
    WHEN (NEW.program_name IS NOT NULL)
    EXECUTE FUNCTION auto_assign_to_community_group();

-- Update existing community groups to match program names
UPDATE community_groups SET name = 'TFBA' WHERE name = 'TFBA';
UPDATE community_groups SET name = 'TFFM' WHERE name = 'FBU';

-- Insert missing community groups for programs
INSERT INTO community_groups (name, description, created_by, is_private, is_premium)
SELECT 
    group_name,
    group_description,
    (SELECT user_id FROM profiles WHERE is_admin = true LIMIT 1),
    false,
    false
FROM (
    VALUES 
        ('FBU', 'The Family Business University community'),
        ('TFBA', 'The Family Business Accelerator community'),
        ('TFFM', 'The Family Fortune Mastermind community')
) AS programs(group_name, group_description)
WHERE NOT EXISTS (
    SELECT 1 FROM community_groups WHERE name = programs.group_name
);

-- Auto-assign existing users with programs to their groups
INSERT INTO group_memberships (group_id, user_id, role)
SELECT 
    cg.id,
    p.user_id,
    'member'
FROM profiles p
JOIN community_groups cg ON cg.name = CASE 
    WHEN p.program_name = 'The Family Business University' THEN 'FBU'
    WHEN p.program_name = 'The Family Vault' THEN 'TFBV'  
    WHEN p.program_name = 'The Family Business Accelerator' THEN 'TFBA'
    WHEN p.program_name = 'The Family Legacy: VIP Weekend' THEN 'TFLVIP'
    WHEN p.program_name = 'The Family Fortune Mastermind' THEN 'TFFM'
    ELSE p.program_name
END
WHERE p.program_name IS NOT NULL
ON CONFLICT (group_id, user_id) DO NOTHING;