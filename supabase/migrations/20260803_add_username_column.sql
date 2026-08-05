-- ============================================================
-- Add "username" column to profiles (signup redesign — client panel)
-- Usage: run in Supabase dashboard SQL editor against production
-- before deploying the signup redesign.
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username text;

-- Unique where non-null, so legacy rows without a username are unaffected
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_key
  ON public.profiles (username)
  WHERE username IS NOT NULL;
