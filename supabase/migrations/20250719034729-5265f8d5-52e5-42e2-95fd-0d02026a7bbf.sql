-- Enable realtime for family_notifications table
ALTER TABLE family_notifications REPLICA IDENTITY FULL;

-- Add the table to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE family_notifications;