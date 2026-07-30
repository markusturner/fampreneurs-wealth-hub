DO $$
DECLARE r record; gid uuid; other uuid;
BEGIN
  FOR r IN SELECT user_id, linked_user_ids FROM public.profiles WHERE linked_user_ids IS NOT NULL AND array_length(linked_user_ids,1) > 0 LOOP
    SELECT partner_group_id INTO gid FROM public.profiles WHERE user_id = r.user_id;
    IF gid IS NULL THEN
      FOREACH other IN ARRAY r.linked_user_ids LOOP
        SELECT partner_group_id INTO gid FROM public.profiles WHERE user_id = other AND partner_group_id IS NOT NULL LIMIT 1;
        EXIT WHEN gid IS NOT NULL;
      END LOOP;
    END IF;
    IF gid IS NULL THEN gid := gen_random_uuid(); END IF;
    UPDATE public.profiles SET partner_group_id = gid WHERE user_id = r.user_id OR user_id = ANY(r.linked_user_ids);
  END LOOP;
END $$;