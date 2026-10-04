import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { LegacyStaffDbModule } from '../../legacy-staff/legacy-staff-db.module';
import { PayrollModule } from '../payroll/payroll.module';
import { MariadbStaffManhour2Store } from './mariadb-staff-manhour2.store';
import { StaffManhour2Controller } from './staff-manhour2.controller';
import { StaffManhour2Service } from './staff-manhour2.service';
import { STAFF_MANHOUR2_STORE } from './staff-manhour2.store';

/**
 * 第七階段翻轉資料來源前，外帳工時綁定 MariaDB（`MariadbStaffManhour2Store`），
 * 與薪資 loader 讀的 `staff_manhour2` 是同一張表。翻轉時只需把 `STAFF_MANHOUR2_STORE`
 * 換成 TypeORM 實作。
 */
@Module({
  imports: [AuthModule, PayrollModule, LegacyStaffDbModule],
  providers: [StaffManhour2Service, { provide: STAFF_MANHOUR2_STORE, useClass: MariadbStaffManhour2Store }],
  controllers: [StaffManhour2Controller],
  exports: [StaffManhour2Service],
})
export class StaffManhour2Module {}
