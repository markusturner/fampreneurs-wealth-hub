-- Update RLS policies for family_secret_codes to allow users to create their own codes
-- Remove existing policies first
DROP POLICY IF EXISTS "Family admins can manage codes" ON family_secret_codes;
DROP POLICY IF EXISTS "Users can view active codes they created" ON family_secret_codes;

-- Create new policies that allow users to manage their own codes
CREATE POLICY "Users can create their own codes" 
ON family_secret_codes 
FOR INSERT 
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can view their own codes" 
ON family_secret_codes 
FOR SELECT 
USING (created_by = auth.uid());

CREATE POLICY "Users can update their own codes" 
ON family_secret_codes 
FOR UPDATE 
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can delete their own codes" 
ON family_secret_codes 
FOR DELETE 
USING (created_by = auth.uid());

-- Admins can manage all codes
CREATE POLICY "Admins can manage all codes" 
ON family_secret_codes 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE user_id = auth.uid() AND is_admin = true
))
WITH CHECK (EXISTS (
  SELECT 1 FROM profiles 
  WHERE user_id = auth.uid() AND is_admin = true
));