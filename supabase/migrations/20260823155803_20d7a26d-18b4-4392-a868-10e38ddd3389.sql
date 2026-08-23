DROP POLICY IF EXISTS "Users can update their own 2FA settings" ON public.user_2fa_settings;
DROP POLICY IF EXISTS "Users can view their own 2FA settings" ON public.user_2fa_settings;

CREATE POLICY "Users can manage their own 2FA settings"
ON public.user_2fa_settings
FOR ALL
TO authenticated
USING (lower(email) = lower(auth.email()))
WITH CHECK (lower(email) = lower(auth.email()));