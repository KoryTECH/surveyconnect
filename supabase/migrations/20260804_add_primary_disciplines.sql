-- ============================================================
-- Add "primary_disciplines" to professional_profiles
-- (signup redesign - professional panel discipline chips)
-- Usage: run in Supabase dashboard SQL editor against production
-- in the same batch as 20260803_add_username_column.sql and
-- 20260804_security_role_separation.sql.
-- ============================================================

ALTER TABLE public.professional_profiles
  ADD COLUMN IF NOT EXISTS primary_disciplines text[] DEFAULT '{}'::text[];
