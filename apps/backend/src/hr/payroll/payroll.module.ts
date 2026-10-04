import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../../auth/auth.module';
import { LegacyStaffDbModule } from '../../legacy-staff/legacy-staff-db.module';
import { PayrollRun } from './entities/payroll-run.entity';
import { PayrollRunDay } from './entities/payroll-run-day.entity';
import { PayrollRunStaff } from './entities/payroll-run-staff.entity';
import { PayrollController } from './payroll.controller';
import { PayrollFileService } from './payroll-file.service';
import { PayrollService } from './payroll.service';
import { MariadbPayrollSourceLoader } from './source/mariadb-payroll-source.loader';
import { PAYROLL_SOURCE_LOADER } from './source/payroll-source.loader';

/**
 * 薪資計算與 snapshot。計算輸入目前來自舊 MariaDB（`PAYROLL_SOURCE_LOADER`），
 * 第 7 階段改接 PostgreSQL loader 時只換這個 provider。
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([PayrollRun, PayrollRunStaff, PayrollRunDay]),
    AuthModule,
    LegacyStaffDbModule,
  ],
  controllers: [PayrollController],
  providers: [
    PayrollService,
    PayrollFileService,
    { provide: PAYROLL_SOURCE_LOADER, useClass: MariadbPayrollSourceLoader },
  ],
  exports: [PayrollService],
})
export class PayrollModule {}
