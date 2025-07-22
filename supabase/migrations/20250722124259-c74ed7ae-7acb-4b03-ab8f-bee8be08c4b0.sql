-- Update the profiles table UPDATE policy to allow admins to update any profile
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can update their own profile or admins can update any profile"
ON public.profiles
FOR UPDATE
USING (
  (auth.uid() = user_id) 
  OR 
  (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND is_admin = true
  ))
)
WITH CHECK (
  (auth.uid() = user_id) 
  OR 
  (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND is_admin = true
  ))
);