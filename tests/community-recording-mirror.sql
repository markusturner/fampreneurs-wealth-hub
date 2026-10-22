BEGIN;
DO $$
DECLARE actor uuid; source_id uuid; other_id uuid; copy_count integer;
BEGIN
 SELECT user_id INTO actor FROM public.community_posts WHERE program='tfba' AND category='recordings' LIMIT 1;
 IF actor IS NULL THEN RAISE EXCEPTION 'A real PEA post author is required'; END IF;
 INSERT INTO public.community_posts(user_id,content,title,program,category,created_at,video_url)
 VALUES(actor,'Mirror flow check','Mirror flow check','tfba','recordings','2026-01-02T12:00:00Z','https://example.com/recording') RETURNING id INTO source_id;
 SELECT count(*) INTO copy_count FROM public.community_posts WHERE recording_source_post_id=source_id AND program='tfv' AND category='recordings' AND content='Mirror flow check' AND created_at='2026-01-02T12:00:00Z' AND video_url='https://example.com/recording';
 IF copy_count<>1 THEN RAISE EXCEPTION 'New PEA recording must create one dated Trust Vault copy'; END IF;
 UPDATE public.community_posts SET video_url='https://example.com/updated-recording' WHERE id=source_id;
 SELECT count(*) INTO copy_count FROM public.community_posts WHERE recording_source_post_id=source_id;
 IF copy_count<>1 OR NOT EXISTS(SELECT 1 FROM public.community_posts WHERE recording_source_post_id=source_id AND video_url='https://example.com/updated-recording') THEN RAISE EXCEPTION 'Media updates must preserve exactly one copy'; END IF;
 INSERT INTO public.community_posts(user_id,content,program,category) VALUES(actor,'Not a recording','tfba','discussion') RETURNING id INTO other_id;
 IF EXISTS(SELECT 1 FROM public.community_posts WHERE recording_source_post_id=other_id) THEN RAISE EXCEPTION 'Discussion posts must not be copied'; END IF;
END $$;
ROLLBACK;