-- Fix the trigger to handle all users that currently have programs but no group assignments
-- First, let's manually assign users who should be in groups but aren't

-- Michelle Mattison with "The Family Business Accelerator" program
INSERT INTO public.group_memberships (group_id, user_id, role)
SELECT cg.id, p.user_id, 'member'
FROM public.profiles p
CROSS JOIN public.community_groups cg
WHERE p.program_name = 'The Family Business Accelerator'
AND cg.name = 'The Family Business Accelerator'
AND p.user_id = 'f6cad334-1da4-4ee0-8cf7-b0988c2e73ae'
ON CONFLICT (group_id, user_id) DO NOTHING;

-- Now let's run a cleanup to ensure ALL users with programs are in the correct groups
INSERT INTO public.group_memberships (group_id, user_id, role)
SELECT cg.id, p.user_id, 'member'
FROM public.profiles p
JOIN public.community_groups cg ON cg.name = p.program_name
WHERE p.program_name IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM public.group_memberships gm 
  WHERE gm.user_id = p.user_id AND gm.group_id = cg.id
)
ON CONFLICT (group_id, user_id) DO NOTHING;