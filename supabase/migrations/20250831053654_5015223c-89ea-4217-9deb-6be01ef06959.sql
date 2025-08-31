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

-- Create policies using traditional syntax
create policy "Users can view their own uploads"
  on public.bank_statement_uploads
  for select
  using (auth.uid() = user_id);

create policy "Users can insert their own upload records"
  on public.bank_statement_uploads
  for insert
  with check (auth.uid() = user_id);

create policy "Users can view their own transactions"
  on public.bank_statement_transactions
  for select
  using (auth.uid() = user_id);

-- Storage policies for bank-statements bucket
create policy "Users can read their own bank statement files"
  on storage.objects
  for select
  using (
    bucket_id = 'bank-statements'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can upload files to their own bank statements folder"
  on storage.objects
  for insert
  with check (
    bucket_id = 'bank-statements'
    and auth.uid()::text = (storage.foldername(name))[1]
  );