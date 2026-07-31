GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_statement_uploads TO authenticated;
GRANT ALL ON public.bank_statement_uploads TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_statement_transactions TO authenticated;
GRANT ALL ON public.bank_statement_transactions TO service_role;