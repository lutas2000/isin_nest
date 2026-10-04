import { StaffLeave } from './entities/staff-leave.entity';

/**
 * 請假資料存取介面。第七階段翻轉前以 MariaDB 為 system of record（`MariadbStaffLeaveStore`），
 * 翻轉後換成 TypeORM / PostgreSQL 實作；`StaffLeaveService` 的規則與 API 不變。
 * 時間一律以 Date 進出，台北牆上時間與資料庫欄位的轉換由實作負責。
 */
export interface LeaveStaff {
  id: string;
  name: string;
  /** `YYYY-MM-DD` */
  begain_work: string;
}

export interface LeaveSegment {
  id: number;
  name: string;
  /** `HH:mm:ss` */
  begain_time: string;
  end_time: string;
  cross_day: number;
  duty: number;
  night_work: number;
  rest_time: number;
  rest_time2: number;
  /** `YYYY-MM-DD` */
  create_date: string;
}

export type NewStaffLeave = Omit<StaffLeave, 'id'>;

export interface StaffLeaveStore {
  findPage(page: number, limit: number): Promise<{ data: StaffLeave[]; total: number }>;
  findOne(id: number): Promise<StaffLeave | null>;
  findByName(name: string): Promise<StaffLeave[]>;
  findByType(type: string): Promise<StaffLeave[]>;
  /** start_time 介於兩者之間（含），依 start_time、id 升冪；可依員工篩選。 */
  findStartingBetween(start: Date, end: Date, name?: string): Promise<StaffLeave[]>;
  /** 舊介面：start_time ≥ start 且 end_time ≤ end，依 start_time 降冪。 */
  findWithin(start: Date, end: Date): Promise<StaffLeave[]>;
  sumHours(name: string, type: string, start: Date, end: Date): Promise<number>;
  /** 同一交易寫入全部列，回傳含 id 的紀錄。 */
  insertMany(rows: NewStaffLeave[]): Promise<StaffLeave[]>;
  update(row: StaffLeave): Promise<StaffLeave>;
  delete(id: number): Promise<void>;
  findStaffByName(name: string): Promise<LeaveStaff | null>;
  findStaffById(id: string): Promise<LeaveStaff | null>;
  /** 當日生效段別：create_date ≤ 當日的最新一筆（與薪資計算的 pickDaySegment 相同）。 */
  latestSegment(name: string, date: string): Promise<LeaveSegment | null>;
}

export const STAFF_LEAVE_STORE = Symbol('STAFF_LEAVE_STORE');
