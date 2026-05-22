
-- SOPs documents (Notion-like internal docs)
CREATE TABLE public.sops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  content TEXT NOT NULL DEFAULT '',
  cover_image_url TEXT,
  icon TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'published',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view published sops"
  ON public.sops FOR SELECT TO authenticated
  USING (status = 'published' OR public.is_current_user_admin() OR public.is_current_user_owner());

CREATE POLICY "Admins and owners can insert sops"
  ON public.sops FOR INSERT TO authenticated
  WITH CHECK (public.is_current_user_admin() OR public.is_current_user_owner());

CREATE POLICY "Admins and owners can update sops"
  ON public.sops FOR UPDATE TO authenticated
  USING (public.is_current_user_admin() OR public.is_current_user_owner());

CREATE POLICY "Admins and owners can delete sops"
  ON public.sops FOR DELETE TO authenticated
  USING (public.is_current_user_admin() OR public.is_current_user_owner());

CREATE TRIGGER update_sops_updated_at
  BEFORE UPDATE ON public.sops
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Scroll-depth + time-on-page heat tracking (one row per user per sop, upserted)
CREATE TABLE public.sop_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sop_id UUID NOT NULL REFERENCES public.sops(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  max_scroll_pct INTEGER NOT NULL DEFAULT 0,
  total_time_seconds INTEGER NOT NULL DEFAULT 0,
  view_count INTEGER NOT NULL DEFAULT 1,
  first_viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (sop_id, user_id)
);

ALTER TABLE public.sop_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert their own sop views"
  ON public.sop_views FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update their own sop views"
  ON public.sop_views FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users read their own sop views, admins read all"
  ON public.sop_views FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_current_user_admin() OR public.is_current_user_owner());

CREATE INDEX idx_sop_views_sop ON public.sop_views(sop_id);
CREATE INDEX idx_sops_order ON public.sops(order_index);

-- Storage bucket for SOP embeds (images/files inside docs)
INSERT INTO storage.buckets (id, name, public) VALUES ('sop-assets', 'sop-assets', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view sop assets"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'sop-assets');

CREATE POLICY "Admins and owners can upload sop assets"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'sop-assets' AND (public.is_current_user_admin() OR public.is_current_user_owner()));

CREATE POLICY "Admins and owners can update sop assets"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'sop-assets' AND (public.is_current_user_admin() OR public.is_current_user_owner()));

CREATE POLICY "Admins and owners can delete sop assets"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'sop-assets' AND (public.is_current_user_admin() OR public.is_current_user_owner()));
