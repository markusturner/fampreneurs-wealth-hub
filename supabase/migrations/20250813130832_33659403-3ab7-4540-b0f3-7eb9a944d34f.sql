-- Fix security warnings detected by the linter

-- Fix Function Search Path Mutable warnings by setting search_path on functions
-- This prevents potential SQL injection through search_path manipulation

ALTER FUNCTION public.user_needs_weekly_checkin(uuid) SET search_path = 'public', 'pg_temp';
ALTER FUNCTION public.is_family_office_only_user(uuid) SET search_path = 'public', 'pg_temp';
ALTER FUNCTION public.generate_certificate_number() SET search_path = 'public', 'pg_temp';
ALTER FUNCTION public.handle_course_completion() SET search_path = 'public', 'pg_temp';
ALTER FUNCTION public.calculate_member_score(uuid) SET search_path = 'public', 'pg_temp';
ALTER FUNCTION public.update_attendance_timestamps() SET search_path = 'public', 'pg_temp';
ALTER FUNCTION public.notify_family_about_meeting(text, timestamp with time zone, text) SET search_path = 'public', 'pg_temp';
ALTER FUNCTION public.user_has_premium_subscription(uuid) SET search_path = 'public', 'pg_temp';
ALTER FUNCTION public.auto_assign_to_community_group() SET search_path = 'public', 'pg_temp';
ALTER FUNCTION public.user_needs_feedback_notification(uuid) SET search_path = 'public', 'pg_temp';
ALTER FUNCTION public.is_user_admin_for_groups() SET search_path = 'public', 'pg_temp';
ALTER FUNCTION public.notify_family_members_about_meeting(text, date, time without time zone, text, uuid) SET search_path = 'public', 'pg_temp';
ALTER FUNCTION public.cleanup_expired_verification_codes() SET search_path = 'public', 'pg_temp';
ALTER FUNCTION public.create_message_notification() SET search_path = 'public', 'pg_temp';
ALTER FUNCTION public.auto_enroll_group_courses() SET search_path = 'public', 'pg_temp';
ALTER FUNCTION public.create_post_notification() SET search_path = 'public', 'pg_temp';
ALTER FUNCTION public.update_session_participant_count() SET search_path = 'public', 'pg_temp';
ALTER FUNCTION public.is_group_member(uuid, uuid) SET search_path = 'public', 'pg_temp';
ALTER FUNCTION public.can_join_group(uuid, uuid) SET search_path = 'public', 'pg_temp';
ALTER FUNCTION public.is_user_admin(uuid) SET search_path = 'public', 'pg_temp';
ALTER FUNCTION public.assign_admin_role(uuid, uuid) SET search_path = 'public', 'pg_temp';
ALTER FUNCTION public.assign_accountability_role(uuid, uuid, text[]) SET search_path = 'public', 'pg_temp';
ALTER FUNCTION public.assign_moderator_role(uuid, uuid) SET search_path = 'public', 'pg_temp';
ALTER FUNCTION public.assign_user_role(uuid, member_role, uuid) SET search_path = 'public', 'pg_temp';
ALTER FUNCTION public.remove_user_role(uuid, member_role, uuid) SET search_path = 'public', 'pg_temp';
ALTER FUNCTION public.update_group_call_quotas() SET search_path = 'public', 'pg_temp';
ALTER FUNCTION public.notify_session_enrollments() SET search_path = 'public', 'pg_temp';
ALTER FUNCTION public.handle_new_user() SET search_path = 'public', 'pg_temp';
ALTER FUNCTION public.update_updated_at_column() SET search_path = 'public', 'pg_temp';