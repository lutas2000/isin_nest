import { Module } from '@nestjs/common';
import { TimeClockModule } from '../time-clock/time-clock.module';
import { AuthModule } from '../auth/auth.module';
import { LegacyStaffController } from './legacy-staff.controller';
import { LegacyStaffDbModule } from './legacy-staff-db.module';
import { LegacyStaffSchedulerService } from './legacy-staff-scheduler.service';
import { LegacyStaffService } from './legacy-staff.service';
import { LegacyStaffM70Controller } from './legacy-staff-m70.controller';
import { LegacyStaffM70Service } from './legacy-staff-m70.service';
import { SlackWebhookModule } from '../slack/slack-webhook.module';

@Module({
  imports: [
    AuthModule,
    LegacyStaffDbModule,
    TimeClockModule.register(),
    SlackWebhookModule,
  ],
  controllers: [LegacyStaffController, LegacyStaffM70Controller],
  providers: [
    LegacyStaffService,
    LegacyStaffM70Service,
    LegacyStaffSchedulerService,
  ],
})
export class LegacyStaffModule {}
