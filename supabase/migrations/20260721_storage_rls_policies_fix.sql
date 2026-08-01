-- Fix missing/broken storage RLS policies for job-briefs and
-- portfolio-attachments buckets.
--
-- Symptom on live DB:
--   "new row violates row-level security policy"
--   on POST /storage/v1/object/job-briefs/<uid>/job-brief-...docx
--   even though the bucket exists and the upload path's first folder
--   matches auth.uid().
--
-- Root cause: The 20260511_job_posting_apply_overhaul.sql migration
-- creates the bucket but the `INSERT INTO storage.policies ... ON
-- CONFLICT DO NOTHING` statements either silently no-op'd on a conflict
-- with a pre-existing (broken) policy of the same name, or never got
-- applied at all. The live DB currently has no working INSERT policy
-- on job-briefs, so any upload from a logged-in client fails with an
-- RLS violation.
--
-- Fix: Drop the named policies (idempotent — DROP POLICY IF EXISTS)
-- and re-create them with the correct definition. We also re-apply
-- the same treatment to portfolio-attachments since it came from the
-- same migration and likely has the same issue.

-- ===== job-briefs =====
DROP POLICY IF EXISTS "job_briefs_upload_own" ON storage.objects;
DROP POLICY IF EXISTS "job_briefs_delete_own" ON storage.objects;

CREATE POLICY "job_briefs_upload_own"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'job-briefs'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "job_briefs_delete_own"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'job-briefs'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow owner + service_role to read their own job-briefs (needed so
-- the client that uploaded can read it back, and so the server can
-- generate signed URLs). Without a SELECT policy, even the owner
-- can't list their own files.
CREATE POLICY "job_briefs_select_own"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'job-briefs'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ===== portfolio-attachments =====
DROP POLICY IF EXISTS "portfolio_attachments_upload_own" ON storage.objects;
DROP POLICY IF EXISTS "portfolio_attachments_delete_own" ON storage.objects;

CREATE POLICY "portfolio_attachments_upload_own"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'portfolio-attachments'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "portfolio_attachments_delete_own"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'portfolio-attachments'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow the pro that uploaded an attachment to read it back; needed
-- so the apply page can show the uploaded file in some flows and so
-- the server can fetch via signed URL.
CREATE POLICY "portfolio_attachments_select_own"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'portfolio-attachments'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
