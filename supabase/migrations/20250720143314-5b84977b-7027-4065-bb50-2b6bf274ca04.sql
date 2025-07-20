-- Add order_index column to community_groups for drag and drop ordering
ALTER TABLE public.community_groups 
ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;

-- Update existing records to have order_index based on created_at
UPDATE public.community_groups 
SET order_index = (
  SELECT row_number() OVER (ORDER BY created_at) - 1
  FROM public.community_groups cg2 
  WHERE cg2.id = community_groups.id
) 
WHERE order_index = 0;