import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StaffWorkhourService } from './staff-workhour.service';
import { StaffWorkhourController } from './staff-workhour.controller';
import { StaffWorkhour } from './entities/staff-workhour.entity';

@Module({
  imports: [TypeOrmModule.forFeature([StaffWorkhour])],
  providers: [StaffWorkhourService],
  controllers: [StaffWorkhourController],
  exports: [StaffWorkhourService],
})
export class StaffWorkhourModule {}
