import { Injectable, Logger } from '@nestjs/common';
import { AttendRecord } from './entities/attend-record.entity';

/**
 * 出勤記錄資料轉換器
 * 負責將各種格式的資料轉換為 AttendRecord 實體
 */
@Injectable()
export class AttendRecordMapper {
  private readonly logger = new Logger(AttendRecordMapper.name);

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
      // 根據實際的 CSV 格式進行對應
      // TODO: 需要根據實際的 CSV 檔案格式調整這些對應關係

      if (row.length >= 1) {
        // 第一欄通常是員工編號
        attendRecord.staffId = this.sanitizeString(row[0]) || '';
      }

      if (row.length >= 2) {
        // 第二欄通常是員工姓名
        const staffName = this.sanitizeString(row[1]);
        attendRecord.staffName = staffName || undefined;
      }

      if (row.length >= 3) {
        // 第三欄可能是輸入類型或時間戳記
        const inputType = this.sanitizeString(row[2]);
        attendRecord.inputType = inputType || 'card'; // 預設為刷卡
      }

      if (row.length >= 4) {
        // 第四欄可能是出勤類型
        const attendTypeStr = this.sanitizeString(row[3]);
        attendRecord.attendType = this.parseAttendType(attendTypeStr);
      }

      // 如果沒有明確的出勤類型，設定為未決定
      if (attendRecord.attendType === undefined) {
        attendRecord.attendType = 0; // 0: 未決定
      }

      this.logger.debug(`CSV 轉換結果: ${JSON.stringify(attendRecord)}`);
    } catch (error) {
      this.logger.warn(`CSV 資料轉換失敗: ${JSON.stringify(row)}`, error);
      // 回傳基本的實體，避免程式中斷
      attendRecord.staffId = '';
      attendRecord.attendType = 0;
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
      // USB CSV 格式可能與一般 CSV 不同
      // TODO: 需要根據實際的 USB CSV 檔案格式調整這些對應關係

      if (row.length >= 1) {
        // 員工編號或姓名
        const identifier = this.sanitizeString(row[0]);

        // 判斷是員工編號還是姓名（通常編號會包含數字）
        if (this.isStaffId(identifier)) {
          attendRecord.staffId = identifier || '';
        } else {
          attendRecord.staffName = identifier || undefined;
          // 如果是姓名，可能需要根據姓名查找員工編號
          attendRecord.staffId =
            (await this.findStaffIdByName(identifier)) || '';
        }
      }

      if (row.length >= 2) {
        // 可能是時間戳記或其他資訊
        const secondField = this.sanitizeString(row[1]);

        // 如果第一欄是員工編號，第二欄可能是姓名
        if (attendRecord.staffId && !attendRecord.staffName) {
          attendRecord.staffName = secondField || undefined;
        }
      }

      if (row.length >= 3) {
        // 出勤類型或其他資訊
        const thirdField = this.sanitizeString(row[2]);
        attendRecord.attendType = this.parseAttendType(thirdField);
      }

      // USB 固定標記為 USB 輸入類型
      attendRecord.inputType = 'usb';

      // 如果沒有明確的出勤類型，設定為未決定
      if (attendRecord.attendType === undefined) {
        attendRecord.attendType = 0; // 0: 未決定
      }

      this.logger.debug(`USB CSV 轉換結果: ${JSON.stringify(attendRecord)}`);
    } catch (error) {
      this.logger.warn(`USB CSV 資料轉換失敗: ${JSON.stringify(row)}`, error);
      // 回傳基本的實體，避免程式中斷
      attendRecord.staffId = '';
      attendRecord.attendType = 0;
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
   * @returns 出勤類型數字 (0: 未決定, 1: 上班, 2: 下班)
   */
  private parseAttendType(value: string | undefined): number {
    if (!value) return 0;

    const cleanValue = this.sanitizeString(value).toLowerCase();

    // 根據字串內容判斷出勤類型
    if (
      cleanValue.includes('上班') ||
      cleanValue.includes('in') ||
      cleanValue === '1'
    ) {
      return 1; // 上班
    } else if (
      cleanValue.includes('下班') ||
      cleanValue.includes('out') ||
      cleanValue === '2'
    ) {
      return 2; // 下班
    } else if (cleanValue === '0' || cleanValue.includes('未決定')) {
      return 0; // 未決定
    }

    // 嘗試直接解析數字
    const numValue = parseInt(cleanValue, 10);
    if (!isNaN(numValue) && [0, 1, 2].includes(numValue)) {
      return numValue;
    }

    // 預設為未決定
    return 0;
  }

  /**
   * 判斷字串是否為員工編號格式
   * 通常員工編號會包含數字或特定格式
   */
  private isStaffId(value: string): boolean {
    if (!value) return false;

    // 檢查是否包含數字
    const hasNumber = /\d/.test(value);

    // 檢查是否為純中文姓名
    const isChineseName = /^[\u4e00-\u9fa5]{2,4}$/.test(value);

    // 如果是純中文姓名，則不是員工編號
    if (isChineseName) return false;

    // 如果包含數字，很可能是員工編號
    return hasNumber;
  }

  /**
   * 根據員工姓名查找員工編號
   * 這個方法需要與資料庫整合
   * TODO: 實作資料庫查詢邏輯
   */
  private findStaffIdByName(staffName: string): Promise<string | null> {
    try {
      // TODO: 實作從資料庫查詢員工編號的邏輯
      // const staff = await this.staffRepository.findOne({ where: { name: staffName } });
      // return staff ? staff.id : null;

      this.logger.debug(`需要根據姓名查找員工編號: ${staffName}`);
      return Promise.resolve(null);
    } catch (error) {
      this.logger.warn(`根據姓名查找員工編號失敗: ${staffName}`, error);
      return Promise.resolve(null);
    }
  }

  /**
   * 驗證 AttendRecord 實體的必要欄位
   */
  validateAttendRecord(attendRecord: AttendRecord): boolean {
    // 至少要有員工編號或員工姓名
    const hasIdentifier = attendRecord.staffId || attendRecord.staffName;

    // 出勤類型必須是有效值
    const hasValidAttendType = [0, 1, 2].includes(attendRecord.attendType);

    return !!hasIdentifier && hasValidAttendType;
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
    });
  }
}
