import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StaffLeave } from '../staff-leave/entities/staff-leave.entity';
import { StaffManhour } from '../staff-manhour/entities/staff-manhour.entity';
import { StaffSegment } from '../staff-segment/entities/staff-segment.entity';
import { Staff } from '../staff/entities/staff.entity';
import { StaffWorkhour } from './entities/staff-workhour.entity';
import { StaffWorkhourController } from './staff-workhour.controller';
import { StaffWorkhourService } from './staff-workhour.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      StaffWorkhour,
      Staff,
      StaffManhour,
      StaffLeave,
      StaffSegment,
    ]),
  ],
  controllers: [StaffWorkhourController],
  providers: [StaffWorkhourService],
  exports: [StaffWorkhourService],
})
export class StaffWorkhourModule {}
