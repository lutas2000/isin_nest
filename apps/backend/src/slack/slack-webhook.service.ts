import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Generic Incoming Webhook sender; callers own their message content.
 * `setting` picks the environment variable holding the webhook URL, so a
 * caller can post to its own channel (e.g. FEEDBACK_SLACK_WEBHOOK_URL).
 */
@Injectable()
export class SlackWebhookService {
  constructor(private readonly config: ConfigService) {}

  /** Whether the webhook URL setting has a value (it is not validated here). */
  isConfigured(setting = 'SLACK_WEBHOOK_URL'): boolean {
    return Boolean(this.config.get<string>(setting));
  }

  async send(text: string, setting = 'SLACK_WEBHOOK_URL'): Promise<void> {
    const value = this.config.get<string>(setting);
    if (!value) throw new Error(`${setting} is not configured`);

    let url: URL;
    try {
      url = new URL(value);
    } catch {
      throw new Error(`${setting} is invalid`);
    }
    if (url.protocol !== 'https:') throw new Error(`${setting} must use HTTPS`);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
        signal: controller.signal,
      });
      if (!response.ok)
        throw new Error(`Slack webhook returned HTTP ${response.status}`);
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('Slack webhook returned'))
        throw error;
      throw new Error('Slack webhook request failed or timed out');
    } finally {
      clearTimeout(timer);
    }
  }
}
