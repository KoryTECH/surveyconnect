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

CREATE OR REPLACE FUNCTION update_applications_count()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.job_id IS DISTINCT FROM NEW.job_id THEN
    UPDATE jobs SET applications_count = GREATEST(applications_count - 1, 0)
    WHERE id = OLD.job_id;
    UPDATE jobs SET applications_count = applications_count + 1
    WHERE id = NEW.job_id;
  END IF;
  RETURN NEW;
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

DROP TRIGGER IF EXISTS trg_upd_applications_count ON job_applications;
CREATE TRIGGER trg_upd_applications_count
  AFTER UPDATE OF job_id ON job_applications
  FOR EACH ROW EXECUTE FUNCTION update_applications_count();
