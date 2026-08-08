-- ============================================================
-- Contract reports
-- Lets contract parties flag a contract for admin review.
-- RLS mirrors contracts_select_parties: only the client or the
-- professional on the contract can submit, and only as themselves.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.contract_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason text NOT NULL,
  details text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'dismissed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS contract_reports_contract_id_idx
  ON public.contract_reports (contract_id);

CREATE INDEX IF NOT EXISTS contract_reports_status_idx
  ON public.contract_reports (status);

ALTER TABLE public.contract_reports ENABLE ROW LEVEL SECURITY;

-- Only a party to the contract may file a report, and only for themselves.
CREATE POLICY "contract_reports_insert_parties" ON public.contract_reports
  FOR INSERT
  WITH CHECK (
    reporter_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.contracts
      WHERE contracts.id = contract_reports.contract_id
        AND (contracts.client_id = auth.uid() OR contracts.professional_id = auth.uid())
    )
  );

-- Reporters can read their own reports; admins use the service role.
CREATE POLICY "contract_reports_select_own" ON public.contract_reports
  FOR SELECT
  USING (reporter_id = auth.uid());
