CREATE TABLE IF NOT EXISTS incident_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB,
  occurred_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_incident_events_incident_id ON incident_events(incident_id);
CREATE INDEX idx_incident_events_occurred_at ON incident_events(occurred_at);
