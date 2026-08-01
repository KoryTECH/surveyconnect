-- Tier 1 #3: Geospatial Profile Schema
-- Add geospatial-specific fields to professional_profiles so buyers can search
-- pros by equipment, software, accreditations, delivery formats, and service area.

ALTER TABLE professional_profiles
  ADD COLUMN IF NOT EXISTS survey_equipment text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS delivery_formats text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS job_types_supported text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS accreditations jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS service_area_geo jsonb,
  ADD COLUMN IF NOT EXISTS service_area_radius_km numeric CHECK (service_area_radius_km IS NULL OR service_area_radius_km > 0),
  ADD COLUMN IF NOT EXISTS service_area_label text;

-- service_area_geo: GeoJSON FeatureCollection or Feature (Polygon/MultiPolygon)
-- representing the pro's working area. Stored as jsonb so we can later add GiST
-- indexing via ST_GeomFromGeoJSON once PostGIS is enabled on the project.
-- For now, treat it as opaque metadata; we'll add a geography( geography, 4326 )
-- computed column with a migration once PostGIS is confirmed enabled.

-- Index for fast lookups by job type supported.
CREATE INDEX IF NOT EXISTS idx_prof_profiles_job_types_supported
  ON professional_profiles USING GIN (job_types_supported);

-- Index for fast lookups by survey equipment.
CREATE INDEX IF NOT EXISTS idx_prof_profiles_survey_equipment
  ON professional_profiles USING GIN (survey_equipment);

-- Index for fast lookups by delivery formats.
CREATE INDEX IF NOT EXISTS idx_prof_profiles_delivery_formats
  ON professional_profiles USING GIN (delivery_formats);
