CREATE OR REPLACE FUNCTION public.community_notification_recipients(p_program text, p_sender uuid)
RETURNS TABLE(user_id uuid) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT DISTINCT gm.user_id FROM public.group_memberships gm
 JOIN public.community_groups cg ON cg.id=gm.group_id
 JOIN public.profiles p ON p.user_id=gm.user_id
 WHERE p_program IS NOT NULL AND btrim(p_program)<>''
 AND cg.name=ANY(public.program_group_names(p_program)) AND gm.user_id<>p_sender;
$$;
REVOKE ALL ON FUNCTION public.community_notification_recipients(text,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.community_notification_recipients(text,uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.community_has_everyone(p_content text)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path=public AS $$
 SELECT coalesce(regexp_replace(p_content,'<[^>]*>',' ','g') ~* '(^|[^[:alnum:]_@])@everyone\y',false);
$$;
REVOKE ALL ON FUNCTION public.community_has_everyone(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.community_has_everyone(text) TO authenticated,service_role;

CREATE OR REPLACE FUNCTION public.notify_community_post()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE poster_name text; disp text; everyone boolean; nav_link text;
BEGIN
 SELECT display_name INTO poster_name FROM public.profiles WHERE user_id=NEW.user_id;
 disp:=coalesce(public.program_display_name(NEW.program),'Community');
 everyone:=public.community_has_everyone(NEW.content);
 nav_link:='/workspace-community?program='||NEW.program||'&post='||NEW.id;
 INSERT INTO public.notifications(user_id,sender_id,notification_type,title,message,reference_id,link)
 SELECT r.user_id,NEW.user_id,'community_post',
 CASE WHEN everyone THEN '@everyone in '||disp ELSE 'New Post in '||disp END,
 coalesce(poster_name,'A member')||CASE WHEN everyone THEN ' mentioned everyone in ' ELSE ' posted in ' END||disp,
 NEW.id,nav_link FROM public.community_notification_recipients(NEW.program,NEW.user_id) r;
 RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_community_comment_everyone()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE post_program text; poster_name text; disp text;
BEGIN
 IF NOT public.community_has_everyone(NEW.content) THEN RETURN NEW; END IF;
 SELECT program INTO post_program FROM public.community_posts WHERE id=NEW.post_id;
 SELECT display_name INTO poster_name FROM public.profiles WHERE user_id=NEW.user_id;
 disp:=coalesce(public.program_display_name(post_program),'Community');
 INSERT INTO public.notifications(user_id,sender_id,notification_type,title,message,reference_id,link)
 SELECT r.user_id,NEW.user_id,'community_post','@everyone in '||disp,
 coalesce(poster_name,'A member')||' mentioned everyone in a reply in '||disp,
 NEW.post_id,'/workspace-community?program='||post_program||'&post='||NEW.post_id
 FROM public.community_notification_recipients(post_program,NEW.user_id) r;
 RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.notify_community_comment_everyone() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.notify_community_comment_everyone() TO service_role;
CREATE TRIGGER on_community_comment_everyone AFTER INSERT ON public.community_comments FOR EACH ROW EXECUTE FUNCTION public.notify_community_comment_everyone();