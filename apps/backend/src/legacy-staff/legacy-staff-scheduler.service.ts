import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { LegacyStaffService } from './legacy-staff.service';
import { SlackWebhookService } from '../slack/slack-webhook.service';

@Injectable()
export class LegacyStaffSchedulerService {
  private readonly logger = new Logger(LegacyStaffSchedulerService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly service: LegacyStaffService,
    private readonly slack: SlackWebhookService,
  ) {}

  private async notify(text: string): Promise<void> {
    try {
      await this.slack.send(text);
    } catch (error) {
      // Notification delivery must not change the outcome of a committed job.
      this.logger.error(`Staff Slack notification failed: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
  }

  @Cron('0 */30 * * * *', {
    name: 'legacy-staff-mariadb',
    timeZone: 'Asia/Taipei',
  })
  async run(): Promise<void> {
    if (this.config.get<string>('LEGACY_STAFF_CRON_ENABLED') !== 'true') return;
    if (this.config.get<string>('HR_ATTENDANCE_CRON_ENABLED') !== 'false') {
      this.logger.error(
        'Set HR_ATTENDANCE_CRON_ENABLED=false before enabling legacy staff cron',
      );
      return;
    }
    const started = Date.now();
    const time = new Date(started).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', hour12: false });
    try {
      const result = await this.service.scheduled();
      await this.notify([
        '✅ Staff MariaDB 排程完成',
        `時間：${time}（台北）｜耗時：${Math.round((Date.now() - started) / 1000)} 秒`,
        `M70：讀取 ${result.read}、新增 ${result.inserted}、重複 ${result.duplicate}、未對照 ${result.skipped}、離職過濾 ${result.departed}`,
        `工時：重算 ${result.recalculatedDays} 日、${result.recalculatedStaffDays} 人日${result.fromDay ? `（${result.fromDay} 至 ${result.toDay}）` : ''}`,
      ].join('\n'));
    } catch (error) {
      this.logger.error('Legacy staff scheduled flow failed', error);
      const description = error instanceof Error ? `${error.name}: ${error.message}` : 'Unknown error';
      await this.notify([
        '❌ Staff MariaDB 排程失敗',
        `時間：${time}（台北）｜耗時：${Math.round((Date.now() - started) / 1000)} 秒`,
        `錯誤：${description.slice(0, 300)}`,
      ].join('\n'));
    }
  }
}
