-- Create business_goals table for storing user business goals
CREATE TABLE IF NOT EXISTS business_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goals TEXT NOT NULL,
  target_revenue NUMERIC,
  target_timeline TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE business_goals ENABLE ROW LEVEL SECURITY;

-- Users can view and manage their own business goals
CREATE POLICY "Users can view their own business goals"
  ON business_goals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own business goals"
  ON business_goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own business goals"
  ON business_goals FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own business goals"
  ON business_goals FOR DELETE
  USING (auth.uid() = user_id);

-- Add updated_at trigger
CREATE TRIGGER update_business_goals_updated_at
  BEFORE UPDATE ON business_goals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();