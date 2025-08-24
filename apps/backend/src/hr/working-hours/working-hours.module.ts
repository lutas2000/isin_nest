import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SchedulePicker } from './schedule-picker';
import { WorkingHours } from './working-hours';
import { ManHourManager } from './man-hour-manager';
import { WorkingHoursService } from './working-hours.service';
import { WorkingHoursController } from './working-hours.controller';
import { StaffSegment } from '../staff-segment/entities/staff-segment.entity';
import { AttendRecord } from '../attend-record/entities/attend-record.entity';
import { Staff } from '../staff/entities/staff.entity';
import { StaffManhour } from '../staff-manhour/entities/staff-manhour.entity';
import { StaffSegmentModule } from '../staff-segment/staff-segment.module';
import { AttendRecordModule } from '../attend-record/attend-record.module';
import { StaffModule } from '../staff/staff.module';
import { StaffManhourModule } from '../staff-manhour/staff-manhour.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([StaffSegment, AttendRecord, Staff, StaffManhour]),
    StaffSegmentModule,
    AttendRecordModule,
    StaffModule,
    StaffManhourModule,
  ],
  controllers: [WorkingHoursController],
  providers: [
    SchedulePicker,
    WorkingHours,
    ManHourManager,
    WorkingHoursService,
  ],
  exports: [SchedulePicker, WorkingHours, ManHourManager, WorkingHoursService],
})
export class WorkingHoursModule {}
