CREATE TABLE public.markus_knowledge_sources (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), platform text NOT NULL CHECK (platform IN ('youtube','instagram','tiktok','linkedin','fathom')), profile_url text NOT NULL, enabled boolean NOT NULL DEFAULT false, config jsonb NOT NULL DEFAULT '{}'::jsonb, last_started_at timestamptz, last_success_at timestamptz, run_id text, dataset_id text, last_error text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(platform,profile_url));
GRANT SELECT ON public.markus_knowledge_sources TO authenticated; GRANT ALL ON public.markus_knowledge_sources TO service_role;
ALTER TABLE public.markus_knowledge_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY markus_sources_admin_read ON public.markus_knowledge_sources FOR SELECT TO authenticated USING (public.is_current_user_admin() OR public.is_current_user_owner());
CREATE TRIGGER markus_sources_updated BEFORE UPDATE ON public.markus_knowledge_sources FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TABLE public.markus_knowledge_documents (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), source_id uuid NOT NULL REFERENCES public.markus_knowledge_sources(id) ON DELETE CASCADE, external_id text NOT NULL, title text NOT NULL, source_url text NOT NULL, published_at timestamptz, observed_at timestamptz NOT NULL DEFAULT now(), available_at timestamptz NOT NULL, content text NOT NULL, status text NOT NULL DEFAULT 'approved' CHECK(status IN ('approved','review','excluded')), approved_by uuid, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(source_id,external_id));
GRANT SELECT ON public.markus_knowledge_documents TO authenticated; GRANT ALL ON public.markus_knowledge_documents TO service_role;
ALTER TABLE public.markus_knowledge_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY markus_docs_admin_read ON public.markus_knowledge_documents FOR SELECT TO authenticated USING(public.is_current_user_admin() OR public.is_current_user_owner());
CREATE TRIGGER markus_docs_updated BEFORE UPDATE ON public.markus_knowledge_documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX markus_docs_search ON public.markus_knowledge_documents USING gin(to_tsvector('english',content));
CREATE TABLE public.markus_knowledge_job (id boolean PRIMARY KEY DEFAULT true CHECK(id), paused boolean NOT NULL DEFAULT false, pause_reason text, lease_until timestamptz, last_run_at timestamptz, updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.markus_knowledge_job TO authenticated; GRANT ALL ON public.markus_knowledge_job TO service_role;
ALTER TABLE public.markus_knowledge_job ENABLE ROW LEVEL SECURITY;
CREATE POLICY markus_job_admin_read ON public.markus_knowledge_job FOR SELECT TO authenticated USING(public.is_current_user_admin() OR public.is_current_user_owner());
CREATE TRIGGER markus_job_updated BEFORE UPDATE ON public.markus_knowledge_job FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
INSERT INTO public.markus_knowledge_job(id) VALUES(true);
CREATE FUNCTION public.acquire_markus_knowledge_lease() RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE acquired boolean; BEGIN UPDATE public.markus_knowledge_job SET lease_until=now()+interval '5 minutes',last_run_at=now() WHERE id=true AND NOT paused AND (lease_until IS NULL OR lease_until < now()) RETURNING true INTO acquired; RETURN coalesce(acquired,false); END; $$;
REVOKE ALL ON FUNCTION public.acquire_markus_knowledge_lease() FROM PUBLIC,anon,authenticated; GRANT EXECUTE ON FUNCTION public.acquire_markus_knowledge_lease() TO service_role;
CREATE FUNCTION public.search_markus_knowledge(search_text text) RETURNS TABLE(title text,source_url text,published_at timestamptz,content text) LANGUAGE sql STABLE SET search_path=public AS $$ SELECT d.title,d.source_url,d.published_at,left(d.content,7000) FROM public.markus_knowledge_documents d JOIN public.markus_knowledge_sources s ON s.id=d.source_id WHERE d.status='approved' AND s.enabled AND d.available_at<=now() AND to_tsvector('english',d.content) @@ websearch_to_tsquery('english',left(search_text,4000)) ORDER BY ts_rank(to_tsvector('english',d.content),websearch_to_tsquery('english',left(search_text,4000))) DESC,d.published_at DESC NULLS LAST LIMIT 5; $$;
REVOKE ALL ON FUNCTION public.search_markus_knowledge(text) FROM PUBLIC,anon,authenticated; GRANT EXECUTE ON FUNCTION public.search_markus_knowledge(text) TO service_role;
INSERT INTO public.markus_knowledge_sources(platform,profile_url,enabled,config) VALUES
('youtube','https://www.youtube.com/@markusturner',true,'{"handle":"@markusturner"}'),
('instagram','https://www.instagram.com/markusturnerofficial/',true,'{"handle":"markusturnerofficial"}'),
('tiktok','https://www.tiktok.com/@markusturnerofficial',true,'{"handle":"markusturnerofficial"}'),
('linkedin','https://www.linkedin.com/in/markusturner/',true,'{"handle":"markusturner"}'),
('fathom','https://fathom.video',false,'{}');