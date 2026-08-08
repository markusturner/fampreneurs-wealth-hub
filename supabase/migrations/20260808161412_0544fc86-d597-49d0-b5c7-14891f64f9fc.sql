UPDATE public.community_groups SET name = 'The Private Estate Accelerator' WHERE name = 'The Family Business Accelerator';

UPDATE public.profiles
SET display_name = 'Verona', first_name = 'Verona', last_name = ''
WHERE user_id = 'ec682fd5-1c4c-45bd-9cca-d6973486f103';

INSERT INTO public.group_memberships (user_id, group_id)
SELECT 'ec682fd5-1c4c-45bd-9cca-d6973486f103', id FROM public.community_groups WHERE name = 'The Private Estate Accelerator'
ON CONFLICT DO NOTHING;