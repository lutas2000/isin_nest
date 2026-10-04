import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../../auth/auth.module';
import { User } from '../../auth/entities/user.entity';
import { PayrollModule } from '../payroll/payroll.module';
import { Staff } from '../staff/entities/staff.entity';
import { StaffSegment } from '../staff-segment/entities/staff-segment.entity';
import { StaffLeave } from './entities/staff-leave.entity';
import { StaffLeaveController } from './staff-leave.controller';
import { StaffLeaveService } from './staff-leave.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([StaffLeave, Staff, StaffSegment, User]),
    AuthModule,
    PayrollModule,
  ],
  providers: [StaffLeaveService],
  controllers: [StaffLeaveController],
  exports: [StaffLeaveService],
})
export class StaffLeaveModule {}
