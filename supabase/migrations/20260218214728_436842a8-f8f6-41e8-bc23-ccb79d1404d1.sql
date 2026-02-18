-- Set the primary user as owner
UPDATE public.user_roles 
SET role = 'owner' 
WHERE user_id = 'a0da09df-d9de-48b8-91f3-3396b4cd1816';
