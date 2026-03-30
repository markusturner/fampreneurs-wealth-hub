ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS activation_points text[] DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS satisfaction_score integer;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS first_win_date date;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS testimonial_review text;