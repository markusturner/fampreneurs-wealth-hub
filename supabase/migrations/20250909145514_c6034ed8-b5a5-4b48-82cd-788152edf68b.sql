-- Update existing bucket to support the file types we need
UPDATE storage.buckets 
SET 
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['text/csv', 'application/pdf', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
WHERE id = 'bank-statements';

-- Add columns to bank_statement_uploads table if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bank_statement_uploads' AND column_name='file_type') THEN
        ALTER TABLE bank_statement_uploads ADD COLUMN file_type text DEFAULT 'csv';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bank_statement_uploads' AND column_name='storage_path') THEN
        ALTER TABLE bank_statement_uploads ADD COLUMN storage_path text;
    END IF;
END $$;