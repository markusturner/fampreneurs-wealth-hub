-- Run as a rolled-back migration: no messages, emails or phone alerts are sent.
BEGIN;
DO $$ DECLARE t record; BEGIN
 FOR t IN SELECT tgname FROM pg_trigger WHERE tgrelid='public.notifications'::regclass AND NOT tgisinternal LOOP
  EXECUTE format('ALTER TABLE public.notifications DISABLE TRIGGER %I',t.tgname);
 END LOOP;
END $$;
CREATE TEMP TABLE everyone_post_test (id uuid,user_id uuid,content text,program text);
CREATE TRIGGER notify_test AFTER INSERT ON everyone_post_test FOR EACH ROW EXECUTE FUNCTION public.notify_community_post();
CREATE TEMP TABLE everyone_comment_test (id uuid,user_id uuid,content text,post_id uuid);
CREATE TRIGGER notify_test AFTER INSERT ON everyone_comment_test FOR EACH ROW EXECUTE FUNCTION public.notify_community_comment_everyone();
DO $$
DECLARE prog text; sender uuid; ref uuid; expected uuid[]; actual uuid[]; post_record record;
BEGIN
 IF NOT public.community_has_everyone('<p>@EVERYONE!</p>') OR public.community_has_everyone('name@everyone.com') OR public.community_has_everyone('@everyones') THEN
  RAISE EXCEPTION 'Everyone mention boundary failed';
 END IF;
 SELECT user_id INTO sender FROM public.profiles ORDER BY user_id LIMIT 1;
 IF sender IS NULL THEN RAISE EXCEPTION 'No sender available for test'; END IF;
 FOREACH prog IN ARRAY ARRAY['fbu','tfv','tfba','tffm'] LOOP
  ref:=gen_random_uuid();
  SELECT array_agg(DISTINCT gm.user_id ORDER BY gm.user_id) INTO expected
  FROM public.group_memberships gm JOIN public.community_groups cg ON cg.id=gm.group_id
  JOIN public.profiles p ON p.user_id=gm.user_id
  WHERE cg.name=ANY(public.program_group_names(prog)) AND gm.user_id<>sender;
  INSERT INTO everyone_post_test VALUES(ref,sender,'@everyone check this message',prog);
  SELECT array_agg(user_id ORDER BY user_id) INTO actual FROM public.notifications WHERE reference_id=ref;
  IF coalesce(actual,ARRAY[]::uuid[])<>coalesce(expected,ARRAY[]::uuid[]) THEN RAISE EXCEPTION 'Wrong or duplicate recipients for %',prog; END IF;
  IF EXISTS(SELECT 1 FROM public.notifications WHERE reference_id=ref AND (title NOT LIKE '@everyone%' OR link NOT LIKE '%&post='||ref)) THEN RAISE EXCEPTION 'Missing mention title or post link'; END IF;
 END LOOP;
 ref:=gen_random_uuid();
 INSERT INTO everyone_post_test VALUES(ref,sender,'@everyone',NULL);
 IF EXISTS(SELECT 1 FROM public.notifications WHERE reference_id=ref) THEN RAISE EXCEPTION 'Unknown community broadcast'; END IF;
 SELECT id,program INTO post_record FROM public.community_posts WHERE program='tfba' ORDER BY created_at DESC LIMIT 1;
 IF post_record.id IS NULL THEN RAISE EXCEPTION 'No Accelerator post to test replies'; END IF;
 DELETE FROM public.notifications WHERE reference_id=post_record.id;
 INSERT INTO everyone_comment_test VALUES(gen_random_uuid(),sender,'@everyone reply',post_record.id);
 SELECT array_agg(user_id ORDER BY user_id) INTO actual FROM public.notifications WHERE reference_id=post_record.id;
 SELECT array_agg(user_id ORDER BY user_id) INTO expected FROM public.community_notification_recipients(post_record.program,sender);
 IF coalesce(actual,ARRAY[]::uuid[])<>coalesce(expected,ARRAY[]::uuid[]) THEN RAISE EXCEPTION 'Reply audience mismatch'; END IF;
END $$;
ROLLBACK;