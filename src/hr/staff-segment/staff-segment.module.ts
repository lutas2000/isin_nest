import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StaffSegmentService } from './staff-segment.service';
import { StaffSegmentController } from './staff-segment.controller';
import { StaffSegment } from './entities/staff-segment.entity';
import { Staff } from '../staff/entities/staff.entity';

@Module({
  imports: [TypeOrmModule.forFeature([StaffSegment, Staff])],
  controllers: [StaffSegmentController],
  providers: [StaffSegmentService],
  exports: [StaffSegmentService],
})
export class StaffSegmentModule {}
