import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StaffVacationService } from './staff-vacation.service';
import { StaffVacationController } from './staff-vacation.controller';
import { StaffVacation } from './entities/staff-vacation.entity';

@Module({
  imports: [TypeOrmModule.forFeature([StaffVacation])],
  controllers: [StaffVacationController],
  providers: [StaffVacationService],
  exports: [StaffVacationService],
})
export class StaffVacationModule {}

