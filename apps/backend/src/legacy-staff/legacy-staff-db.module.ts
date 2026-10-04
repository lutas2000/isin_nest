import { Module } from '@nestjs/common';
import { LegacyStaffDbService } from './legacy-staff-db.service';

/**
 * 舊 MariaDB 連線池。獨立成模組讓 legacy-staff 與 hr/payroll 共用同一個連線池。
 */
@Module({
  providers: [LegacyStaffDbService],
  exports: [LegacyStaffDbService],
})
export class LegacyStaffDbModule {}
