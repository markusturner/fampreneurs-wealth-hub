-- Enable realtime for profiles table
ALTER TABLE profiles REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;

-- Enable realtime for subscribers table  
ALTER TABLE subscribers REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE subscribers;