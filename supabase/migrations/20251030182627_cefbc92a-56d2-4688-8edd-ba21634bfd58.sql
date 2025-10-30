-- Add birthday column to family_members table
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS birthday DATE;