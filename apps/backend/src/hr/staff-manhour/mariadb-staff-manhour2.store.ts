import { Injectable } from '@nestjs/common';
import { LegacyConnection, LegacyStaffDbService } from '../../legacy-staff/legacy-staff-db.service';
import { dateToTaipeiWallClock, taipeiWallClockToDate } from '../taipei-time';
import { StaffManhour2 } from './entities/staff-manhour2.entity';
import { ManhourSpan, NewStaffManhour2, StaffManhour2Store } from './staff-manhour2.store';

/**
 * 以舊 MariaDB 的 `staff_manhour2` 為外帳工時資料來源，`staff_manhour` 為複製來源（第七階段前的過渡實作）。
 * `datetime` 欄位存的是台北牆上時間；連線池設定 `dateStrings: true`，讀出即為
 * `YYYY-MM-DD HH:mm:ss` 字串，寫入時也用同樣的字串，避免驅動程式依伺服器時區轉換。
 * 舊表沒有 `day` 欄位；`work_time` 舊程式一律留 0，薪資 loader 也不讀它，這裡存顯示用時數。
 * 只讀寫既有欄位，不改 schema。
 */
const COLUMNS = `id, name,
  DATE_FORMAT(start_time, '%Y-%m-%d %H:%i:%s') AS start_time,
  DATE_FORMAT(end_time, '%Y-%m-%d %H:%i:%s') AS end_time,
  work_time`;

const wall = (value: Date | null | undefined): string | null => (value ? dateToTaipeiWallClock(value) : null);
const toDate = (value: unknown): Date | undefined => (value ? taipeiWallClockToDate(String(value)) : undefined);

function toRow(row: any): StaffManhour2 {
  const manhour = new StaffManhour2();
  manhour.id = Number(row.id);
  manhour.name = String(row.name);
  manhour.start_time = toDate(row.start_time);
  manhour.end_time = toDate(row.end_time);
  manhour.work_time = Number(row.work_time ?? 0);
  return manhour;
}

@Injectable()
export class MariadbStaffManhour2Store implements StaffManhour2Store {
  constructor(private readonly db: LegacyStaffDbService) {}

  async findPage(page: number, limit: number): Promise<{ data: StaffManhour2[]; total: number }> {
    const rows = await this.db.query(`SELECT ${COLUMNS} FROM staff_manhour2 ORDER BY id DESC LIMIT ? OFFSET ?`, [
      limit,
      (page - 1) * limit,
    ]);
    const [{ total }] = await this.db.query('SELECT COUNT(*) AS total FROM staff_manhour2');
    return { data: rows.map(toRow), total: Number(total) };
  }

  async findOne(id: number): Promise<StaffManhour2 | null> {
    const rows = await this.db.query(`SELECT ${COLUMNS} FROM staff_manhour2 WHERE id = ?`, [id]);
    return rows.length ? toRow(rows[0]) : null;
  }

  async findByName(name: string): Promise<StaffManhour2[]> {
    const rows = await this.db.query(`SELECT ${COLUMNS} FROM staff_manhour2 WHERE name = ? ORDER BY id DESC`, [name]);
    return rows.map(toRow);
  }

  async search(name?: string, start?: Date, end?: Date): Promise<StaffManhour2[]> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    if (name) {
      conditions.push('name = ?');
      values.push(name);
    }
    if (start) {
      conditions.push('start_time >= ?');
      values.push(wall(start));
    }
    if (end) {
      conditions.push('start_time <= ?');
      values.push(wall(end));
    }
    const where = conditions.length ? ` WHERE ${conditions.join(' AND ')}` : '';
    const rows = await this.db.query(`SELECT ${COLUMNS} FROM staff_manhour2${where} ORDER BY start_time ASC, id ASC`, values);
    return rows.map(toRow);
  }

  async insert(row: NewStaffManhour2): Promise<StaffManhour2> {
    const [saved] = await this.insertMany([row]);
    return saved;
  }

  insertMany(rows: NewStaffManhour2[]): Promise<StaffManhour2[]> {
    return this.db.transaction(async (connection: LegacyConnection) => {
      const saved: StaffManhour2[] = [];
      for (const row of rows) {
        const result = await connection.query(
          'INSERT INTO staff_manhour2 (name, start_time, end_time, work_time) VALUES (?, ?, ?, ?)',
          [row.name, wall(row.start_time), wall(row.end_time), row.work_time ?? 0],
        );
        saved.push(Object.assign(new StaffManhour2(), row, { id: Number(result.insertId) }));
      }
      return saved;
    });
  }

  async update(row: StaffManhour2): Promise<StaffManhour2> {
    await this.db.query('UPDATE staff_manhour2 SET start_time = ?, end_time = ?, work_time = ? WHERE id = ?', [
      wall(row.start_time),
      wall(row.end_time),
      row.work_time ?? 0,
      row.id,
    ]);
    return row;
  }

  async delete(id: number): Promise<void> {
    await this.db.query('DELETE FROM staff_manhour2 WHERE id = ?', [id]);
  }

  async findManhourStartingBetween(name: string, start: Date, end: Date): Promise<ManhourSpan[]> {
    const rows = await this.db.query(
      `SELECT DATE_FORMAT(start_time, '%Y-%m-%d %H:%i:%s') AS start_time,
              DATE_FORMAT(end_time, '%Y-%m-%d %H:%i:%s') AS end_time
       FROM staff_manhour WHERE name = ? AND start_time BETWEEN ? AND ? ORDER BY start_time ASC, id ASC`,
      [name, wall(start), wall(end)],
    );
    return rows.map((row: any) => ({ start_time: toDate(row.start_time) as Date, end_time: toDate(row.end_time) ?? null }));
  }
}
