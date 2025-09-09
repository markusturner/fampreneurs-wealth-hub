-- Create storage bucket for bank statements and documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'bank-statements',
  'bank-statements',
  false,
  10485760, -- 10MB limit
  ARRAY['text/csv', 'application/pdf', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
);

-- Create RLS policies for bank statement uploads
CREATE POLICY "Users can upload their own bank statements" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'bank-statements' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own bank statements" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'bank-statements' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own bank statements" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'bank-statements' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own bank statements" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'bank-statements' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Add file_type and file_path columns to bank_statement_uploads table
ALTER TABLE bank_statement_uploads 
ADD COLUMN file_type text DEFAULT 'csv',
ADD COLUMN storage_path text;