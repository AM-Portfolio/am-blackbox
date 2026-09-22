import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';
import { AppError } from '../../utils/errors.js';
import { withRetry } from '../../utils/retry.js';

export async function sendCliqMessage(message, card = null) {
  if (!config.zoho.cliqWebhookUrl) {
    logger.warn('Zoho Cliq webhook URL not configured, skipping notification');
    return;
  }

  const payload = { text: message };
  if (card) {
    payload.card = card;
  }

  await withRetry(async () => {
    const response = await fetch(config.zoho.cliqWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new AppError(`Failed to send Zoho Cliq message: ${response.statusText}`, response.status);
    }
  }, 3, 1000);
}
