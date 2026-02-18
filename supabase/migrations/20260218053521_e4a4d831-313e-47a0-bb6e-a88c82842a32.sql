
-- =============================================
-- FIX CRITICAL SECURITY ISSUES
-- =============================================

-- 1. FAMILY_MEMBERS: Remove overly permissive "Authenticated users only" policy
-- that allows ANY authenticated user full access
DROP POLICY IF EXISTS "Authenticated users only can access family_members" ON public.family_members;

-- 2. COMMUNITY_CALL_BOOKINGS: Fix NULL user_id exposure
DROP POLICY IF EXISTS "Users can view their own bookings" ON public.community_call_bookings;
CREATE POLICY "Users can view their own bookings" 
  ON public.community_call_bookings FOR SELECT 
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own call bookings" ON public.community_call_bookings;
CREATE POLICY "Users can create their own call bookings" 
  ON public.community_call_bookings FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 3. COACHES: Remove duplicate SELECT policies, keep only admin + own profile access
-- Drop the overly permissive ones that let any user see contact details
DROP POLICY IF EXISTS "Authenticated users can view active coaches" ON public.coaches;
DROP POLICY IF EXISTS "Authenticated users can view basic coach info" ON public.coaches;
DROP POLICY IF EXISTS "Authenticated users can view coach profiles" ON public.coaches;
DROP POLICY IF EXISTS "Authenticated users can view coaches" ON public.coaches;

-- Drop the TO public policies (should be TO authenticated)
DROP POLICY IF EXISTS "Users can create coaches" ON public.coaches;
DROP POLICY IF EXISTS "Users can delete coaches they added" ON public.coaches;
DROP POLICY IF EXISTS "Users can manage coaches they added" ON public.coaches;
DROP POLICY IF EXISTS "Users can update coaches they added" ON public.coaches;

-- Create proper restricted policies for coaches
CREATE POLICY "Users can view coaches they added" 
  ON public.coaches FOR SELECT 
  TO authenticated
  USING (auth.uid() = added_by OR is_current_user_admin());

CREATE POLICY "Users can insert coaches they add" 
  ON public.coaches FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid() = added_by);

CREATE POLICY "Users can update coaches they added" 
  ON public.coaches FOR UPDATE 
  TO authenticated
  USING (auth.uid() = added_by);

CREATE POLICY "Users can delete coaches they added" 
  ON public.coaches FOR DELETE 
  TO authenticated
  USING (auth.uid() = added_by);

-- 4. FINANCIAL_ADVISORS: Remove permissive SELECT, keep restricted view
DROP POLICY IF EXISTS "Authenticated users can view active advisors" ON public.financial_advisors;

-- 5. PROFILES: Clean up duplicate/conflicting policies
-- Remove duplicates keeping the properly scoped ones
DROP POLICY IF EXISTS "profiles_select_self_only" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own_only" ON public.profiles;
DROP POLICY IF EXISTS "admins_can_update_all_profiles" ON public.profiles;

-- Fix the delete policy from TO public to TO authenticated
DROP POLICY IF EXISTS "Users can delete their own profile" ON public.profiles;
CREATE POLICY "Users can delete their own profile" 
  ON public.profiles FOR DELETE 
  TO authenticated
  USING (auth.uid() = user_id);

-- Fix insert policy from TO public to TO authenticated
DROP POLICY IF EXISTS "users_can_insert_profiles" ON public.profiles;
CREATE POLICY "Users can insert own profile" 
  ON public.profiles FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 6. SUBSCRIBERS: Clean up duplicate policies, ensure TO authenticated
DROP POLICY IF EXISTS "Authenticated users can only access own subscription data" ON public.subscribers;
DROP POLICY IF EXISTS "Secure subscription data owner only" ON public.subscribers;
DROP POLICY IF EXISTS "users_can_view_own_subscription_only" ON public.subscribers;
DROP POLICY IF EXISTS "Admins can view all subscription data" ON public.subscribers;

CREATE POLICY "Users can view own subscription" 
  ON public.subscribers FOR SELECT 
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own subscription" 
  ON public.subscribers FOR ALL 
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all subscriptions" 
  ON public.subscribers FOR SELECT 
  TO authenticated
  USING (is_current_user_admin());

-- 7. FAMILY_MEMBER_CREDENTIALS: Restrict admin policy to use security definer function
DROP POLICY IF EXISTS "Admins can view all credentials" ON public.family_member_credentials;
CREATE POLICY "Admins can view all credentials" 
  ON public.family_member_credentials FOR SELECT 
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::member_role));

-- Fix TO public policies to TO authenticated
DROP POLICY IF EXISTS "Family creators can manage family member credentials" ON public.family_member_credentials;
CREATE POLICY "Family creators can manage credentials" 
  ON public.family_member_credentials FOR ALL 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM family_members fm 
    WHERE fm.id = family_member_credentials.family_member_id 
    AND fm.added_by = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM family_members fm 
    WHERE fm.id = family_member_credentials.family_member_id 
    AND fm.added_by = auth.uid()
  ));

DROP POLICY IF EXISTS "Family members can view their own credentials" ON public.family_member_credentials;
CREATE POLICY "Family members can view own credentials" 
  ON public.family_member_credentials FOR SELECT 
  TO authenticated
  USING (email = auth.email());

DROP POLICY IF EXISTS "Users can create credentials for their family members" ON public.family_member_credentials;
DROP POLICY IF EXISTS "Users can view credentials for their family members" ON public.family_member_credentials;

-- 8. CONNECTED_ACCOUNTS: Clean up duplicate policies
DROP POLICY IF EXISTS "Users can manage own connected accounts only" ON public.connected_accounts;
DROP POLICY IF EXISTS "Users can only delete own connected accounts" ON public.connected_accounts;
DROP POLICY IF EXISTS "Users can only insert own connected accounts" ON public.connected_accounts;
DROP POLICY IF EXISTS "Users can only update own connected accounts" ON public.connected_accounts;
DROP POLICY IF EXISTS "Users can only view own connected accounts" ON public.connected_accounts;
DROP POLICY IF EXISTS "Users can view own connected accounts only" ON public.connected_accounts;
DROP POLICY IF EXISTS "Users manage own financial accounts" ON public.connected_accounts;
