-- Loosen portfolio-attachments storage bucket to match client-side validation
-- in lib/constants.ts (applyAttachmentKind). The bucket was created by
-- 20260511_job_posting_apply_overhaul.sql with allowed_mime_types limited
-- to PDF + DOCX and a 5MB file_size_limit. The apply flow now also accepts
-- PNG/JPEG/WEBP images and geospatial datasets (GeoJSON, KML, KMZ, Shapefile
-- zip, GeoTIFF, LAS/LAZ) up to 100MB. This migration brings the bucket
-- definition back in sync with the client so Supabase Storage stops
-- rejecting uploads that the UI already permits.

UPDATE storage.buckets
SET
  file_size_limit = 104857600,  -- 100 MB (matches MAX_APPLY_ATTACHMENT_GEODATA_SIZE)
  allowed_mime_types = ARRAY[
    -- Documents
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    -- Images
    'image/png',
    'image/jpeg',
    'image/webp',
    -- Geospatial — vector
    'application/geo+json',
    'application/vnd.geo+json',
    'application/json',
    'application/vnd.google-earth.kml+xml',
    'application/vnd.google-earth.kmz',
    -- Geospatial — zipped (Shapefile bundles)
    'application/zip',
    'application/x-zip-compressed',
    -- Geospatial — raster
    'image/tiff',
    'application/geotiff',
    'application/x-geotiff'
  ]
WHERE id = 'portfolio-attachments';
