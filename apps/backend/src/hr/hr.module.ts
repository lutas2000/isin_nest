import { Module } from '@nestjs/common';
import { StaffModule } from './staff/staff.module';
import { StaffLeaveModule } from './staff-leave/staff-leave.module';
import { StaffManhourModule } from './staff-manhour/staff-manhour.module';
import { StaffManhour2Module } from './staff-manhour/staff-manhour2.module';
import { StaffSegmentModule } from './staff-segment/staff-segment.module';
import { AttendRecordModule } from './attend-record/attend-record.module';
import { WorkingHoursModule } from './working-hours/working-hours.module';
import { StaffVacationModule } from './staff-vacation/staff-vacation.module';
import { StaffWorkhourModule } from './staff-workhour/staff-workhour.module';
import { StaffAuthorityModule } from './staff-authority/staff-authority.module';
import { PayrollModule } from './payroll/payroll.module';

@Module({
  imports: [
    StaffModule,
    StaffLeaveModule,
    StaffManhourModule,
    StaffManhour2Module,
    StaffSegmentModule,
    AttendRecordModule,
    WorkingHoursModule,
    StaffVacationModule,
    StaffWorkhourModule,
    StaffAuthorityModule,
    PayrollModule,
  ],
  exports: [
    StaffModule,
    StaffLeaveModule,
    StaffManhourModule,
    StaffManhour2Module,
    StaffSegmentModule,
    AttendRecordModule,
    WorkingHoursModule,
    StaffVacationModule,
    StaffWorkhourModule,
    StaffAuthorityModule,
    PayrollModule,
  ],
})
export class HrModule {}
