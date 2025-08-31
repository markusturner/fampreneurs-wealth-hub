-- Create storage bucket for bank statements (idempotent)
insert into storage.buckets (id, name, public)
values ('bank-statements', 'bank-statements', false)
on conflict (id) do nothing;

-- Create bank_statement_uploads table
create table if not exists public.bank_statement_uploads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  filename text not null,
  file_path text not null,
  file_size integer,
  transactions_extracted integer default 0,
  processing_status text default 'completed',
  processed_at timestamptz default now(),
  created_at timestamptz not null default now()
);

-- Enable RLS and policies for uploads
alter table public.bank_statement_uploads enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'bank_statement_uploads' and policyname = 'Users can view their own uploads'
  ) then
    create policy "Users can view their own uploads"
      on public.bank_statement_uploads
      for select
      using (auth.uid() = user_id);
  end if;
end $$;

-- Allow inserts by authenticated users for flexibility (edge function uses service role which bypasses RLS)
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'bank_statement_uploads' and policyname = 'Users can insert their own upload records'
  ) then
    create policy "Users can insert their own upload records"
      on public.bank_statement_uploads
      for insert
      with check (auth.uid() = user_id);
  end if;
end $$;

-- Create bank_statement_transactions table
create table if not exists public.bank_statement_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  bank_statement_id uuid not null references public.bank_statement_uploads(id) on delete cascade,
  transaction_date date not null,
  description text not null,
  amount numeric(12,2) not null,
  category text,
  transaction_type text not null check (transaction_type in ('credit','debit')),
  reference_number text,
  created_at timestamptz not null default now()
);

-- Enable RLS and policies for transactions
alter table public.bank_statement_transactions enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'bank_statement_transactions' and policyname = 'Users can view their own transactions'
  ) then
    create policy "Users can view their own transactions"
      on public.bank_statement_transactions
      for select
      using (auth.uid() = user_id);
  end if;
end $$;

-- Storage policies for reading user's own files in bank-statements bucket
-- Allow public read is false; users can read files in a folder named by their UID
create policy if not exists "Users can read their own bank statement files"
  on storage.objects
  for select
  using (
    bucket_id = 'bank-statements'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Optional: allow authenticated users to upload to their own folder if needed by UI (safe)
create policy if not exists "Users can upload files to their own bank statements folder"
  on storage.objects
  for insert
  with check (
    bucket_id = 'bank-statements'
    and auth.uid()::text = (storage.foldername(name))[1]
  );