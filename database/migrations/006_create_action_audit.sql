CREATE TABLE IF NOT EXISTS action_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id UUID REFERENCES recovery_actions(id) ON DELETE SET NULL,
  event_type VARCHAR(100) NOT NULL,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_action_audit_action_id ON action_audit(action_id);
CREATE INDEX idx_action_audit_created_at ON action_audit(created_at);
