import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../../auth/auth.module';
import { PayrollModule } from '../payroll/payroll.module';
import { StaffManhour2Service } from './staff-manhour2.service';
import { StaffManhour2Controller } from './staff-manhour2.controller';
import { StaffManhour2 } from './entities/staff-manhour2.entity';
import { StaffManhour } from './entities/staff-manhour.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([StaffManhour2, StaffManhour]),
    AuthModule,
    PayrollModule,
  ],
  providers: [StaffManhour2Service],
  controllers: [StaffManhour2Controller],
  exports: [StaffManhour2Service],
})
export class StaffManhour2Module {}
