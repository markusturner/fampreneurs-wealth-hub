-- Add activation_point column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN activation_point TEXT;