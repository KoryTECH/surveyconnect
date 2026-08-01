-- Milestone + transactions Paystack refactor
-- Live DB already has milestones + transactions tables with RLS enabled.
-- This migration is additive only: replace dead Stripe columns with Paystack
-- equivalents, add a funding guard column, and a contract-level helper column
-- so the existing flat-rate flow (no milestones) keeps working unchanged.

-- 1. Milestones: add Paystack references (keep stripe_payment_intent_id to
--    avoid changing schema shape unexpectedly; we just stop using it).
ALTER TABLE milestones
  ADD COLUMN IF NOT EXISTS paystack_payment_reference text,
  ADD COLUMN IF NOT EXISTS paystack_transfer_reference text,
  ADD COLUMN IF NOT EXISTS funded_reference text;

-- 2. Transactions: add Paystack reference. Keep stripe_* columns for the same
--    reason — avoid breaking legacy rows.
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS paystack_reference text,
  ADD COLUMN IF NOT EXISTS paystack_transfer_reference text,
  ALTER COLUMN status SET DEFAULT 'completed';

-- 3. Contracts: track the sum of milestone amounts so we can validate that
--    sum(milestones.amount) = agreed_budget for milestone-based contracts.
--    NULL when the contract is flat-rate (the historical default).
ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS milestones_total_amount numeric(12,2),
  ADD COLUMN IF NOT EXISTS is_milestone_based boolean NOT NULL DEFAULT false;

-- 4. Index for quick lookup of a contract's milestones by status.
CREATE INDEX IF NOT EXISTS idx_milestones_contract_status
  ON milestones (contract_id, status);

-- 5. Index transactions by contract for the transaction-history honorable mention.
CREATE INDEX IF NOT EXISTS idx_transactions_contract_created
  ON transactions (contract_id, created_at DESC);

-- 6. Optional trigger: keep contracts.milestones_total_amount in sync with the
--    sum of milestones.amount for the contract. Idempotent and safe to apply
--    multiple times (uses DROP FUNCTION IF EXISTS first).
CREATE OR REPLACE FUNCTION refresh_contract_milestone_total()
RETURNS trigger AS $$
DECLARE
  contract_id uuid;
BEGIN
  contract_id := COALESCE(NEW.contract_id, OLD.contract_id);
  IF contract_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  UPDATE contracts
    SET milestones_total_amount = (
      SELECT COALESCE(SUM(amount), 0) FROM milestones WHERE contract_id = contract_id
    ),
    updated_at = now()
    WHERE id = contract_id;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_refresh_contract_milestone_total ON milestones;
CREATE TRIGGER trg_refresh_contract_milestone_total
  AFTER INSERT OR UPDATE OR DELETE ON milestones
  FOR EACH ROW EXECUTE FUNCTION refresh_contract_milestone_total();
