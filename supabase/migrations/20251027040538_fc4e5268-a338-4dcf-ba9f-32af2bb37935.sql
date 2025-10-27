-- Update admin status in profiles
UPDATE profiles 
SET is_admin = true 
WHERE email = 'markusturner94@gmail.com';

-- Add owner role if not exists
INSERT INTO user_roles (user_id, role, assigned_by)
SELECT user_id, 'owner'::member_role, user_id
FROM profiles
WHERE email = 'markusturner94@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;