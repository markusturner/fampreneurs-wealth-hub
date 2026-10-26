BEGIN;
DO $$
DECLARE
 copy_id uuid; source_id uuid; original_title text;
 actor uuid; role_name text; changed integer; rejected boolean;
BEGIN
 SELECT id,recording_source_post_id,title INTO copy_id,source_id,original_title
 FROM public.community_posts WHERE recording_source_post_id IS NOT NULL LIMIT 1;
 IF copy_id IS NULL THEN RAISE EXCEPTION 'A copied recording is required'; END IF;

 FOREACH role_name IN ARRAY ARRAY['admin','owner'] LOOP
  SELECT user_id INTO actor FROM public.user_roles WHERE role=role_name::public.member_role LIMIT 1;
  IF actor IS NULL THEN RAISE EXCEPTION 'A % account is required',role_name; END IF;
  PERFORM set_config('request.jwt.claims',json_build_object('sub',actor,'role','authenticated')::text,true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  UPDATE public.community_posts SET pinned=true,pinned_at=now() WHERE id=copy_id;
  GET DIAGNOSTICS changed = ROW_COUNT;
  IF changed<>1 OR NOT EXISTS(SELECT 1 FROM public.community_posts WHERE id=copy_id AND pinned=true AND pinned_at IS NOT NULL) THEN
   RAISE EXCEPTION '% must be able to pin a copied recording',role_name;
  END IF;
  UPDATE public.community_posts SET pinned=false,pinned_at=NULL WHERE id=copy_id;
  IF NOT EXISTS(SELECT 1 FROM public.community_posts WHERE id=copy_id AND pinned=false AND pinned_at IS NULL) THEN
   RAISE EXCEPTION '% must be able to unpin a copied recording',role_name;
  END IF;
  UPDATE public.community_posts SET title='Permission test',content='Edited recording content' WHERE id=copy_id;
  IF NOT EXISTS(SELECT 1 FROM public.community_posts WHERE id=copy_id AND title='Permission test' AND content='Edited recording content') THEN
   RAISE EXCEPTION '% must be able to edit a copied recording',role_name;
  END IF;
  rejected := false;
  BEGIN
   UPDATE public.community_posts SET recording_source_post_id=NULL WHERE id=copy_id;
  EXCEPTION WHEN raise_exception THEN
   IF SQLERRM <> 'Recording copies are managed automatically' THEN RAISE; END IF;
   rejected := true;
  END;
  IF NOT rejected THEN RAISE EXCEPTION '% must not detach the source link',role_name; END IF;
  EXECUTE 'RESET ROLE';
 END LOOP;

 SELECT user_id INTO actor FROM public.user_roles r WHERE role='member'
 AND NOT EXISTS(SELECT 1 FROM public.user_roles elevated WHERE elevated.user_id=r.user_id AND elevated.role IN ('admin','owner')) LIMIT 1;
 IF actor IS NULL THEN RAISE EXCEPTION 'A non-admin member is required'; END IF;
 PERFORM set_config('request.jwt.claims',json_build_object('sub',actor,'role','authenticated')::text,true);
 -- Privileged execution isolates the trigger protection even for a post's author.
 rejected := false;
 BEGIN
  UPDATE public.community_posts SET title='Unauthorized edit' WHERE id=copy_id;
 EXCEPTION WHEN raise_exception THEN
  IF SQLERRM <> 'Recording copies are managed automatically' THEN RAISE; END IF;
  rejected := true;
 END;
 IF NOT rejected THEN RAISE EXCEPTION 'Members must not edit copied recordings'; END IF;
 EXECUTE 'SET LOCAL ROLE authenticated';
 UPDATE public.community_posts SET pinned=true WHERE id=copy_id;
 GET DIAGNOSTICS changed = ROW_COUNT;
 IF changed<>0 THEN RAISE EXCEPTION 'RLS must not grant members copied-recording updates'; END IF;
 EXECUTE 'RESET ROLE';

 PERFORM set_config('request.jwt.claims','{}',true);
 UPDATE public.community_posts SET pinned=true,pinned_at=now() WHERE id=copy_id;
 UPDATE public.community_posts SET title=COALESCE(original_title,'') || ' source sync test' WHERE id=source_id;
 IF NOT EXISTS(SELECT 1 FROM public.community_posts WHERE id=copy_id AND title=COALESCE(original_title,'') || ' source sync test' AND pinned=true) THEN
  RAISE EXCEPTION 'Source edits must synchronize content without resetting local pins';
 END IF;
 IF (SELECT count(*) FROM public.community_posts WHERE recording_source_post_id=source_id)<>1 THEN
  RAISE EXCEPTION 'Editing must preserve exactly one copy';
 END IF;
END $$;
ROLLBACK;