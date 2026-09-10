import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StaffLeaveService } from './staff-leave.service';
import { StaffLeaveController } from './staff-leave.controller';
import { StaffLeave } from './entities/staff-leave.entity';
import { Staff } from '../staff/entities/staff.entity';
import { WorkingHoursModule } from '../working-hours/working-hours.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([StaffLeave, Staff]),
    WorkingHoursModule,
  ],
  providers: [StaffLeaveService],
  controllers: [StaffLeaveController],
  exports: [StaffLeaveService], // 導出服務供其他模組使用
})
export class StaffLeaveModule {}
