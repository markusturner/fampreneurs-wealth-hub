-- Create storage bucket for bank statements
INSERT INTO storage.buckets (id, name, public) 
VALUES ('bank-statements', 'bank-statements', false);

-- Create RLS policies for bank statements bucket
CREATE POLICY "Users can upload their own bank statements" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'bank-statements' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own bank statements" 
ON storage.objects FOR SELECT 
USING (
  bucket_id = 'bank-statements' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own bank statements" 
ON storage.objects FOR DELETE 
USING (
  bucket_id = 'bank-statements' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Create table to track bank statement uploads
CREATE TABLE bank_statement_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  filename text NOT NULL,
  file_path text NOT NULL,
  file_size bigint,
  transactions_extracted integer DEFAULT 0,
  processing_status text DEFAULT 'pending',
  error_message text,
  uploaded_at timestamp with time zone DEFAULT now(),
  processed_at timestamp with time zone
);

-- Enable RLS on bank_statement_uploads
ALTER TABLE bank_statement_uploads ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for bank_statement_uploads
CREATE POLICY "Users can manage their own bank statement uploads" 
ON bank_statement_uploads FOR ALL 
USING (user_id = auth.uid()) 
WITH CHECK (user_id = auth.uid());