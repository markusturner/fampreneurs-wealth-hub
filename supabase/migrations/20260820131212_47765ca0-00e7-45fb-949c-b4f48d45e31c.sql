DROP TRIGGER IF EXISTS notify_trust_created_trigger ON public.trust_submissions;
DROP TRIGGER IF EXISTS trust_created_notify ON public.trust_submissions;
DROP TRIGGER IF EXISTS on_trust_created ON public.trust_submissions;

DO $$
DECLARE t RECORD;
BEGIN
  FOR t IN SELECT tgname FROM pg_trigger WHERE tgrelid = 'public.trust_submissions'::regclass AND NOT tgisinternal
  LOOP
    IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_trigger tr ON tr.tgfoid = p.oid WHERE tr.tgname = t.tgname AND p.proname = 'notify_trust_created') THEN
      EXECUTE format('DROP TRIGGER %I ON public.trust_submissions', t.tgname);
    END IF;
  END LOOP;
END $$;

DELETE FROM public.community_posts WHERE content LIKE '%just created a new trust. Congratulations!%';
DELETE FROM public.notifications WHERE notification_type = 'trust_created';