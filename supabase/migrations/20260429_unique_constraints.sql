CREATE UNIQUE INDEX IF NOT EXISTS job_applications_job_professional_uidx
  ON job_applications (job_id, professional_id);

CREATE UNIQUE INDEX IF NOT EXISTS reviews_contract_reviewer_uidx
  ON reviews (contract_id, reviewer_id);
