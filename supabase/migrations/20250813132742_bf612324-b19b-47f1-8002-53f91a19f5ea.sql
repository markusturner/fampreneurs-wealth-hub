-- Fix remaining security vulnerabilities for coaches and financial_advisors tables

-- First, check if these tables exist and create them if they don't, then secure them
DO $$ 
BEGIN
  -- Handle coaches table
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'coaches') THEN
    -- Create coaches table if it doesn't exist
    CREATE TABLE public.coaches (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
      full_name text NOT NULL,
      email text,
      phone text,
      bio text,
      specialties text[],
      hourly_rate numeric,
      availability jsonb,
      profile_image_url text,
      experience_years integer,
      languages text[],
      timezone text,
      created_at timestamp with time zone DEFAULT now(),
      updated_at timestamp with time zone DEFAULT now()
    );
  END IF;
  
  -- Enable RLS on coaches table
  ALTER TABLE public.coaches ENABLE ROW LEVEL SECURITY;
  
  -- Drop any existing public policies
  DROP POLICY IF EXISTS "Coaches are viewable by everyone" ON public.coaches;
  DROP POLICY IF EXISTS "Public can view coaches" ON public.coaches;
  
  -- Create secure policies for coaches
  CREATE POLICY "Authenticated users can view coaches"
  ON public.coaches
  FOR SELECT
  TO authenticated
  USING (true);
  
  CREATE POLICY "Coaches can manage their own profile"
  ON public.coaches
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
  
  CREATE POLICY "Admins can manage all coaches"
  ON public.coaches
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND is_admin = true
    )
  );
END $$;

DO $$ 
BEGIN
  -- Handle financial_advisors table
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'financial_advisors') THEN
    -- Create financial_advisors table if it doesn't exist
    CREATE TABLE public.financial_advisors (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
      full_name text NOT NULL,
      email text,
      phone text,
      company_name text,
      license_number text,
      specialties text[],
      bio text,
      website_url text,
      linkedin_url text,
      years_experience integer,
      aum_range text,
      fee_structure text,
      profile_image_url text,
      created_at timestamp with time zone DEFAULT now(),
      updated_at timestamp with time zone DEFAULT now()
    );
  END IF;
  
  -- Enable RLS on financial_advisors table
  ALTER TABLE public.financial_advisors ENABLE ROW LEVEL SECURITY;
  
  -- Drop any existing public policies
  DROP POLICY IF EXISTS "Financial advisors are viewable by everyone" ON public.financial_advisors;
  DROP POLICY IF EXISTS "Public can view financial advisors" ON public.financial_advisors;
  
  -- Create secure policies for financial_advisors
  CREATE POLICY "Authenticated users can view financial advisors"
  ON public.financial_advisors
  FOR SELECT
  TO authenticated
  USING (true);
  
  CREATE POLICY "Financial advisors can manage their own profile"
  ON public.financial_advisors
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
  
  CREATE POLICY "Admins can manage all financial advisors"
  ON public.financial_advisors
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND is_admin = true
    )
  );
END $$;

-- Log the additional security fixes
SELECT public.log_family_office_action(
  'additional_security_fixes',
  'coaches_financial_advisors',
  NULL,
  jsonb_build_object('public_access', true),
  jsonb_build_object('authenticated_access_only', true),
  'critical',
  jsonb_build_object(
    'tables_secured', '["coaches", "financial_advisors"]',
    'fix_type', 'restrict_to_authenticated_users'
  )
);