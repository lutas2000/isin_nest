import { StaffManhour2 } from './entities/staff-manhour2.entity';

/**
 * 外帳工時資料存取介面。第七階段翻轉前以 MariaDB 為 system of record（`MariadbStaffManhour2Store`），
 * 翻轉後換成 TypeORM / PostgreSQL 實作；`StaffManhour2Service` 的規則與 API 不變。
 * 時間一律以 Date 進出，台北牆上時間與資料庫欄位的轉換由實作負責。
 */
export interface ManhourSpan {
  start_time: Date;
  end_time: Date | null;
}

export type NewStaffManhour2 = Omit<StaffManhour2, 'id'>;

export interface StaffManhour2Store {
  findPage(page: number, limit: number): Promise<{ data: StaffManhour2[]; total: number }>;
  findOne(id: number): Promise<StaffManhour2 | null>;
  findByName(name: string): Promise<StaffManhour2[]>;
  /** 依員工與開始時間區間（含）查詢，依 start_time、id 升冪；條件皆可省略。 */
  search(name?: string, start?: Date, end?: Date): Promise<StaffManhour2[]>;
  insert(row: NewStaffManhour2): Promise<StaffManhour2>;
  /** 同一交易寫入全部列，回傳含 id 的紀錄。 */
  insertMany(rows: NewStaffManhour2[]): Promise<StaffManhour2[]>;
  update(row: StaffManhour2): Promise<StaffManhour2>;
  delete(id: number): Promise<void>;
  /** 正式工時（staff_manhour）同員工、開始時間在區間內的區間，依 start_time 升冪。 */
  findManhourStartingBetween(name: string, start: Date, end: Date): Promise<ManhourSpan[]>;
}

export const STAFF_MANHOUR2_STORE = Symbol('STAFF_MANHOUR2_STORE');
