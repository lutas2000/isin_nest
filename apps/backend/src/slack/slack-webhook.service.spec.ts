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
});
