-- Create table to link groups to courses
CREATE TABLE public.group_courses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.community_groups(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(group_id, course_id)
);

-- Enable RLS
ALTER TABLE public.group_courses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for group_courses
CREATE POLICY "Users can view group courses for groups they belong to"
ON public.group_courses
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.group_memberships
    WHERE group_memberships.group_id = group_courses.group_id
    AND group_memberships.user_id = auth.uid()
  )
);

CREATE POLICY "Group admins can manage group courses"
ON public.group_courses
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.group_memberships
    WHERE group_memberships.group_id = group_courses.group_id
    AND group_memberships.user_id = auth.uid()
    AND group_memberships.role IN ('admin', 'moderator')
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.group_memberships
    WHERE group_memberships.group_id = group_courses.group_id
    AND group_memberships.user_id = auth.uid()
    AND group_memberships.role IN ('admin', 'moderator')
  )
);

-- Function to auto-enroll users in group courses when they join a group
CREATE OR REPLACE FUNCTION public.auto_enroll_group_courses()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- When a user joins a group, automatically enroll them in all group courses
  INSERT INTO public.course_enrollments (user_id, course_id)
  SELECT NEW.user_id, gc.course_id
  FROM public.group_courses gc
  WHERE gc.group_id = NEW.group_id
  AND NOT EXISTS (
    SELECT 1 FROM public.course_enrollments ce
    WHERE ce.user_id = NEW.user_id AND ce.course_id = gc.course_id
  );
  
  RETURN NEW;
END;
$$;

-- Trigger to auto-enroll users when they join groups
CREATE TRIGGER auto_enroll_group_courses_trigger
AFTER INSERT ON public.group_memberships
FOR EACH ROW
EXECUTE FUNCTION public.auto_enroll_group_courses();