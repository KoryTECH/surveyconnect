CREATE OR REPLACE FUNCTION increment_applications_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE jobs SET applications_count = applications_count + 1
  WHERE id = NEW.job_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION decrement_applications_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE jobs SET applications_count = GREATEST(applications_count - 1, 0)
  WHERE id = OLD.job_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_inc_applications_count ON job_applications;
CREATE TRIGGER trg_inc_applications_count
  AFTER INSERT ON job_applications
  FOR EACH ROW EXECUTE FUNCTION increment_applications_count();

DROP TRIGGER IF EXISTS trg_dec_applications_count ON job_applications;
CREATE TRIGGER trg_dec_applications_count
  AFTER DELETE ON job_applications
  FOR EACH ROW EXECUTE FUNCTION decrement_applications_count();
