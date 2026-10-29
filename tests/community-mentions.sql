BEGIN;
ALTER TABLE public.notifications DISABLE TRIGGER trigger_push_on_notification_insert;
CREATE TEMP TABLE mention_reply_test(id uuid,user_id uuid,content text,post_id uuid);
CREATE TRIGGER mention_test AFTER INSERT ON mention_reply_test FOR EACH ROW EXECUTE FUNCTION public.notify_community_comment_everyone();
DO $$
DECLARE post_row record; target record; sender uuid; expected integer; actual integer; event_key text;
BEGIN
 IF NOT public.community_mentions_name('@Markus Turner can you help?','Markus Turner') THEN RAISE EXCEPTION 'Trailing prose breaks mentions'; END IF;
 IF NOT public.community_mentions_name('@D''Juan Smith!','D''Juan Smith') THEN RAISE EXCEPTION 'Apostrophe names fail'; END IF;
 IF public.community_mentions_name('email@Markus Turner','Markus Turner') OR public.community_mentions_name('@Markus TurnerX','Markus Turner') THEN RAISE EXCEPTION 'Invalid mention boundary'; END IF;
 SELECT id,program,user_id INTO post_row FROM public.community_posts WHERE program='tfba' ORDER BY created_at DESC LIMIT 1;
 SELECT p.user_id,p.display_name INTO target FROM public.community_notification_recipients(post_row.program,post_row.user_id) r JOIN public.profiles p ON p.user_id=r.user_id WHERE p.display_name IS NOT NULL LIMIT 1;
 IF target.user_id IS NULL THEN RAISE EXCEPTION 'No test member'; END IF;
 sender:=post_row.user_id;
 SELECT count(*) INTO expected FROM public.community_notification_recipients(post_row.program,sender) r JOIN public.profiles p ON p.user_id=r.user_id WHERE public.community_mentions_name('@'||target.display_name||' can you help?',p.display_name);
 SELECT count(*) INTO actual FROM public.notifications WHERE reference_id=post_row.id;
 INSERT INTO mention_reply_test VALUES(gen_random_uuid(),sender,'@'||target.display_name||' can you help?',post_row.id);
 IF (SELECT count(*) FROM public.notifications WHERE reference_id=post_row.id)<>actual+expected THEN RAISE EXCEPTION 'Wrong reply mention audience'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.notifications WHERE reference_id=post_row.id AND user_id=target.user_id AND title LIKE 'You were mentioned%') THEN RAISE EXCEPTION 'Missing targeted alert'; END IF;
 event_key:='test-'||gen_random_uuid();
 SELECT count(*) INTO expected FROM public.profiles WHERE truheirs_access=true;
 IF public.notify_software_update(event_key)<>expected THEN RAISE EXCEPTION 'Wrong update audience'; END IF;
 IF public.notify_software_update(event_key)<>0 THEN RAISE EXCEPTION 'Duplicate publish sends alerts twice'; END IF;
 IF has_function_privilege('authenticated','public.notify_software_update(text)','execute') OR has_function_privilege('anon','public.notify_software_update(text)','execute') THEN RAISE EXCEPTION 'Public update broadcast privilege'; END IF;
END $$;
ROLLBACK;