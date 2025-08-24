import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { HttpModule } from '@nestjs/axios';
import { SchedulerService } from './scheduler.service';
import { SchedulerController } from './scheduler.controller';
import { WorkingHoursModule } from '../hr/working-hours/working-hours.module';
import { AttendRecordModule } from '../hr/attend-record/attend-record.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    HttpModule,
    WorkingHoursModule,
    AttendRecordModule,
  ],
  controllers: [SchedulerController],
  providers: [SchedulerService],
  exports: [SchedulerService],
})
export class SchedulerModule {}
