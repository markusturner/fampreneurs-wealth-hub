-- Add joined_at column to family_office_members table to track when members actually join
ALTER TABLE family_office_members 
ADD COLUMN joined_at timestamp with time zone;