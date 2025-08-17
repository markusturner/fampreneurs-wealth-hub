-- Fix critical security vulnerability in financial_advisors table
-- Remove all publicly accessible policies

-- Drop all existing insecure policies
DROP POLICY IF EXISTS "Users can view all financial advisors" ON public.financial_advisors;
DROP POLICY IF EXISTS "Authenticated users can view financial advisors" ON public.financial_advisors;
DROP POLICY IF EXISTS "Authenticated users can view active advisors" ON public.financial_advisors;
DROP POLICY IF EXISTS "Users can add financial advisors" ON public.financial_advisors;
DROP POLICY IF EXISTS "Users can manage financial advisors they added" ON public.financial_advisors;
DROP POLICY IF EXISTS "Users can update advisors they added" ON public.financial_advisors;
DROP POLICY IF EXISTS "Admins can manage all financial advisors" ON public.financial_advisors;

-- Create secure policies that protect sensitive contact information

-- Secure SELECT policy - only users who added the advisor and admins can view full details
CREATE POLICY "secure_view_financial_advisors" ON public.financial_advisors
FOR SELECT 
TO authenticated
USING (
  auth.uid() = added_by OR 
  public.is_current_user_admin()
);

-- Secure INSERT policy - only authenticated users can add advisors
CREATE POLICY "secure_insert_financial_advisors" ON public.financial_advisors
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = added_by);

-- Secure UPDATE policy - only the user who added the advisor can update
CREATE POLICY "secure_update_financial_advisors" ON public.financial_advisors
FOR UPDATE 
TO authenticated
USING (auth.uid() = added_by)
WITH CHECK (auth.uid() = added_by);

-- Secure DELETE policy - only the user who added the advisor or admins can delete
CREATE POLICY "secure_delete_financial_advisors" ON public.financial_advisors
FOR DELETE 
TO authenticated
USING (
  auth.uid() = added_by OR 
  public.is_current_user_admin()
);

-- Admin policy for full management access
CREATE POLICY "admin_manage_all_financial_advisors" ON public.financial_advisors
FOR ALL 
TO authenticated
USING (public.is_current_user_admin())
WITH CHECK (public.is_current_user_admin());

-- Create a secure function for public advisor listings that excludes sensitive contact info
CREATE OR REPLACE FUNCTION public.get_public_advisor_listing()
RETURNS TABLE(
  id uuid,
  full_name text,
  company text,
  title text,
  specialties text[],
  years_experience integer,
  bio text,
  website text,
  is_active boolean
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT 
    fa.id,
    fa.full_name,
    fa.company,
    fa.title,
    fa.specialties,
    fa.years_experience,
    fa.bio,
    fa.website,
    fa.is_active
    -- Note: email, phone, license_number, hourly_rate, linkedin_url, and notes are excluded for security
  FROM public.financial_advisors fa
  WHERE fa.is_active = true;
$function$;