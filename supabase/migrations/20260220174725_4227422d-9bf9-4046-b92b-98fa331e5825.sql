
-- Drop the restrictive check constraint and replace with one that includes all needed types including existing 'post' type
ALTER TABLE public.notifications 
DROP CONSTRAINT IF EXISTS notifications_notification_type_check;

ALTER TABLE public.notifications
ADD CONSTRAINT notifications_notification_type_check 
CHECK (notification_type IN (
  'message', 
  'meeting_scheduled', 
  'community_post', 
  'new_member', 
  'trust_created',
  'course_created',
  'group_message',
  'family_message',
  'weekly_checkin',
  'feedback',
  'general',
  'post'
));
