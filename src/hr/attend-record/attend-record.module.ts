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

@Module({
  imports: [
    TypeOrmModule.forFeature([AttendRecord, Staff]),
    StaffModule, // 匯入 StaffModule 以便可以使用 Staff 相關功能
  ],
  controllers: [AttendRecordController],
  providers: [
    AttendRecordService,
    AttendRecordMapper,
    AttendRecordCsvReader,
    AttendRecordUsbReader,
  ],
  exports: [AttendRecordService, AttendRecordCsvReader, AttendRecordUsbReader], // 導出服務以供其他模組使用
})
export class AttendRecordModule {}
