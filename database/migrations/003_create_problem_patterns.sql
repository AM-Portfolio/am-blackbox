CREATE TABLE IF NOT EXISTS problem_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  signature JSONB NOT NULL,
  affected_component VARCHAR(255),
  occurrence_count INTEGER DEFAULT 0,
  first_seen_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_problem_patterns_name ON problem_patterns(name);
