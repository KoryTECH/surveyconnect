-- Tier 1 #5: Location-Aware Pricing Model
-- Adds per-hectare / per-km / per-point / per-polygon / per-acre pricing
-- columns to jobs. The existing flat-rate flow keeps `budget` as the headline
-- total; per-unit pricing stores the unit rate + quantity, with `budget`
-- remaining the computed total (kept in sync by the application layer).

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS pricing_model text NOT NULL DEFAULT 'flat',
  ADD COLUMN IF NOT EXISTS pricing_unit_rate numeric(12,2),
  ADD COLUMN IF NOT EXISTS pricing_quantity numeric(14,2),
  ADD COLUMN IF NOT EXISTS pricing_unit text,
  ADD COLUMN IF NOT EXISTS mobilization_fee numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS accuracy_class text;

-- Allow per-unit-priced jobs to scale higher than the flat $30,000 cap
-- (e.g. a 5,000 hectare survey is real scope). Cap at $100,000 for per-unit
-- models. Flat keeps the current $30,000 limit.
ALTER TABLE jobs
  DROP CONSTRAINT IF EXISTS jobs_budget_check;
ALTER TABLE jobs
  ADD CONSTRAINT jobs_budget_check CHECK (
    budget > 0
    AND (
      (pricing_model = 'flat' AND budget <= 30000)
      OR (pricing_model <> 'flat' AND budget <= 100000)
    )
  );

-- Same loosening for the agreed_budget on the contract side, since a contract
-- mirrors the job's agreed total.
ALTER TABLE contracts
  DROP CONSTRAINT IF EXISTS contracts_agreed_budget_check;
ALTER TABLE contracts
  ADD CONSTRAINT contracts_agreed_budget_check CHECK (
    agreed_budget > 0 AND agreed_budget <= 100000
  );

-- Index for filtering jobs by pricing model.
CREATE INDEX IF NOT EXISTS idx_jobs_pricing_model
  ON jobs (pricing_model) WHERE pricing_model <> 'flat';

-- Index for filtering jobs by accuracy class.
CREATE INDEX IF NOT EXISTS idx_jobs_accuracy_class
  ON jobs (accuracy_class) WHERE accuracy_class IS NOT NULL;
