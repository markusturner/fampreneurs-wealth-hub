
-- Add ref_code to page_views for click tracking by affiliate code
ALTER TABLE public.page_views ADD COLUMN IF NOT EXISTS ref_code TEXT;
CREATE INDEX IF NOT EXISTS idx_page_views_ref_code ON public.page_views(ref_code);

-- Affiliate links managed by admins/owner
CREATE TABLE IF NOT EXISTS public.affiliate_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  code TEXT NOT NULL UNIQUE,
  recipient_name TEXT NOT NULL,
  recipient_email TEXT,
  target_url TEXT NOT NULL DEFAULT 'https://famlytics.io/f/the-family-business-accelerator-d3q4x7',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_affiliate_links_code ON public.affiliate_links(code);

ALTER TABLE public.affiliate_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and owners view affiliate links"
ON public.affiliate_links FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Admins and owners insert affiliate links"
ON public.affiliate_links FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Admins and owners update affiliate links"
ON public.affiliate_links FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Admins and owners delete affiliate links"
ON public.affiliate_links FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

CREATE TRIGGER update_affiliate_links_updated_at
BEFORE UPDATE ON public.affiliate_links
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Affiliate signups
CREATE TABLE IF NOT EXISTS public.affiliate_signups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL,
  user_id UUID,
  visitor_id TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_affiliate_signups_code ON public.affiliate_signups(code);

ALTER TABLE public.affiliate_signups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can record affiliate signup"
ON public.affiliate_signups FOR INSERT TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Admins and owners view affiliate signups"
ON public.affiliate_signups FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));
