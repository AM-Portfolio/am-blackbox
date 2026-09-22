import { sendCliqMessage } from '../integrations/zoho/zoho.client.js';

export async function notifyIncidentCreated(incident) {
  const card = {
    title: `New Incident: ${incident.title}`,
    theme: 'modern-inline',
    thumbnail: 'https://cdn.iconscout.com/icon/free/png-256/alert-18-1100588.png'
  };

  const message = `🚨 **Severity: ${incident.severity.toUpperCase()}**\nService: ${incident.affected_service || 'Unknown'}\nEnvironment: ${incident.environment}\n[View Incident Details](#)`;
  
  await sendCliqMessage(message, card);
}

export async function notifyActionRequiresApproval(incident, action) {
  const card = {
    title: `Action Requires Approval`,
    theme: 'modern-inline'
  };

  const message = `⚠️ An action is proposed to resolve incident **${incident.id}**.\nProposed Action: \`${action.action_type}\`\n[Approve Action](#) | [Deny Action](#)`;
  
  await sendCliqMessage(message, card);
}
