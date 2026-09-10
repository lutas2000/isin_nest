import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AttendRecord } from './entities/attend-record.entity';
import { Repository } from 'typeorm';
import { Staff } from '../staff/entities/staff.entity';
import {
  TYPE_NEW,
  TYPE_OFF_WORK,
  TYPE_ON_WORK,
  TYPE_UNKNOWN,
} from '../working-hours/working-hours';

/**
 * 出勤記錄資料轉換器
 * 負責將各種格式的資料轉換為 AttendRecord 實體
 */
@Injectable()
export class AttendRecordMapper {
  private readonly logger = new Logger(AttendRecordMapper.name);

  constructor(
    @InjectRepository(Staff)
    private readonly staffRepository: Repository<Staff>,
  ) {}

  /**
   * 將 CSV 行資料轉換為 AttendRecord 實體
   * 此方法對應原始 Python 中的 AttendMapperMapper.csv_to_entity
   *
   * @param row CSV 行資料陣列
   * @returns AttendRecord 實體
   */
  csvToEntity(row: string[]): AttendRecord {
    const attendRecord = new AttendRecord();

    try {
      // Django 的 Log 檔欄位：staff_id=row[1]、name=row[2]、
      // time=row[6]、input_type=row[8]。
      attendRecord.staffId = this.sanitizeString(row[1]) || '';
      const staffName = this.sanitizeString(row[2]);
      attendRecord.staffName = staffName || undefined;
      attendRecord.inputType = this.sanitizeString(row[8]) || 'card';
      attendRecord.attendType = TYPE_NEW;

      const createTime = this.parseDateTime(
        this.sanitizeString(row[6]),
        'normal',
      );
      if (createTime) {
        attendRecord.createTime = createTime;
      }

      this.logger.debug(`CSV 轉換結果: ${JSON.stringify(attendRecord)}`);
    } catch (error) {
      this.logger.warn(`CSV 資料轉換失敗: ${JSON.stringify(row)}`, error);
      // 回傳基本的實體，避免程式中斷
      attendRecord.staffId = '';
      attendRecord.attendType = TYPE_NEW;
    }

    return attendRecord;
  }

  /**
   * 將 USB CSV 行資料轉換為 AttendRecord 實體
   * 此方法對應原始 Python 中的 AttendMapperMapper.usb_csv_to_entity
   *
   * @param row USB CSV 行資料陣列 (使用 tab 分隔符)
   * @returns AttendRecord 實體
   */
  async usbCsvToEntity(row: string[]): Promise<AttendRecord> {
    const attendRecord = new AttendRecord();

    try {
      // Django 的 USB 匯出欄位：UID=row[2]、姓名=row[3]、
      // 打卡時間=row[8]。UID 沒有直接等於 staff.id，必須先解析姓名。
      const uid = this.sanitizeString(row[2]);
      const explicitName = this.sanitizeString(row[3]);
      const staffName = explicitName || this.fixName(Number(uid));
      attendRecord.staffName = staffName || undefined;
      attendRecord.staffId = staffName
        ? (await this.findStaffIdByName(staffName)) || ''
        : '';
      attendRecord.inputType = 'usb';
      attendRecord.attendType = TYPE_NEW;

      const createTime = this.parseDateTime(
        this.sanitizeString(row[8]),
        'usb',
      );
      if (createTime) {
        attendRecord.createTime = createTime;
      }

      this.logger.debug(`USB CSV 轉換結果: ${JSON.stringify(attendRecord)}`);
    } catch (error) {
      this.logger.warn(`USB CSV 資料轉換失敗: ${JSON.stringify(row)}`, error);
      // 回傳基本的實體，避免程式中斷
      attendRecord.staffId = '';
      attendRecord.attendType = TYPE_NEW;
      attendRecord.inputType = 'usb';
    }

    return attendRecord;
  }

  /**
   * 清理字串資料，移除多餘的空白和特殊字符
   */
  private sanitizeString(value: string | undefined): string {
    if (!value) return '';

    return value
      .toString()
      .trim()
      .replace(/\r?\n|\r/g, '') // 移除換行符
      .replace(/\s+/g, ' '); // 多個空白合併為一個
  }

  /**
   * 解析出勤類型
   * @param value 字串值
   * @returns 出勤類型數字 (0: 新紀錄, 1: 上班, 2: 下班, 3: 不明)
   */
  private parseAttendType(value: string | undefined): number {
    if (!value) return TYPE_NEW;

    const cleanValue = this.sanitizeString(value).toLowerCase();

    // 根據字串內容判斷出勤類型
    if (
      cleanValue.includes('上班') ||
      cleanValue.includes('in') ||
      cleanValue === '1'
    ) {
      return TYPE_ON_WORK; // 上班
    } else if (
      cleanValue.includes('下班') ||
      cleanValue.includes('out') ||
      cleanValue === '2'
    ) {
      return TYPE_OFF_WORK; // 下班
    } else if (cleanValue === '0' || cleanValue.includes('未決定')) {
      return TYPE_NEW; // 未決定
    } else if (cleanValue === '3' || cleanValue.includes('不明')) {
      return TYPE_UNKNOWN; // 不明
    }

    // 嘗試直接解析數字
    const numValue = parseInt(cleanValue, 10);
    if (!isNaN(numValue) && [TYPE_NEW, TYPE_ON_WORK, TYPE_OFF_WORK, TYPE_UNKNOWN].includes(numValue)) {
      return numValue;
    }

    // 預設為未決定
    return TYPE_NEW;
  }

  /**
   * 根據員工姓名查找員工編號
   */
  private async findStaffIdByName(staffName: string): Promise<string | null> {
    try {
      const staff = await this.staffRepository.findOne({
        where: { name: staffName },
      });
      return staff?.id || null;
    } catch (error) {
      this.logger.warn(`根據姓名查找員工編號失敗: ${staffName}`, error);
      return null;
    }
  }

  /**
   * USB 機器只提供 UID 時的相容名稱對照。
   * 長期仍應以員工資料表的實際姓名為準。
   */
  fixName(uid: number): string | null {
    const names: Record<number, string> = {
      36: '高光達',
      38: '阮文折',
      39: '鄭春景',
    };
    return names[uid] || null;
  }

  private parseDateTime(
    value: string,
    source: 'normal' | 'usb',
  ): Date | undefined {
    const pattern =
      source === 'normal'
        ? /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/
        : /^(\d{4})\/(\d{2})\/(\d{2}) (\d{2}):(\d{2}):(\d{2})$/;
    const match = value.match(pattern);
    if (!match) return undefined;

    const [, year, month, day, hour, minute, second] = match;
    const date = new Date(
      Date.UTC(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hour),
        Number(minute),
        Number(second),
      ),
    );

    if (Number.isNaN(date.getTime())) return undefined;

    // Date.UTC 會自動正規化不存在的日期（例如 6/31），需比對元件以
    // 保留 Python datetime.strptime 的嚴格解析行為。
    const matchesInput =
      date.getUTCFullYear() === Number(year) &&
      date.getUTCMonth() === Number(month) - 1 &&
      date.getUTCDate() === Number(day) &&
      date.getUTCHours() === Number(hour) &&
      date.getUTCMinutes() === Number(minute) &&
      date.getUTCSeconds() === Number(second);

    return matchesInput ? date : undefined;
  }

  /**
   * 驗證 AttendRecord 實體的必要欄位
   */
  validateAttendRecord(attendRecord: AttendRecord): boolean {
    // attend_record.staff_id 是非空且有 FK 的欄位；只有姓名的 USB
    // 記錄不能寫入資料庫，避免留下 UNKNOWN 員工。
    const hasStaffId = Boolean(attendRecord.staffId?.trim());

    // 出勤類型必須是有效值
    const hasValidAttendType = [
      TYPE_NEW,
      TYPE_ON_WORK,
      TYPE_OFF_WORK,
      TYPE_UNKNOWN,
    ].includes(attendRecord.attendType);
    const hasValidCreateTime =
      attendRecord.createTime instanceof Date &&
      !Number.isNaN(attendRecord.createTime.getTime());

    return hasStaffId && hasValidAttendType && hasValidCreateTime;
  }

  /**
   * 格式化 AttendRecord 用於記錄
   */
  formatForLogging(attendRecord: AttendRecord): string {
    return JSON.stringify({
      staffId: attendRecord.staffId,
      staffName: attendRecord.staffName,
      inputType: attendRecord.inputType,
      attendType: attendRecord.attendType,
      createTime: attendRecord.createTime,
    });
  }
}

/**
 * 解析一行帶引號的分隔資料。設備輸出的姓名或備註可能含有分隔符，
 * 不能直接使用 String.split()。
 */
export function parseDelimitedLine(line: string, delimiter = ','): string[] {
  const cells: string[] = [];
  let cell = '';
  let quoted = false;

  for (let index = 0; index < line.length; index++) {
    const character = line[index];
    const nextCharacter = line[index + 1];

    if (character === '"') {
      if (quoted && nextCharacter === '"') {
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
