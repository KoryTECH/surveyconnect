ALTER TABLE professional_profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_step text DEFAULT 'profile',
  ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz;

ALTER TABLE client_profiles
  ADD COLUMN IF NOT EXISTS onboarding_dismissed_at timestamptz;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS notification_email boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notification_messages boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notification_marketing boolean DEFAULT false;

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS message text,
  ADD COLUMN IF NOT EXISTS type text DEFAULT 'system',
  ADD COLUMN IF NOT EXISTS link text,
  ADD COLUMN IF NOT EXISTS is_read boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS read_at timestamptz,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread_created
  ON notifications(user_id, is_read, created_at DESC);
