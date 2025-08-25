-- Create storage bucket for governance assets
INSERT INTO storage.buckets (id, name, public) VALUES ('governance-assets', 'governance-assets', false);

-- Create RLS policies for governance assets bucket
CREATE POLICY "Users can upload their own governance assets" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'governance-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own governance assets" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'governance-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own governance assets" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'governance-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own governance assets" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'governance-assets' AND auth.uid()::text = (storage.foldername(name))[1]);