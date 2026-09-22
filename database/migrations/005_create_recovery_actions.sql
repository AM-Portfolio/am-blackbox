CREATE TABLE IF NOT EXISTS recovery_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID REFERENCES incidents(id) ON DELETE SET NULL,
  action_type VARCHAR(100) NOT NULL,
  target VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL,
  policy_checked BOOLEAN DEFAULT FALSE,
  requested_by VARCHAR(255),
  approved_by VARCHAR(255),
  result_summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  executed_at TIMESTAMP WITH TIME ZONE,
  verified_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_recovery_actions_incident_id ON recovery_actions(incident_id);
CREATE INDEX idx_recovery_actions_status ON recovery_actions(status);
