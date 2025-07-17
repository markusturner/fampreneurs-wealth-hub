-- First, make you an admin
UPDATE profiles 
SET is_admin = true, 
    admin_permissions = ARRAY['manage_users', 'manage_groups', 'manage_settings']
WHERE user_id = 'be40b593-93de-4edc-baae-99d8b1c6757e';

-- Update the system-created groups to be owned by you
UPDATE community_groups 
SET created_by = 'be40b593-93de-4edc-baae-99d8b1c6757e'
WHERE created_by = '00000000-0000-0000-0000-000000000000' 
AND name IN ('General', 'Announcements', 'Random');