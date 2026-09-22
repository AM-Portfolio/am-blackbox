CREATE TABLE IF NOT EXISTS incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  environment VARCHAR(50) NOT NULL,
  severity VARCHAR(50) NOT NULL,
  type VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL,
  affected_service VARCHAR(255),
  pod VARCHAR(255),
  node VARCHAR(255),
  suspected_cause TEXT,
  confirmed_cause TEXT,
  diagnosis_confidence VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_incidents_environment ON incidents(environment);
CREATE INDEX idx_incidents_status ON incidents(status);
CREATE INDEX idx_incidents_created_at ON incidents(created_at);
