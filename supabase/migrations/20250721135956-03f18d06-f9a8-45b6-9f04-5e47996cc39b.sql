-- Add investment_amount column to profiles table
ALTER TABLE public.profiles ADD COLUMN investment_amount NUMERIC DEFAULT 0;