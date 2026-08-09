-- Fix storage RLS for the verification-documents bucket.
--
-- Same root cause as 20260721_storage_rls_policies_fix.sql (job-briefs,
-- portfolio-attachments), missed in that pass:
--
--   1. The original 20260428_storage_policies.sql created policies via
--      `INSERT INTO storage.policies ... ON CONFLICT DO NOTHING`, which
--      can silently no-op against a pre-existing policy of the same name
--      or never apply at all, leaving the live DB with a broken or
--      missing INSERT policy → uploads fail with "new row violates
--      row-level security policy".
--
--   2. The old INSERT policy also carried an extra role check on
--      `auth.jwt() -> 'app_metadata' -> 'roles' ? 'professional'` — a
--      field the app never populates, so the check can never pass.
--      Dropped deliberately: professional-only gating is already enforced
--      by the /verification page, so the storage layer only needs the
--      own-folder scope.
--
--   3. No SELECT policy existed (by original design, "signed URLs only").
--      Following the fix migration pattern, owners get a SELECT on their
--      own folder so they can list/read their own files; everyone else
--      is still blocked — signed URLs keep working via the service role.

-- ===== verification-documents =====
DROP POLICY IF EXISTS "professionals_upload_own_folder" ON storage.objects;
DROP POLICY IF EXISTS "professionals_delete_own" ON storage.objects;
DROP POLICY IF EXISTS "verification_documents_upload_own" ON storage.objects;
DROP POLICY IF EXISTS "verification_documents_delete_own" ON storage.objects;
DROP POLICY IF EXISTS "verification_documents_select_own" ON storage.objects;

CREATE POLICY "verification_documents_upload_own"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'verification-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "verification_documents_delete_own"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'verification-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "verification_documents_select_own"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'verification-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
