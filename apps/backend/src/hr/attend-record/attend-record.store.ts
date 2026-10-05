import { AttendRecord } from './entities/attend-record.entity';

export interface AttendRecordFilter {
  staffId?: string;
  attendType?: number;
  start?: Date;
  end?: Date;
}

/**
 * 出勤記錄的讀取來源。第七階段前綁定 MariaDB（打卡排程寫入的 system of record），
 * 翻轉時換成 PostgreSQL 實作即可。寫入路徑（手動新增、CSV/USB 匯入）不經過這裡。
 */
export interface AttendRecordReadStore {
  findPage(page: number, limit: number): Promise<{ data: AttendRecord[]; total: number }>;
  findOne(id: string): Promise<AttendRecord | null>;
  find(filter: AttendRecordFilter): Promise<AttendRecord[]>;
}

export const ATTEND_RECORD_READ_STORE = Symbol('ATTEND_RECORD_READ_STORE');
