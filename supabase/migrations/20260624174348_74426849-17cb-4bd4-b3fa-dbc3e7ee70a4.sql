
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage all user roles" ON public.user_roles;
CREATE POLICY "Admins can manage all user roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.is_current_user_admin())
  WITH CHECK (public.is_current_user_admin());

DROP POLICY IF EXISTS "Admins can manage all codes" ON public.family_secret_codes;
CREATE POLICY "Admins can manage all codes" ON public.family_secret_codes
  FOR ALL TO authenticated
  USING (public.is_current_user_admin())
  WITH CHECK (public.is_current_user_admin());

DROP POLICY IF EXISTS "Admins can create announcements" ON public.announcements;
DROP POLICY IF EXISTS "Admins can delete announcements" ON public.announcements;
DROP POLICY IF EXISTS "Admins can update announcements" ON public.announcements;
CREATE POLICY "Admins can create announcements" ON public.announcements
  FOR INSERT TO authenticated WITH CHECK (public.is_current_user_admin());
CREATE POLICY "Admins can delete announcements" ON public.announcements
  FOR DELETE TO authenticated USING (public.is_current_user_admin());
CREATE POLICY "Admins can update announcements" ON public.announcements
  FOR UPDATE TO authenticated USING (public.is_current_user_admin());

DROP POLICY IF EXISTS "Admins can update app settings" ON public.app_settings;
CREATE POLICY "Admins can update app settings" ON public.app_settings
  FOR ALL TO authenticated
  USING (public.is_current_user_admin())
  WITH CHECK (public.is_current_user_admin());

DROP POLICY IF EXISTS "Admins can manage coach assignments" ON public.coach_assignments;
CREATE POLICY "Admins can manage coach assignments" ON public.coach_assignments
  FOR ALL TO authenticated USING (public.is_current_user_admin())
  WITH CHECK (public.is_current_user_admin());

DROP POLICY IF EXISTS "Admins can manage coaches" ON public.coaches;
CREATE POLICY "Admins can manage coaches" ON public.coaches
  FOR ALL TO authenticated USING (public.is_current_user_admin())
  WITH CHECK (public.is_current_user_admin());

DROP POLICY IF EXISTS "Admins can manage all coaching recordings" ON public.coaching_call_recordings;
CREATE POLICY "Admins can manage all coaching recordings" ON public.coaching_call_recordings
  FOR ALL TO authenticated USING (public.is_current_user_admin())
  WITH CHECK (public.is_current_user_admin());

DROP POLICY IF EXISTS "Premium subscribers can view recordings" ON public.coaching_call_recordings;
CREATE POLICY "Premium subscribers can view recordings" ON public.coaching_call_recordings
  FOR SELECT TO authenticated USING (
    (EXISTS (SELECT 1 FROM public.subscribers WHERE subscribers.user_id = auth.uid()
      AND subscribers.subscribed = true
      AND (subscribers.subscription_end IS NULL OR subscribers.subscription_end > now())))
    OR public.is_current_user_admin()
    OR auth.uid() = created_by
  );

DROP POLICY IF EXISTS "Admins can view all usage logs" ON public.family_code_usage_log;
CREATE POLICY "Admins can view all usage logs" ON public.family_code_usage_log
  FOR SELECT TO authenticated USING (public.is_current_user_admin());

DROP POLICY IF EXISTS "Users can access own family documents" ON public.family_documents;
CREATE POLICY "Users can access own family documents" ON public.family_documents
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_current_user_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_current_user_admin());

DROP POLICY IF EXISTS "Users can view their own audit logs" ON public.family_office_audit_logs;
CREATE POLICY "Users can view their own audit logs" ON public.family_office_audit_logs
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_current_user_admin());

DROP POLICY IF EXISTS "Admins can manage data classification" ON public.family_office_data_classification;
CREATE POLICY "Admins can manage data classification" ON public.family_office_data_classification
  FOR ALL TO authenticated USING (public.is_current_user_admin())
  WITH CHECK (public.is_current_user_admin());

DROP POLICY IF EXISTS "Admins can manage featured courses" ON public.featured_courses;
CREATE POLICY "Admins can manage featured courses" ON public.featured_courses
  FOR ALL TO authenticated USING (public.is_current_user_admin())
  WITH CHECK (public.is_current_user_admin());

DROP POLICY IF EXISTS "Admins can view all feedback responses" ON public.feedback_responses;
CREATE POLICY "Admins can view all feedback responses" ON public.feedback_responses
  FOR ALL TO authenticated USING (public.is_current_user_admin())
  WITH CHECK (public.is_current_user_admin());

DROP POLICY IF EXISTS "Admins can manage call quotas" ON public.group_call_quotas;
CREATE POLICY "Admins can manage call quotas" ON public.group_call_quotas
  FOR ALL TO authenticated USING (public.is_current_user_admin())
  WITH CHECK (public.is_current_user_admin());

DROP POLICY IF EXISTS "Admins can view all sessions" ON public.group_coaching_sessions;
CREATE POLICY "Admins can view all sessions" ON public.group_coaching_sessions
  FOR SELECT TO authenticated USING (public.is_current_user_admin());

DROP POLICY IF EXISTS "Admins can create individual sessions" ON public.individual_coaching_sessions;
DROP POLICY IF EXISTS "Admins can delete individual sessions" ON public.individual_coaching_sessions;
DROP POLICY IF EXISTS "Admins can update individual sessions" ON public.individual_coaching_sessions;
DROP POLICY IF EXISTS "Users can view their own individual sessions" ON public.individual_coaching_sessions;
CREATE POLICY "Admins can create individual sessions" ON public.individual_coaching_sessions
  FOR INSERT TO authenticated WITH CHECK (public.is_current_user_admin());
CREATE POLICY "Admins can delete individual sessions" ON public.individual_coaching_sessions
  FOR DELETE TO authenticated USING (public.is_current_user_admin());
CREATE POLICY "Admins can update individual sessions" ON public.individual_coaching_sessions
  FOR UPDATE TO authenticated USING (public.is_current_user_admin());
CREATE POLICY "Users can view their own individual sessions" ON public.individual_coaching_sessions
  FOR SELECT TO authenticated USING (
    auth.uid() = client_id OR auth.uid() = created_by OR public.is_current_user_admin()
  );

DROP POLICY IF EXISTS "Admins can view all onboarding emails" ON public.onboarding_emails;
CREATE POLICY "Admins can view all onboarding emails" ON public.onboarding_emails
  FOR SELECT TO authenticated USING (public.is_current_user_admin());

DROP POLICY IF EXISTS "Admins and owners can view all onboarding" ON public.onboarding_responses;
CREATE POLICY "Admins and owners can view all onboarding" ON public.onboarding_responses
  FOR SELECT TO authenticated USING (
    auth.uid() = user_id OR public.is_current_user_admin() OR public.is_current_user_owner()
  );

DROP POLICY IF EXISTS "Admins can view page views" ON public.page_views;
CREATE POLICY "Admins can view page views" ON public.page_views
  FOR SELECT TO authenticated USING (public.is_current_user_admin());

DROP POLICY IF EXISTS "Admins can manage all paid session transactions" ON public.paid_session_transactions;
CREATE POLICY "Admins can manage all paid session transactions" ON public.paid_session_transactions
  FOR ALL TO authenticated USING (public.is_current_user_admin())
  WITH CHECK (public.is_current_user_admin());

DROP POLICY IF EXISTS "Admins can manage programs" ON public.programs;
CREATE POLICY "Admins can manage programs" ON public.programs
  FOR ALL TO authenticated USING (public.is_current_user_admin())
  WITH CHECK (public.is_current_user_admin());

DROP POLICY IF EXISTS "Admins can manage revenue metrics" ON public.revenue_metrics;
CREATE POLICY "Admins can manage revenue metrics" ON public.revenue_metrics
  FOR ALL TO authenticated USING (public.is_current_user_admin())
  WITH CHECK (public.is_current_user_admin());

DROP POLICY IF EXISTS "Admins can view all satisfaction scores" ON public.satisfaction_scores;
CREATE POLICY "Admins can view all satisfaction scores" ON public.satisfaction_scores
  FOR SELECT TO authenticated USING (public.is_current_user_admin());

DROP POLICY IF EXISTS "Admins can manage all attendance" ON public.session_attendance;
CREATE POLICY "Admins can manage all attendance" ON public.session_attendance
  FOR ALL TO authenticated USING (public.is_current_user_admin())
  WITH CHECK (public.is_current_user_admin());

DROP POLICY IF EXISTS "Admins can delete tutorial videos" ON public.tutorial_videos;
DROP POLICY IF EXISTS "Admins can insert tutorial videos" ON public.tutorial_videos;
DROP POLICY IF EXISTS "Admins can update tutorial videos" ON public.tutorial_videos;
CREATE POLICY "Admins can delete tutorial videos" ON public.tutorial_videos
  FOR DELETE TO authenticated USING (
    public.is_current_user_admin() OR public.has_role(auth.uid(),'owner'::public.member_role)
  );
CREATE POLICY "Admins can insert tutorial videos" ON public.tutorial_videos
  FOR INSERT TO authenticated WITH CHECK (
    public.is_current_user_admin() OR public.has_role(auth.uid(),'owner'::public.member_role)
  );
CREATE POLICY "Admins can update tutorial videos" ON public.tutorial_videos
  FOR UPDATE TO authenticated USING (
    public.is_current_user_admin() OR public.has_role(auth.uid(),'owner'::public.member_role)
  );

DROP POLICY IF EXISTS "Admins can manage all session quotas" ON public.user_session_quotas;
CREATE POLICY "Admins can manage all session quotas" ON public.user_session_quotas
  FOR ALL TO authenticated USING (public.is_current_user_admin())
  WITH CHECK (public.is_current_user_admin());

DROP POLICY IF EXISTS "Admins can view all weekly checkin responses" ON public.weekly_checkin_responses;
CREATE POLICY "Admins can view all weekly checkin responses" ON public.weekly_checkin_responses
  FOR ALL TO authenticated USING (public.is_current_user_admin())
  WITH CHECK (public.is_current_user_admin());
