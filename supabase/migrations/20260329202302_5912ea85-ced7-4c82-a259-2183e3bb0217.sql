
-- Add admin_notes column to profiles for rich text admin notes
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS admin_notes TEXT DEFAULT NULL;

-- Add admin_joined_date column to profiles so admins can override the displayed join date
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS admin_joined_date DATE DEFAULT NULL;
