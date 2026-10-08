import { SlackWebhookService } from './slack-webhook.service';

describe('SlackWebhookService', () => {
  it('posts JSON to the configured generic webhook', async () => {
    const send = jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true, status: 200 } as Response);
    try {
      const service = new SlackWebhookService({ get: () => 'https://hooks.example.test/services/test' } as never);
      await service.send('job finished');
      expect(send).toHaveBeenCalledWith(
        new URL('https://hooks.example.test/services/test'),
        expect.objectContaining({ method: 'POST', body: JSON.stringify({ text: 'job finished' }) }),
      );
    } finally {
      send.mockRestore();
    }
  });

  it('does not send when the URL is absent', async () => {
    const service = new SlackWebhookService({ get: () => undefined } as never);
    await expect(service.send('job finished')).rejects.toThrow('SLACK_WEBHOOK_URL is not configured');
  });

  it('reads the URL from another setting when one is given', async () => {
    const send = jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true, status: 200 } as Response);
    try {
      const get = jest.fn((key: string) =>
        key === 'FEEDBACK_SLACK_WEBHOOK_URL' ? 'https://hooks.example.test/services/feedback' : undefined,
      );
      const service = new SlackWebhookService({ get } as never);
      expect(service.isConfigured('FEEDBACK_SLACK_WEBHOOK_URL')).toBe(true);
      expect(service.isConfigured()).toBe(false);
      await service.send('new report', 'FEEDBACK_SLACK_WEBHOOK_URL');
      expect(send).toHaveBeenCalledWith(new URL('https://hooks.example.test/services/feedback'), expect.anything());
      await expect(service.send('x')).rejects.toThrow('SLACK_WEBHOOK_URL is not configured');
    } finally {
      send.mockRestore();
    }
  });
});
