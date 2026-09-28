import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AttendRecord } from './entities/attend-record.entity';
import { Staff } from '../staff/entities/staff.entity';

const USB_UID_NAME_MAP: Record<number, string> = {
  36: '高光達',
  38: '阮文折',
  39: '鄭春景',
};

@Injectable()
export class AttendRecordMapper {
  private readonly logger = new Logger(AttendRecordMapper.name);

  constructor(
    @InjectRepository(Staff)
    private readonly staffRepository: Repository<Staff>,
  ) {}

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
      if (attendRecord.staffName) {
        const staff = await this.staffRepository.findOne({
          where: { name: attendRecord.staffName },
        });
        attendRecord.staffId = staff?.id || '';
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
    return this.parseUtcTime(value.replace(' ', 'T') + 'Z');
  }

  private convertUsbTime(timeStr: string): Date {
    const value = this.sanitizeString(timeStr);
    return this.parseUtcTime(value.replace(/\//g, '-').replace(' ', 'T') + 'Z');
  }

  private parseUtcTime(value: string): Date {
    const match = value.match(
      /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})Z$/,
    );
    if (!match) throw new Error(`Invalid attendance time: ${value}`);
    const [, year, month, day, hour, minute, second] = match.map(Number);
    const result = new Date(
      Date.UTC(year, month - 1, day, hour, minute, second),
    );
    if (
      result.getUTCFullYear() !== year ||
      result.getUTCMonth() !== month - 1 ||
      result.getUTCDate() !== day ||
      result.getUTCHours() !== hour ||
      result.getUTCMinutes() !== minute ||
      result.getUTCSeconds() !== second
    )
      throw new Error(`Invalid attendance time: ${value}`);
    return result;
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
    const hasIdentifier = !!attendRecord.staffId;
    const hasValidId = !!attendRecord.id;
    const hasValidAttendType = [0, 1, 2, 3].includes(attendRecord.attendType);
    const hasValidTime =
      attendRecord.createTime instanceof Date &&
      !isNaN(attendRecord.createTime.getTime());
    return hasIdentifier && hasValidId && hasValidAttendType && hasValidTime;
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

/** Parse quoted CSV or tab separated device output, including escaped quotes. */
export function parseDelimitedLine(line: string, delimiter = ','): string[] {
  const cells: string[] = [];
  let cell = '';
  let quoted = false;

  for (let index = 0; index < line.length; index++) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        cell += '"';
        index++;
      } else {
        quoted = !quoted;
      }
    } else if (character === delimiter && !quoted) {
      cells.push(cell.trim());
      cell = '';
    } else {
      cell += character;
    }
  }

  cells.push(cell.trim());
  return cells;
}
