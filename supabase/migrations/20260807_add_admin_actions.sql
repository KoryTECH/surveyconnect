-- ============================================================
-- Admin actions audit log
-- Records privileged admin actions (e.g. force payment release)
-- for a retrievable trail of who did what and when.
-- Deny-all RLS: the table is only readable/writable through
-- admin-gated API routes using the service role. Signed-in users
-- (including admins in the browser) have no direct access, which
-- is intentional — the log must not be editable from the client.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.admin_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action text NOT NULL,
  contract_id uuid REFERENCES public.contracts(id) ON DELETE SET NULL,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_actions_admin_id_idx
  ON public.admin_actions (admin_id);

CREATE INDEX IF NOT EXISTS admin_actions_contract_id_idx
  ON public.admin_actions (contract_id);

CREATE INDEX IF NOT EXISTS admin_actions_created_at_idx
  ON public.admin_actions (created_at DESC);

ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;
