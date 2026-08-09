-- ============================================================
-- Drop confirmed-dead legacy columns (Stripe leftovers + abandoned views fields)
--
-- Audit result: nothing in the app reads or writes any of these.
-- Live DB row counts were 0 for every Stripe column; the app only
-- ever used Paystack. jobs.view_count / jobs.views_count are both
-- abandoned halves of a rename that never landed, and
-- client_profiles.payment_method_on_file has zero references.
--
-- Deliberately KEPT: milestones.stripe_payment_intent_id —
-- the 20260718_milestones_paystack_refactor migration kept it for
-- history; do not drop.
-- ============================================================

-- profiles: Stripe customer/account IDs (live: 0 rows) + their unique indexes
DROP INDEX IF EXISTS public.profiles_stripe_account_id_key;
DROP INDEX IF EXISTS public.profiles_stripe_customer_id_key;

ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS stripe_account_id,
  DROP COLUMN IF EXISTS stripe_customer_id;

-- transactions: Stripe charge/transfer references (live: 0 rows)
ALTER TABLE public.transactions
  DROP COLUMN IF EXISTS stripe_charge_id,
  DROP COLUMN IF EXISTS stripe_transfer_id;

-- client_profiles: never used anywhere
ALTER TABLE public.client_profiles
  DROP COLUMN IF EXISTS payment_method_on_file;

-- jobs: abandoned views rename — neither column is wired to anything
ALTER TABLE public.jobs
  DROP COLUMN IF EXISTS view_count,
  DROP COLUMN IF EXISTS views_count;
