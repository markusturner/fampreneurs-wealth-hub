-- Temporarily update membership_type for the three users to test
UPDATE profiles 
SET membership_type = 'trustee'
WHERE email IN ('manifestedlife83@gmail.com', 'lotusgate369@gmail.com', 'gabriel.galam94@gmail.com');