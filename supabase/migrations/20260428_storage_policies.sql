-- NOTE: These policies require the Supabase storage extension to be enabled.
-- If INSERT INTO storage.policies fails, apply these via:
-- Supabase Dashboard > Storage > verification-documents > Policies
-- or via `supabase storage policies` CLI commands.
-- The critical rule: NO public SELECT policy = files only accessible via server-side signed URLs.

-- Storage bucket policies for verification-documents
-- Run these via Supabase SQL editor or CLI after creating the bucket

-- 1. Ensure bucket exists and is NOT public
-- (Do this in Supabase dashboard: Storage > verification-documents > Make private)

-- 2. Allow authenticated professionals to upload only to their own folder
INSERT INTO storage.policies (name, bucket_id, operation, definition)
VALUES (
  'professionals_upload_own_folder',
  'verification-documents',
  'INSERT',
  '(auth.role() = ''authenticated'' AND auth.uid()::text = (storage.foldername(name))[1] AND (coalesce(auth.jwt() -> ''app_metadata'' -> ''roles'', ''[]''::jsonb) ? ''professional''))'
) ON CONFLICT DO NOTHING;

-- 4. Block all public SELECT — only service_role (server-side) can read
-- No SELECT policy = no access. Signed URLs are generated server-side only.

-- 5. Allow users to delete their own files (if reverification needed)
INSERT INTO storage.policies (name, bucket_id, operation, definition)
VALUES (
  'professionals_delete_own',
  'verification-documents',
  'DELETE',
  '(auth.uid()::text = (storage.foldername(name))[1])'
) ON CONFLICT DO NOTHING;
