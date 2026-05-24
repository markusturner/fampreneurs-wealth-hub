
-- Re-grant table SELECT but revoke sensitive columns
GRANT SELECT ON public.calendar_integrations TO authenticated;
REVOKE SELECT (access_token, refresh_token) ON public.calendar_integrations FROM authenticated, anon;

CREATE POLICY "Users can view own calendar integrations"
ON public.calendar_integrations FOR SELECT TO authenticated
USING (auth.uid() = user_id);
