import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { LegacyStaffService } from './legacy-staff.service';

@Injectable()
export class LegacyStaffSchedulerService {
  private readonly logger = new Logger(LegacyStaffSchedulerService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly service: LegacyStaffService,
  ) {}

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
    try {
      await this.service.scheduled();
    } catch (error) {
      this.logger.error('Legacy staff scheduled flow failed', error);
    }
  }
}
