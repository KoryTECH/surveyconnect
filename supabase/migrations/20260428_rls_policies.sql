-- Profiles: users can only read/update their own profile
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = id);
-- Allow reading other profiles for marketplace browsing (limited columns enforced at query level)
CREATE POLICY "profiles_select_public" ON profiles FOR SELECT USING (true);

-- Jobs: clients can CRUD their own, professionals can read open jobs
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "jobs_select_open" ON jobs FOR SELECT USING (status = 'open' OR client_id = auth.uid());
CREATE POLICY "jobs_insert_client" ON jobs FOR INSERT WITH CHECK (client_id = auth.uid());
CREATE POLICY "jobs_update_own" ON jobs FOR UPDATE USING (client_id = auth.uid());

-- Job applications: professionals manage own, clients read for their jobs
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "applications_select" ON job_applications FOR SELECT
  USING (professional_id = auth.uid() OR
         EXISTS (SELECT 1 FROM jobs WHERE jobs.id = job_applications.job_id AND jobs.client_id = auth.uid()));
CREATE POLICY "applications_insert_professional" ON job_applications FOR INSERT
  WITH CHECK (professional_id = auth.uid());
CREATE POLICY "applications_update_own" ON job_applications FOR UPDATE
  USING (professional_id = auth.uid() OR
         EXISTS (SELECT 1 FROM jobs WHERE jobs.id = job_applications.job_id AND jobs.client_id = auth.uid()));

-- Contracts: only parties involved
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contracts_select_parties" ON contracts FOR SELECT
  USING (client_id = auth.uid() OR professional_id = auth.uid());
CREATE POLICY "contracts_insert_client" ON contracts FOR INSERT WITH CHECK (client_id = auth.uid());
CREATE POLICY "contracts_update_parties" ON contracts FOR UPDATE
  USING (client_id = auth.uid() OR professional_id = auth.uid());

-- Messages: only contract parties
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "messages_select_parties" ON messages FOR SELECT
  USING (EXISTS (SELECT 1 FROM contracts WHERE contracts.id = messages.contract_id
    AND (contracts.client_id = auth.uid() OR contracts.professional_id = auth.uid())));
CREATE POLICY "messages_insert_parties" ON messages FOR INSERT
  WITH CHECK (sender_id = auth.uid() AND
    EXISTS (SELECT 1 FROM contracts WHERE contracts.id = messages.contract_id
      AND (contracts.client_id = auth.uid() OR contracts.professional_id = auth.uid())));

-- Notifications: own only
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications_own" ON notifications FOR ALL USING (user_id = auth.uid());

-- Reviews: parties of completed contract
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reviews_select_all" ON reviews FOR SELECT USING (true);
CREATE POLICY "reviews_insert_client" ON reviews FOR INSERT
  WITH CHECK (reviewer_id = auth.uid() AND
    EXISTS (SELECT 1 FROM contracts WHERE contracts.id = reviews.contract_id
      AND contracts.client_id = auth.uid() AND contracts.payment_released_at IS NOT NULL));

-- Professional profiles: own for write, all for read
ALTER TABLE professional_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prof_profiles_select_all" ON professional_profiles FOR SELECT USING (true);
CREATE POLICY "prof_profiles_write_own" ON professional_profiles FOR ALL USING (id = auth.uid());

-- Verification documents storage policy (add via Supabase dashboard or CLI):
-- bucket: verification-documents
-- Policy: authenticated users can insert to their own folder (id prefix)
-- Policy: only service_role can read (no public access)
