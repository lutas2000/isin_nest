import { Logger } from '@nestjs/common';
import { LegacyStaffSchedulerService } from './legacy-staff-scheduler.service';

describe('Legacy Staff scheduled Slack notification', () => {
  let errorLog: jest.SpyInstance;
  beforeEach(() => { errorLog = jest.spyOn(Logger.prototype, 'error').mockImplementation(); });
  afterEach(() => errorLog.mockRestore());
  const config = { get: (key: string) => ({ LEGACY_STAFF_CRON_ENABLED: 'true' })[key] };

  it('sends committed import and work-hour counts after success', async () => {
    const scheduled = jest.fn().mockResolvedValue({
      read: 559, inserted: 23, duplicate: 535, skipped: 1, departed: 0,
      recalculatedDays: 2, recalculatedStaffDays: 34,
      fromDay: '2026-09-24', toDay: '2026-09-25',
    });
    const send = jest.fn().mockResolvedValue(undefined);
    const scheduler = new LegacyStaffSchedulerService(
      config as never, { scheduled } as never, { send } as never,
    );
    await scheduler.run();
    expect(scheduled).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0]).toContain('新增 23');
    expect(send.mock.calls[0][0]).toContain('重算 2 日、34 人日');
  });

  it('sends failure without rerunning the database flow', async () => {
    const scheduled = jest.fn().mockRejectedValue(new Error('M70 timeout'));
    const send = jest.fn().mockResolvedValue(undefined);
    const scheduler = new LegacyStaffSchedulerService(
      config as never, { scheduled } as never, { send } as never,
    );
    await scheduler.run();
    expect(scheduled).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0]).toContain('M70 timeout');
  });

  it('does not execute or notify while the new cron is disabled', async () => {
    const scheduled = jest.fn();
    const send = jest.fn();
    const scheduler = new LegacyStaffSchedulerService(
      { get: () => 'false' } as never,
      { scheduled } as never,
      { send } as never,
    );
    await scheduler.run();
    expect(scheduled).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it('does not rerun a committed job when Slack delivery fails', async () => {
    const scheduled = jest.fn().mockResolvedValue({
      read: 0, inserted: 0, duplicate: 0, skipped: 0, departed: 0,
      recalculatedDays: 0, recalculatedStaffDays: 0, fromDay: null, toDay: null,
    });
    const send = jest.fn().mockRejectedValue(new Error('Slack unavailable'));
    const scheduler = new LegacyStaffSchedulerService(
      config as never, { scheduled } as never, { send } as never,
    );
    await expect(scheduler.run()).resolves.toBeUndefined();
    expect(scheduled).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledTimes(1);
  });
});
