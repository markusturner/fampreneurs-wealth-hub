-- Add missing DELETE and UPDATE policies for categories table
CREATE POLICY "Users can update categories they created" 
ON public.categories 
FOR UPDATE 
USING (auth.uid() = created_by);

CREATE POLICY "Users can delete categories they created" 
ON public.categories 
FOR DELETE 
USING (auth.uid() = created_by);