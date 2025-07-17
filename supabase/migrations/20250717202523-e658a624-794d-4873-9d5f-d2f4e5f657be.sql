-- First, make the current user an admin
UPDATE profiles 
SET is_admin = true, 
    admin_permissions = ARRAY['manage_users', 'manage_groups', 'manage_settings']
WHERE user_id = auth.uid();

-- Update the system-created groups to be owned by the current user
UPDATE community_groups 
SET created_by = auth.uid()
WHERE created_by = '00000000-0000-0000-0000-000000000000' 
AND name IN ('General', 'Announcements', 'Random');