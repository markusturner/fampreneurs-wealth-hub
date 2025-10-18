-- Add RLS policies for exposed tables

-- Family member credentials table - CRITICAL: Only owner can access
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'family_member_credentials'
  ) THEN
    RAISE NOTICE 'Table family_member_credentials does not exist, skipping RLS setup';
  ELSE
    ALTER TABLE public.family_member_credentials ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Users can view credentials for their family members" ON public.family_member_credentials;
    CREATE POLICY "Users can view credentials for their family members"
    ON public.family_member_credentials
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.family_members fm
        WHERE fm.id = family_member_credentials.family_member_id
        AND fm.added_by = auth.uid()
      )
    );

    DROP POLICY IF EXISTS "Admins can view all credentials" ON public.family_member_credentials;
    CREATE POLICY "Admins can view all credentials"
    ON public.family_member_credentials
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role = 'admin'
      )
    );

    DROP POLICY IF EXISTS "Users can create credentials for their family members" ON public.family_member_credentials;
    CREATE POLICY "Users can create credentials for their family members"
    ON public.family_member_credentials
    FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.family_members fm
        WHERE fm.id = family_member_credentials.family_member_id
        AND fm.added_by = auth.uid()
      )
    );
  END IF;
END $$;

-- Secure documents table - CRITICAL: Only authorized users
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'family_office_secure_documents'
  ) THEN
    RAISE NOTICE 'Table family_office_secure_documents does not exist, skipping RLS setup';
  ELSE
    ALTER TABLE public.family_office_secure_documents ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Users can view their own secure documents" ON public.family_office_secure_documents;
    CREATE POLICY "Users can view their own secure documents"
    ON public.family_office_secure_documents
    FOR SELECT
    USING (auth.uid() = user_id);

    DROP POLICY IF EXISTS "Authorized family members can view documents" ON public.family_office_secure_documents;
    CREATE POLICY "Authorized family members can view documents"
    ON public.family_office_secure_documents
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.family_members fm
        WHERE fm.added_by = family_office_secure_documents.user_id
        AND fm.email = (SELECT email FROM auth.users WHERE id = auth.uid())
        AND fm.status = 'active'
      )
    );

    DROP POLICY IF EXISTS "Admins can view all secure documents" ON public.family_office_secure_documents;
    CREATE POLICY "Admins can view all secure documents"
    ON public.family_office_secure_documents
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role = 'admin'
      )
    );

    DROP POLICY IF EXISTS "Users can create their own secure documents" ON public.family_office_secure_documents;
    CREATE POLICY "Users can create their own secure documents"
    ON public.family_office_secure_documents
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

    DROP POLICY IF EXISTS "Users can update their own secure documents" ON public.family_office_secure_documents;
    CREATE POLICY "Users can update their own secure documents"
    ON public.family_office_secure_documents
    FOR UPDATE
    USING (auth.uid() = user_id);

    DROP POLICY IF EXISTS "Users can delete their own secure documents" ON public.family_office_secure_documents;
    CREATE POLICY "Users can delete their own secure documents"
    ON public.family_office_secure_documents
    FOR DELETE
    USING (auth.uid() = user_id);
  END IF;
END $$;