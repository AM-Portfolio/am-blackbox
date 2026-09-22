import { query } from '../database/client.js';

/**
 * Builds a chronological incident timeline combining state changes, events, and evidence.
 */
export async function getIncidentTimeline(incidentId) {
  const { rows: events } = await query(`
    SELECT event_type, message, metadata, occurred_at as "time"
    FROM incident_events
    WHERE incident_id = $1
    ORDER BY occurred_at ASC
  `, [incidentId]);

  // Can also interleave with recovery_actions and action_audit for a full view
  const { rows: actions } = await query(`
    SELECT action_type as event_type, result_summary as message, status as metadata, created_at as "time"
    FROM recovery_actions
    WHERE incident_id = $1
    ORDER BY created_at ASC
  `, [incidentId]);

  const timeline = [...events, ...actions].sort((a, b) => new Date(a.time) - new Date(b.time));

  return timeline;
}
