CREATE OR REPLACE FUNCTION public.get_community_mention_members(p_program text) RETURNS TABLE(user_id uuid,display_name text,avatar_url text) LANGUAGE sql STABLE SECURITY INVOKER SET search_path=public AS $$
 WITH eligible AS (SELECT DISTINCT gm.user_id FROM public.group_memberships gm JOIN public.community_groups cg ON cg.id=gm.group_id WHERE cg.name=ANY(public.program_group_names(p_program)) AND auth.uid() IS NOT NULL AND (public.is_current_user_admin() OR public.is_current_user_owner() OR EXISTS(SELECT 1 FROM public.group_memberships own WHERE own.group_id=gm.group_id AND own.user_id=auth.uid()))) SELECT p.user_id,p.display_name,p.avatar_url FROM public.get_community_profiles(ARRAY(SELECT e.user_id FROM eligible e)) p WHERE nullif(btrim(p.display_name),'') IS NOT NULL ORDER BY p.display_name,p.user_id;
$$;
CREATE TABLE public.software_update_deliveries(event_id text PRIMARY KEY, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.software_update_deliveries TO service_role;
ALTER TABLE public.software_update_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service manages update deliveries" ON public.software_update_deliveries FOR ALL TO service_role USING(true) WITH CHECK(true);
CREATE TRIGGER software_updates_updated BEFORE UPDATE ON public.software_update_deliveries FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE OR REPLACE FUNCTION public.notify_software_update(p_event_id text) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE claimed text; total integer;
BEGIN
 IF p_event_id IS NULL OR length(p_event_id)>200 OR btrim(p_event_id)='' THEN RAISE EXCEPTION 'Invalid update event'; END IF;
 INSERT INTO public.software_update_deliveries(event_id) VALUES(p_event_id) ON CONFLICT DO NOTHING RETURNING event_id INTO claimed;
 IF claimed IS NULL THEN RETURN 0; END IF;
 INSERT INTO public.notifications(user_id,notification_type,title,message,link) SELECT user_id,'general','TruHeirs has been updated','New software updates are ready. Open TruHeirs to see the latest changes.','/welcome' FROM public.profiles WHERE truheirs_access=true;
 GET DIAGNOSTICS total=ROW_COUNT; RETURN total;
END; $$;
REVOKE ALL ON FUNCTION public.notify_software_update(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.notify_software_update(text) TO service_role;