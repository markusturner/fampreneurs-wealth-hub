-- Add real-time subscription trigger for group coaching sessions
CREATE OR REPLACE FUNCTION notify_session_enrollments()
RETURNS trigger AS $$
BEGIN
  -- Notify all group members about new recurring sessions
  PERFORM pg_notify('session_enrollments', json_build_object(
    'session_id', NEW.id,
    'user_id', NEW.user_id,
    'action', TG_OP
  )::text);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for session enrollments
DROP TRIGGER IF EXISTS session_enrollments_notify ON session_enrollments;
CREATE TRIGGER session_enrollments_notify
  AFTER INSERT OR UPDATE OR DELETE ON session_enrollments
  FOR EACH ROW EXECUTE FUNCTION notify_session_enrollments();

-- Ensure group members can see all group coaching sessions
ALTER TABLE group_coaching_sessions ENABLE ROW LEVEL SECURITY;

-- Update policy to allow all authenticated users to see group sessions
DROP POLICY IF EXISTS "Group coaching sessions are viewable by everyone" ON group_coaching_sessions;
CREATE POLICY "Group coaching sessions are viewable by everyone" 
ON group_coaching_sessions 
FOR SELECT 
USING (true);