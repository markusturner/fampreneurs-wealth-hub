-- Update Ernest Johnson's email to match Stripe
UPDATE profiles 
SET email = 'zeejohn83@gmail.com'
WHERE email = 'manifestedlife83@gmail.com' AND user_id = 'b13e83e4-4bf3-4989-b564-e1a2e0241627';

-- Update the subscriber record as well
UPDATE subscribers
SET email = 'zeejohn83@gmail.com'
WHERE email = 'manifestedlife83@gmail.com' AND user_id = 'b13e83e4-4bf3-4989-b564-e1a2e0241627';