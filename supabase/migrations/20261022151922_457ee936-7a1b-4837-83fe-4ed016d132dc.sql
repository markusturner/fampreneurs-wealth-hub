ALTER TABLE public.community_posts ADD COLUMN recording_source_post_id uuid REFERENCES public.community_posts(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX community_posts_recording_source_unique ON public.community_posts(recording_source_post_id) WHERE recording_source_post_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.guard_recording_source_post() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF auth.role() IN ('anon','authenticated') AND pg_trigger_depth() = 1 AND (NEW.recording_source_post_id IS NOT NULL OR (TG_OP='UPDATE' AND OLD.recording_source_post_id IS NOT NULL)) THEN
  RAISE EXCEPTION 'Recording copies are managed automatically';
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_recording_source_post() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER guard_recording_source_post BEFORE INSERT OR UPDATE ON public.community_posts FOR EACH ROW EXECUTE FUNCTION public.guard_recording_source_post();

CREATE OR REPLACE FUNCTION public.mirror_pea_recording_post() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NEW.program IS DISTINCT FROM 'tfba' OR NEW.category IS DISTINCT FROM 'recordings' OR NEW.parent_id IS NOT NULL OR NEW.recording_source_post_id IS NOT NULL THEN RETURN NEW; END IF;
 INSERT INTO public.community_posts (user_id,content,image_url,audio_url,video_url,gif_url,title,category,program,created_at,recording_source_post_id)
 VALUES (NEW.user_id,NEW.content,NEW.image_url,NEW.audio_url,NEW.video_url,NEW.gif_url,NEW.title,'recordings','tfv',NEW.created_at,NEW.id)
 ON CONFLICT (recording_source_post_id) WHERE recording_source_post_id IS NOT NULL DO UPDATE SET content=EXCLUDED.content,image_url=EXCLUDED.image_url,audio_url=EXCLUDED.audio_url,video_url=EXCLUDED.video_url,gif_url=EXCLUDED.gif_url,title=EXCLUDED.title,created_at=EXCLUDED.created_at;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.mirror_pea_recording_post() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER mirror_pea_recording_post AFTER INSERT OR UPDATE OF category,program,content,image_url,audio_url,video_url,gif_url,title ON public.community_posts FOR EACH ROW EXECUTE FUNCTION public.mirror_pea_recording_post();
DO $$ DECLARE j record; BEGIN FOR j IN SELECT jobid FROM cron.job WHERE jobname='ttv-fathom-recordings-hourly' LOOP PERFORM cron.unschedule(j.jobid); END LOOP; END $$;