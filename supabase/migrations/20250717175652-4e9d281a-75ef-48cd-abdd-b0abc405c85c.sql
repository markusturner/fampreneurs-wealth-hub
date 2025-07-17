-- Create table for video documents
CREATE TABLE public.video_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id UUID NOT NULL,
  document_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.video_documents ENABLE ROW LEVEL SECURITY;

-- Create policies for video documents
CREATE POLICY "Video documents are viewable by everyone" 
ON public.video_documents 
FOR SELECT 
USING (true);

CREATE POLICY "Users can upload documents to videos they created" 
ON public.video_documents 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM course_videos cv 
    JOIN courses c ON cv.course_id = c.id 
    WHERE cv.id = video_documents.video_id 
    AND c.created_by = auth.uid()
  )
  AND auth.uid() = uploaded_by
);

CREATE POLICY "Users can update documents for videos they created" 
ON public.video_documents 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM course_videos cv 
    JOIN courses c ON cv.course_id = c.id 
    WHERE cv.id = video_documents.video_id 
    AND c.created_by = auth.uid()
  )
  AND auth.uid() = uploaded_by
);

CREATE POLICY "Users can delete documents for videos they created" 
ON public.video_documents 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM course_videos cv 
    JOIN courses c ON cv.course_id = c.id 
    WHERE cv.id = video_documents.video_id 
    AND c.created_by = auth.uid()
  )
  AND auth.uid() = uploaded_by
);

-- Create storage bucket for video documents
INSERT INTO storage.buckets (id, name, public) VALUES ('video-documents', 'video-documents', true);

-- Create storage policies for video documents
CREATE POLICY "Video documents are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'video-documents');

CREATE POLICY "Users can upload documents to their videos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'video-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their video documents" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'video-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their video documents" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'video-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add trigger for updated_at
CREATE TRIGGER update_video_documents_updated_at
BEFORE UPDATE ON public.video_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();