import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../../auth/auth.module';
import { User } from '../../auth/entities/user.entity';
import { LegacyStaffDbModule } from '../../legacy-staff/legacy-staff-db.module';
import { PayrollModule } from '../payroll/payroll.module';
import { MariadbStaffLeaveStore } from './mariadb-staff-leave.store';
import { StaffLeaveController } from './staff-leave.controller';
import { StaffLeaveService } from './staff-leave.service';
import { STAFF_LEAVE_STORE } from './staff-leave.store';

/**
 * 第七階段翻轉資料來源前，請假資料存取綁定 MariaDB（`MariadbStaffLeaveStore`），
 * 與打卡流程、薪資 loader 同一個 system of record。翻轉時只需把 `STAFF_LEAVE_STORE`
 * 換成 TypeORM 實作。登入者查詢仍用 PostgreSQL 的 `User`。
 */
@Module({
  imports: [TypeOrmModule.forFeature([User]), AuthModule, PayrollModule, LegacyStaffDbModule],
  providers: [StaffLeaveService, { provide: STAFF_LEAVE_STORE, useClass: MariadbStaffLeaveStore }],
  controllers: [StaffLeaveController],
  exports: [StaffLeaveService],
})
export class StaffLeaveModule {}
