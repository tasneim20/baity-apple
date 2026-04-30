-- ════════════════════════════════════════════
-- Admin System Database Schema
-- ════════════════════════════════════════════

-- 1. Add rejection_reason column to properties table
ALTER TABLE properties ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- 2. Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('property_pending', 'property_approved', 'property_rejected', 'property_hidden', 'report_action')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);

-- 3. Create reports table
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  reporter_id TEXT NOT NULL,
  reporter_name TEXT NOT NULL,
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'action_taken', 'dismissed')),
  admin_action TEXT,
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_reports_property_id ON reports(property_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC);

-- 4. Create admin_logs table
CREATE TABLE IF NOT EXISTS admin_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id TEXT NOT NULL,
  admin_email TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('approve', 'reject', 'delete', 'hide', 'edit', 'report_action', 'message_edit', 'message_delete')),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('property', 'message', 'report', 'user')),
  entity_id UUID NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_logs_admin_id ON admin_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_action ON admin_logs(action);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at ON admin_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_logs_entity ON admin_logs(entity_type, entity_id);

-- 5. Enable RLS (Row Level Security)
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for notifications (users can only see their own)
CREATE POLICY IF NOT EXISTS "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY IF NOT EXISTS "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid()::text = user_id);

-- 7. RLS Policies for reports (anyone can create, only admins can view all)
CREATE POLICY IF NOT EXISTS "Anyone can create reports"
  ON reports FOR INSERT
  WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Users can view their own reports"
  ON reports FOR SELECT
  USING (auth.uid()::text = reporter_id);

-- 8. RLS Policies for admin_logs (only admins can view)
CREATE POLICY IF NOT EXISTS "Only service role can access admin logs"
  ON admin_logs FOR ALL
  USING (true);
