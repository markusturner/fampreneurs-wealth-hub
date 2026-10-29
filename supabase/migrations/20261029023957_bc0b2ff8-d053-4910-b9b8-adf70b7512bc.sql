CREATE OR REPLACE FUNCTION public.community_mentions_name(p_content text,p_name text) RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path=public AS $$ SELECT nullif(btrim(p_name),'') IS NOT NULL AND regexp_replace(coalesce(p_content,''),'<[^>]*>',' ','g') ~* ('(^|[[:space:]])@'||regexp_replace(btrim(p_name),'([.\\+*?\[\](){}^$|])','\\\1','g')||'($|[^[:alnum:]_])'); $$;
CREATE OR REPLACE FUNCTION public.get_community_mention_members(p_program text) RETURNS TABLE(user_id uuid,display_name text,avatar_url text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT DISTINCT p.user_id,p.display_name,p.avatar_url FROM public.group_memberships gm JOIN public.community_groups cg ON cg.id=gm.group_id JOIN public.profiles p ON p.user_id=gm.user_id WHERE cg.name=ANY(public.program_group_names(p_program)) AND nullif(btrim(p.display_name),'') IS NOT NULL AND auth.uid() IS NOT NULL AND (public.is_current_user_admin() OR public.is_current_user_owner() OR EXISTS(SELECT 1 FROM public.group_memberships own WHERE own.group_id=gm.group_id AND own.user_id=auth.uid())) ORDER BY p.display_name,p.user_id;
$$;
REVOKE ALL ON FUNCTION public.get_community_mention_members(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_community_mention_members(text) TO authenticated,service_role;
CREATE OR REPLACE FUNCTION public.notify_community_post() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE poster_name text; disp text; everyone boolean;
BEGIN
 SELECT display_name INTO poster_name FROM public.profiles WHERE user_id=NEW.user_id;
 disp:=coalesce(public.program_display_name(NEW.program),'Community'); everyone:=public.community_has_everyone(NEW.content);
 INSERT INTO public.notifications(user_id,sender_id,notification_type,title,message,reference_id,link)
 SELECT r.user_id,NEW.user_id,'community_post',CASE WHEN everyone THEN '@everyone in '||disp WHEN public.community_mentions_name(NEW.content,p.display_name) THEN 'You were mentioned in '||disp ELSE 'New Post in '||disp END,
 coalesce(poster_name,'A member')||CASE WHEN everyone THEN ' mentioned everyone in ' WHEN public.community_mentions_name(NEW.content,p.display_name) THEN ' mentioned you in ' ELSE ' posted in ' END||disp,
 NEW.id,'/workspace-community?program='||NEW.program||'&post='||NEW.id FROM public.community_notification_recipients(NEW.program,NEW.user_id) r JOIN public.profiles p ON p.user_id=r.user_id;
 RETURN NEW;
END; $$;
CREATE OR REPLACE FUNCTION public.notify_community_comment_everyone() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE post_program text; poster_name text; disp text; everyone boolean;
BEGIN
 SELECT program INTO post_program FROM public.community_posts WHERE id=NEW.post_id;
 SELECT display_name INTO poster_name FROM public.profiles WHERE user_id=NEW.user_id;
 disp:=coalesce(public.program_display_name(post_program),'Community'); everyone:=public.community_has_everyone(NEW.content);
 INSERT INTO public.notifications(user_id,sender_id,notification_type,title,message,reference_id,link)
 SELECT r.user_id,NEW.user_id,'community_post',CASE WHEN everyone THEN '@everyone in '||disp ELSE 'You were mentioned in '||disp END,
 coalesce(poster_name,'A member')||CASE WHEN everyone THEN ' mentioned everyone in a reply in ' ELSE ' mentioned you in a reply in ' END||disp,
 NEW.post_id,'/workspace-community?program='||post_program||'&post='||NEW.post_id FROM public.community_notification_recipients(post_program,NEW.user_id) r JOIN public.profiles p ON p.user_id=r.user_id WHERE everyone OR public.community_mentions_name(NEW.content,p.display_name);
 RETURN NEW;
END; $$;