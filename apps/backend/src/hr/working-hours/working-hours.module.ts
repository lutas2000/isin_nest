import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SchedulePicker } from './schedule-picker';
import { WorkingHours } from './working-hours';
import { ManHourManager } from './man-hour-manager';
import { WorkingHoursService } from './working-hours.service';
import { WorkingHoursController } from './working-hours.controller';
import { HrAttendancePipelineService } from './hr-attendance-pipeline.service';
import { StaffSegment } from '../staff-segment/entities/staff-segment.entity';
import { AttendRecord } from '../attend-record/entities/attend-record.entity';
import { Staff } from '../staff/entities/staff.entity';
import { StaffManhour } from '../staff-manhour/entities/staff-manhour.entity';
import { AttendRecordModule } from '../attend-record/attend-record.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([StaffSegment, AttendRecord, Staff, StaffManhour]),
    AttendRecordModule,
  ],
  controllers: [WorkingHoursController],
  providers: [
    SchedulePicker,
    WorkingHours,
    ManHourManager,
    WorkingHoursService,
    HrAttendancePipelineService,
  ],
  exports: [
    SchedulePicker,
    WorkingHours,
    ManHourManager,
    WorkingHoursService,
    HrAttendancePipelineService,
  ],
})
export class WorkingHoursModule {}
