CREATE TABLE IF NOT EXISTS evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  source VARCHAR(100) NOT NULL,
  query_reference TEXT NOT NULL,
  time_start TIMESTAMP WITH TIME ZONE NOT NULL,
  time_end TIMESTAMP WITH TIME ZONE NOT NULL,
  summary TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_evidence_incident_id ON evidence(incident_id);
