
ALTER TABLE public.course_videos
DROP CONSTRAINT IF EXISTS course_videos_video_type_check;

ALTER TABLE public.course_videos
ADD CONSTRAINT course_videos_video_type_check
CHECK (video_type IN ('embed', 'upload', 'external', 'youtube', 'vimeo', 'loom', 'direct'));
