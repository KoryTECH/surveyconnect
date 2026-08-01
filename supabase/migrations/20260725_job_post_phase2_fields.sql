-- Phase 2 multi-step job posting form
-- Adds structured site + category fields to the jobs table.
-- All columns nullable so existing rows / inserts continue to work.

-- Survey types the job requires (multi-select; same vocabulary as professional_profiles.job_types_supported)
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS survey_types text[] DEFAULT '{}'::text[];

-- Site location free text (distinguish from legacy `location` which doubles as job-type location)
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS site_location text;

-- Site size numeric + unit
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS site_size_value numeric;

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS site_size_unit text;

-- Site access classification
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS site_access text;

-- Free-form additional notes (terrain, CRS, etc.)
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS additional_notes text;

-- Optional index for filtering jobs by survey type (GIN since text[])
CREATE INDEX IF NOT EXISTS idx_jobs_survey_types
  ON public.jobs USING GIN (survey_types);

-- Optional indexes for site-based discovery
CREATE INDEX IF NOT EXISTS idx_jobs_site_access
  ON public.jobs (site_access);
