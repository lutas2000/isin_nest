import { Injectable, Logger } from '@nestjs/common';
import { AttendRecord } from './entities/attend-record.entity';

const USB_UID_NAME_MAP: Record<number, string> = {
  36: '高光達',
  38: '阮文折',
  39: '鄭春景',
};

@Injectable()
export class AttendRecordMapper {
  private readonly logger = new Logger(AttendRecordMapper.name);

  csvToEntity(row: string[]): AttendRecord {
    const attendRecord = new AttendRecord();

    try {
      attendRecord.staffId = this.sanitizeString(row[1]) || '';
      attendRecord.staffName = this.sanitizeString(row[2]) || undefined;
      attendRecord.inputType = this.sanitizeString(row[8]) || undefined;
      attendRecord.attendType = 0;
      attendRecord.createTime = this.convertCsvTime(row[6]);
      attendRecord.id =
        String(attendRecord.createTime.getTime() / 1000) +
        (attendRecord.staffName || '');

      this.logger.debug(`CSV 轉換結果: ${JSON.stringify(attendRecord)}`);
    } catch (error) {
      this.logger.warn(`CSV 資料轉換失敗: ${JSON.stringify(row)}`, error);
      attendRecord.staffId = '';
      attendRecord.attendType = 0;
      attendRecord.id = '';
      attendRecord.createTime = new Date();
    }

    return attendRecord;
  }

  async usbCsvToEntity(row: string[]): Promise<AttendRecord> {
    const attendRecord = new AttendRecord();

    try {
      attendRecord.staffName = this.sanitizeString(row[3]) || undefined;
      if (!attendRecord.staffName) {
        const uid = parseInt(row[2], 10);
        attendRecord.staffName = this.fixName(uid);
      }
      attendRecord.createTime = this.convertUsbTime(row[8]);
      attendRecord.attendType = 0;
      attendRecord.inputType = 'usb';

      if (attendRecord.staffName) {
        attendRecord.id =
          String(attendRecord.createTime.getTime() / 1000) +
          attendRecord.staffName;
      } else {
        attendRecord.id = '';
      }

      this.logger.debug(`USB CSV 轉換結果: ${JSON.stringify(attendRecord)}`);
    } catch (error) {
      this.logger.warn(`USB CSV 資料轉換失敗: ${JSON.stringify(row)}`, error);
      attendRecord.staffId = '';
      attendRecord.attendType = 0;
      attendRecord.inputType = 'usb';
      attendRecord.id = '';
      attendRecord.createTime = new Date();
    }

    return attendRecord;
  }

  fixName(uid: number): string | undefined {
    return USB_UID_NAME_MAP[uid];
  }

  private convertCsvTime(timeStr: string): Date {
    const dateTimeFormat = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;
    const value = this.sanitizeString(timeStr);
    if (!dateTimeFormat.test(value)) {
      throw new Error(`Invalid CSV time format: ${value}`);
    }
    return new Date(value.replace(' ', 'T') + 'Z');
  }

  private convertUsbTime(timeStr: string): Date {
    const value = this.sanitizeString(timeStr);
    const parsed = new Date(value.replace(/\//g, '-').replace(' ', 'T') + 'Z');
    if (isNaN(parsed.getTime())) {
      throw new Error(`Invalid USB time format: ${value}`);
    }
    return parsed;
  }

  private sanitizeString(value: string | undefined): string {
    if (!value) return '';
    return value
      .toString()
      .trim()
      .replace(/\r?\n|\r/g, '')
      .replace(/\s+/g, ' ');
  }

  validateAttendRecord(attendRecord: AttendRecord): boolean {
    const hasIdentifier = attendRecord.staffId || attendRecord.staffName;
    const hasValidId = !!attendRecord.id;
    const hasValidAttendType = [0, 1, 2, 3].includes(attendRecord.attendType);
    return !!hasIdentifier && hasValidId && hasValidAttendType;
  }

  formatForLogging(attendRecord: AttendRecord): string {
    return JSON.stringify({
      id: attendRecord.id,
      staffId: attendRecord.staffId,
      staffName: attendRecord.staffName,
      inputType: attendRecord.inputType,
      attendType: attendRecord.attendType,
    });
  }
}
