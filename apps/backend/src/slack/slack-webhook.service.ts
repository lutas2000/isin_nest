import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** Generic Incoming Webhook sender; callers own their message content. */
@Injectable()
export class SlackWebhookService {
  constructor(private readonly config: ConfigService) {}

  async send(text: string): Promise<void> {
    const value = this.config.get<string>('SLACK_WEBHOOK_URL');
    if (!value) throw new Error('SLACK_WEBHOOK_URL is not configured');

    let url: URL;
    try {
      url = new URL(value);
    } catch {
      throw new Error('SLACK_WEBHOOK_URL is invalid');
    }
    if (url.protocol !== 'https:')
      throw new Error('SLACK_WEBHOOK_URL must use HTTPS');

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
