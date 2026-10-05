import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttendRecordService } from './attend-record.service';
import { AttendRecordController } from './attend-record.controller';
import { AttendRecord } from './entities/attend-record.entity';
import { Staff } from '../staff/entities/staff.entity';
import { StaffModule } from '../staff/staff.module';
import {
  AttendRecordCsvReader,
  AttendRecordUsbReader,
} from './attend-record-csv-reader';
import { AttendRecordMapper } from './attend-record-mapper';
import { AuthModule } from '../../auth/auth.module';
import { LegacyStaffDbModule } from '../../legacy-staff/legacy-staff-db.module';
import { ATTEND_RECORD_READ_STORE } from './attend-record.store';
import { MariadbAttendRecordStore } from './mariadb-attend-record.store';

/**
 * 第七階段翻轉資料來源前，出勤記錄的查詢綁定 MariaDB（`MariadbAttendRecordStore`），
 * 翻轉時只需把 `ATTEND_RECORD_READ_STORE` 換成 PostgreSQL 實作。
 */
@Module({
  imports: [
    AuthModule,
    LegacyStaffDbModule,
    TypeOrmModule.forFeature([AttendRecord, Staff]),
    StaffModule, // 匯入 StaffModule 以便可以使用 Staff 相關功能
  ],
  controllers: [AttendRecordController],
  providers: [
    AttendRecordService,
    { provide: ATTEND_RECORD_READ_STORE, useClass: MariadbAttendRecordStore },
    AttendRecordMapper,
    AttendRecordCsvReader,
    AttendRecordUsbReader,
  ],
  exports: [AttendRecordService, AttendRecordCsvReader, AttendRecordUsbReader], // 導出服務以供其他模組使用
})
export class AttendRecordModule {}
