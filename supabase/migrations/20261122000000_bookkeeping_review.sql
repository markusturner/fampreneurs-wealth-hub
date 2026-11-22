-- Bookkeeping layer: mark accounts business/personal and track transaction review.
ALTER TABLE public.connected_accounts
  ADD COLUMN IF NOT EXISTS account_purpose text NOT NULL DEFAULT 'personal'
  CHECK (account_purpose IN ('personal', 'business'));

ALTER TABLE public.account_transactions
  ADD COLUMN IF NOT EXISTS review_status text NOT NULL DEFAULT 'needs_review'
  CHECK (review_status IN ('needs_review', 'reviewed')),
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_account_transactions_user_review
  ON public.account_transactions (user_id, review_status, transaction_date DESC);
