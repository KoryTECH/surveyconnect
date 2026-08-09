-- ============================================================
-- Chat file attachments (message-attachments bucket + message columns)
--
-- Storage: private bucket, files stored under <contractId>/<file>.
-- RLS scopes access to the two contract parties only — unlike the
-- own-folder (auth.uid) pattern used by the profile-scoped buckets,
-- the path is scoped by contract_id and the party check goes through
-- the contracts table, so BOTH parties can upload/read the same file.
-- Contracts RLS (contracts_select_parties) already restricts the
-- subquery to parties; the explicit client_id/professional_id check
-- makes it robust regardless.
--
-- No DELETE policy: chat files are referenced by sent messages and
-- must persist; cleanup is an admin/service-role job.
-- ============================================================

-- 1. Create the private bucket (5 MB limit, doc/image/plain-text types —
--    matches verification-documents / portfolio-attachments limits)
INSERT INTO storage.buckets ("id","name","owner","created_at","updated_at","public","avif_autodetection","file_size_limit","allowed_mime_types","owner_id","type")
VALUES (
  'message-attachments',
  'message-attachments',
  NULL,
  now(),
  now(),
  false,
  false,
  5242880,
  '{application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png,image/webp,text/plain}',
  NULL,
  'STANDARD'
) ON CONFLICT (id) DO NOTHING;

-- 2. Insert policy: only the client or professional on the contract
DROP POLICY IF EXISTS "message_attachments_insert_parties" ON storage.objects;
CREATE POLICY "message_attachments_insert_parties"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'message-attachments'
    AND EXISTS (
      SELECT 1 FROM public.contracts
      WHERE contracts.id = (storage.foldername(name))[1]::uuid
        AND (contracts.client_id = auth.uid() OR contracts.professional_id = auth.uid())
    )
  );

-- 3. Select policy: both parties can read files in their contract's folder
--    (needed for the client-side signed-URL downloads)
DROP POLICY IF EXISTS "message_attachments_select_parties" ON storage.objects;
CREATE POLICY "message_attachments_select_parties"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'message-attachments'
    AND EXISTS (
      SELECT 1 FROM public.contracts
      WHERE contracts.id = (storage.foldername(name))[1]::uuid
        AND (contracts.client_id = auth.uid() OR contracts.professional_id = auth.uid())
    )
  );

-- 4. Message columns: attachment_url/attachment_type already exist from
--    the original schema (never populated); add name + size
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS attachment_name text,
  ADD COLUMN IF NOT EXISTS attachment_size integer;
