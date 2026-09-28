import { Module } from '@nestjs/common';
import { TimeClockModule } from '../time-clock/time-clock.module';
import { AuthModule } from '../auth/auth.module';
import { LegacyStaffController } from './legacy-staff.controller';
import { LegacyStaffDbService } from './legacy-staff-db.service';
import { LegacyStaffSchedulerService } from './legacy-staff-scheduler.service';
import { LegacyStaffService } from './legacy-staff.service';
import { LegacyStaffM70Controller } from './legacy-staff-m70.controller';
import { LegacyStaffM70Service } from './legacy-staff-m70.service';
import { SlackWebhookModule } from '../slack/slack-webhook.module';

@Module({
  imports: [AuthModule, TimeClockModule.register(), SlackWebhookModule],
  controllers: [LegacyStaffController, LegacyStaffM70Controller],
  providers: [
    LegacyStaffDbService,
    LegacyStaffService,
    LegacyStaffM70Service,
    LegacyStaffSchedulerService,
  ],
})
export class LegacyStaffModule {}
