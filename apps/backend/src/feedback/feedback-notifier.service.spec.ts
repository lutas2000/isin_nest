import { SlackWebhookService } from '../slack/slack-webhook.service';
import { FeedbackReport } from './entities/feedback-report.entity';
import { FeedbackNotifierService } from './feedback-notifier.service';
import { FeedbackScreenshotStore, isPng } from './feedback-screenshot.store';

const report = (overrides: Partial<FeedbackReport> = {}) =>
  ({
    id: 7,
    kind: 'feature',
    title: '報表要能匯出',
    body: '客戶甲的應收帳款明細',
    context: { route: '/legacy-crm', window: '銷貨報表列印' },
    screenshot_path: null,
    ...overrides,
  }) as FeedbackReport;

describe('FeedbackNotifierService', () => {
  const slack = (url?: string) => {
    const service = new SlackWebhookService({ get: () => url } as never);
    const send = jest.spyOn(service, 'send').mockResolvedValue(undefined);
    return { service, send };
  };

  it('stays off when FEEDBACK_SLACK_WEBHOOK_URL is not set', async () => {
    const { service, send } = slack(undefined);
    const notifier = new FeedbackNotifierService(service);
    expect(notifier.enabled).toBe(false);
    await notifier.notifyCreated(report(), '王小明');
    expect(send).not.toHaveBeenCalled();
  });

  it('posts number, kind, title, reporter and window, but not the body', async () => {
    const { service, send } = slack(
      'https://hooks.example.test/services/feedback',
    );
    await new FeedbackNotifierService(service).notifyCreated(
      report(),
      '王小明',
    );
    expect(send).toHaveBeenCalledWith(
      '新回報 #7（需求）：報表要能匯出\n回報者：王小明\n畫面：銷貨報表列印 / /legacy-crm',
      'FEEDBACK_SLACK_WEBHOOK_URL',
    );
  });

  it('only logs when Slack fails', async () => {
    const { service, send } = slack(
      'https://hooks.example.test/services/feedback',
    );
    send.mockRejectedValue(
      new Error('Slack webhook request failed or timed out'),
    );
    const notifier = new FeedbackNotifierService(service);
    const logged = jest
      .spyOn(notifier['logger'], 'error')
      .mockImplementation(() => undefined);
    await expect(
      notifier.notifyCreated(report(), 'a'),
    ).resolves.toBeUndefined();
    expect(logged).toHaveBeenCalled();
  });
});

describe('FeedbackScreenshotStore', () => {
  const store = new FeedbackScreenshotStore({
    get: () => '/srv/feedback',
  } as never);

  it('only resolves uuid.png names inside the upload directory', () => {
    expect(store.resolve('0f8fad5b-d9cb-469f-a165-70867728950e.png')).toBe(
      '/srv/feedback/0f8fad5b-d9cb-469f-a165-70867728950e.png',
    );
    expect(store.resolve('../etc/passwd')).toBeNull();
    expect(
      store.resolve('0f8fad5b-d9cb-469f-a165-70867728950e.png/../../x'),
    ).toBeNull();
    expect(store.resolve('a.png')).toBeNull();
  });

  it('recognises PNG by its signature', () => {
    expect(
      isPng(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0])),
    ).toBe(true);
    expect(
      isPng(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
    ).toBe(false);
    expect(isPng(Buffer.from('GIF89a....'))).toBe(false);
  });
});
