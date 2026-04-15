-- Drop the overly restrictive self-only SELECT policy
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Create a new policy allowing all authenticated users to view profiles
CREATE POLICY "Authenticated users can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);
