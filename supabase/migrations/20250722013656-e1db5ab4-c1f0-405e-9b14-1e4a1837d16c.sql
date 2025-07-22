-- Add backend_cash_collected column to profiles table
ALTER TABLE public.profiles ADD COLUMN backend_cash_collected NUMERIC DEFAULT 0;