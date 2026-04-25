ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS ngn_amount_paid integer,
  ADD COLUMN IF NOT EXISTS exchange_rate_used numeric;
