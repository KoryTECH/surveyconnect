-- ============================================================
-- Security & role separation hardening
-- 1. Job applications: clients may only change the status column
-- 2. profiles.role can never be changed via RLS
-- 3. Role-specific profile tables require the matching profiles.role
-- 4. Drop unused client_profiles.company_name
-- ============================================================

-- ----------------------------------------
-- 1. Column whitelist for client updates on job_applications
-- RLS USING/WITH CHECK cannot restrict which columns change, so a
-- BEFORE UPDATE trigger enforces that a job's client may only touch
-- the status column (updated_at is excluded as a benign timestamp).
-- Professionals updating their own rows and service-role/system
-- paths (auth.uid() IS NULL) are unaffected.
-- ----------------------------------------

CREATE OR REPLACE FUNCTION restrict_client_application_updates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  job_client_id uuid;
  old_public jsonb;
  new_public jsonb;
BEGIN
  -- Service-role / system writes (webhooks, paystack verify) are unrestricted.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Professionals may update their own application rows freely (RLS governs).
  IF auth.uid() = OLD.professional_id THEN
    RETURN NEW;
  END IF;

  -- Only the job's client is subject to the column whitelist.
  SELECT client_id INTO job_client_id FROM jobs WHERE id = OLD.job_id;

  IF job_client_id IS DISTINCT FROM auth.uid() THEN
    RETURN NEW; -- Not a party to the row; RLS blocks the update anyway.
  END IF;

  -- Compare every column except status and updated_at.
  old_public := to_jsonb(OLD) #- '{status}' #- '{updated_at}';
  new_public := to_jsonb(NEW) #- '{status}' #- '{updated_at}';

  IF old_public IS DISTINCT FROM new_public THEN
    RAISE EXCEPTION 'Clients may only update the status column of a job application';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_applications_client_status_only ON job_applications;
CREATE TRIGGER trg_applications_client_status_only
  BEFORE UPDATE ON job_applications
  FOR EACH ROW EXECUTE FUNCTION restrict_client_application_updates();

-- ----------------------------------------
-- 2. profiles_update_own: role can never change
-- WITH CHECK requires the NEW row's role to equal the CURRENT
-- stored role, so a user cannot flip between client and professional.
-- ----------------------------------------

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT role FROM profiles WHERE id = auth.uid())
  );

-- ----------------------------------------
-- 3. Role separation: professional_profiles / client_profiles
-- rows can only be created for accounts whose profiles.role matches.
-- ----------------------------------------

CREATE OR REPLACE FUNCTION enforce_professional_profile_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = NEW.id AND role = 'professional'
  ) THEN
    RAISE EXCEPTION 'Cannot create a professional profile for a non-professional account';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prof_profiles_role_required ON professional_profiles;
CREATE TRIGGER trg_prof_profiles_role_required
  BEFORE INSERT ON professional_profiles
  FOR EACH ROW EXECUTE FUNCTION enforce_professional_profile_role();

CREATE OR REPLACE FUNCTION enforce_client_profile_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = NEW.id AND role = 'client'
  ) THEN
    RAISE EXCEPTION 'Cannot create a client profile for a non-client account';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_client_profiles_role_required ON client_profiles;
CREATE TRIGGER trg_client_profiles_role_required
  BEFORE INSERT ON client_profiles
  FOR EACH ROW EXECUTE FUNCTION enforce_client_profile_role();

-- ----------------------------------------
-- 4. Drop unused company_name (replaced by profiles.username)
-- ----------------------------------------

ALTER TABLE public.client_profiles DROP COLUMN IF EXISTS company_name;
