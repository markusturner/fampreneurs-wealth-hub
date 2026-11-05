CREATE OR REPLACE FUNCTION public.sync_partner_extension()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF pg_trigger_depth() > 1 THEN RETURN NEW; END IF;
  IF NEW.contract_extension_date IS DISTINCT FROM OLD.contract_extension_date THEN
    UPDATE public.profiles p
    SET contract_extension_date = NEW.contract_extension_date
    WHERE p.user_id <> NEW.user_id
      AND p.contract_extension_date IS DISTINCT FROM NEW.contract_extension_date
      AND ((NEW.partner_group_id IS NOT NULL AND p.partner_group_id = NEW.partner_group_id)
           OR p.user_id = ANY(COALESCE(NEW.linked_user_ids, '{}')));
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_sync_partner_extension ON public.profiles;
CREATE TRIGGER trg_sync_partner_extension AFTER UPDATE OF contract_extension_date ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_partner_extension();