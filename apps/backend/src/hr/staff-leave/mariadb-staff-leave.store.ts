import { Injectable } from '@nestjs/common';
import { LegacyConnection, LegacyStaffDbService } from '../../legacy-staff/legacy-staff-db.service';
import { dateToTaipeiWallClock, taipeiWallClockToDate } from '../taipei-time';
import { StaffLeave } from './entities/staff-leave.entity';
import { LeaveSegment, LeaveStaff, NewStaffLeave, StaffLeaveStore } from './staff-leave.store';

/**
 * 以舊 MariaDB 的 `staff_leave`、`staff`、`staff_segment` 為請假資料來源（第七階段前的過渡實作）。
 * `datetime` 欄位存的是台北牆上時間；連線池設定 `dateStrings: true`，讀出即為
 * `YYYY-MM-DD HH:mm:ss` 字串，寫入時也用同樣的字串，避免驅動程式依伺服器時區轉換。
 * 只讀寫既有欄位，不改 schema。
 */
const LEAVE_COLUMNS = `id, name, type,
  DATE_FORMAT(start_time, '%Y-%m-%d %H:%i:%s') AS start_time,
  DATE_FORMAT(end_time, '%Y-%m-%d %H:%i:%s') AS end_time,
  time, verify`;

const wall = (value: Date): string => dateToTaipeiWallClock(value);

function toLeave(row: any): StaffLeave {
  const leave = new StaffLeave();
  leave.id = Number(row.id);
  leave.name = String(row.name);
  leave.type = String(row.type);
  leave.start_time = taipeiWallClockToDate(String(row.start_time));
  leave.end_time = taipeiWallClockToDate(String(row.end_time));
  leave.time = Number(row.time ?? 0);
  leave.verify = String(row.verify ?? '');
  return leave;
}

@Injectable()
export class MariadbStaffLeaveStore implements StaffLeaveStore {
  constructor(private readonly db: LegacyStaffDbService) {}

  async findPage(page: number, limit: number): Promise<{ data: StaffLeave[]; total: number }> {
    const rows = await this.db.query(
      `SELECT ${LEAVE_COLUMNS} FROM staff_leave ORDER BY start_time DESC, id DESC LIMIT ? OFFSET ?`,
      [limit, (page - 1) * limit],
    );
    const [{ total }] = await this.db.query('SELECT COUNT(*) AS total FROM staff_leave');
    return { data: rows.map(toLeave), total: Number(total) };
  }

  async findOne(id: number): Promise<StaffLeave | null> {
    const rows = await this.db.query(`SELECT ${LEAVE_COLUMNS} FROM staff_leave WHERE id = ?`, [id]);
    return rows.length ? toLeave(rows[0]) : null;
  }

  async findByName(name: string): Promise<StaffLeave[]> {
    const rows = await this.db.query(
      `SELECT ${LEAVE_COLUMNS} FROM staff_leave WHERE name = ? ORDER BY start_time DESC, id DESC`,
      [name],
    );
    return rows.map(toLeave);
  }

  async findByType(type: string): Promise<StaffLeave[]> {
    const rows = await this.db.query(
      `SELECT ${LEAVE_COLUMNS} FROM staff_leave WHERE type = ? ORDER BY start_time DESC, id DESC`,
      [type],
    );
    return rows.map(toLeave);
  }

  async findStartingBetween(start: Date, end: Date, name?: string): Promise<StaffLeave[]> {
    const rows = await this.db.query(
      `SELECT ${LEAVE_COLUMNS} FROM staff_leave
       WHERE start_time BETWEEN ? AND ?${name ? ' AND name = ?' : ''}
       ORDER BY start_time ASC, id ASC`,
      [wall(start), wall(end), ...(name ? [name] : [])],
    );
    return rows.map(toLeave);
  }

  async findWithin(start: Date, end: Date): Promise<StaffLeave[]> {
    const rows = await this.db.query(
      `SELECT ${LEAVE_COLUMNS} FROM staff_leave WHERE start_time >= ? AND end_time <= ? ORDER BY start_time DESC`,
      [wall(start), wall(end)],
    );
    return rows.map(toLeave);
  }

  async sumHours(name: string, type: string, start: Date, end: Date): Promise<number> {
    const [{ total }] = await this.db.query(
      'SELECT COALESCE(SUM(time), 0) AS total FROM staff_leave WHERE name = ? AND type = ? AND start_time BETWEEN ? AND ?',
      [name, type, wall(start), wall(end)],
    );
    return Number(total ?? 0);
  }

  insertMany(rows: NewStaffLeave[]): Promise<StaffLeave[]> {
    return this.db.transaction(async (connection: LegacyConnection) => {
      const saved: StaffLeave[] = [];
      for (const row of rows) {
        const result = await connection.query(
          'INSERT INTO staff_leave (name, type, start_time, end_time, time, verify) VALUES (?, ?, ?, ?, ?, ?)',
          [row.name, row.type, wall(row.start_time), wall(row.end_time), row.time, row.verify],
        );
        saved.push(Object.assign(new StaffLeave(), row, { id: Number(result.insertId) }));
      }
      return saved;
    });
  }

  async update(row: StaffLeave): Promise<StaffLeave> {
    await this.db.query(
      'UPDATE staff_leave SET type = ?, start_time = ?, end_time = ?, time = ?, verify = ? WHERE id = ?',
      [row.type, wall(row.start_time), wall(row.end_time), row.time, row.verify, row.id],
    );
    return row;
  }

  async delete(id: number): Promise<void> {
    await this.db.query('DELETE FROM staff_leave WHERE id = ?', [id]);
  }

  async findStaffByName(name: string): Promise<LeaveStaff | null> {
    return this.staffRow('name = ?', [name]);
  }

  async findStaffById(id: string): Promise<LeaveStaff | null> {
    return this.staffRow('id = ?', [id]);
  }

  private async staffRow(where: string, values: unknown[]): Promise<LeaveStaff | null> {
    const rows = await this.db.query(
      `SELECT id, name, DATE_FORMAT(begain_work, '%Y-%m-%d') AS begain_work FROM staff WHERE ${where} LIMIT 1`,
      values,
    );
    if (!rows.length) return null;
    return { id: String(rows[0].id), name: String(rows[0].name), begain_work: String(rows[0].begain_work) };
  }

  async latestSegment(name: string, date: string): Promise<LeaveSegment | null> {
    const rows = await this.db.query(
      `SELECT id, name, TIME_FORMAT(begain_time, '%H:%i:%s') AS begain_time,
              TIME_FORMAT(end_time, '%H:%i:%s') AS end_time, cross_day, duty, night_work,
              rest_time, rest_time2, DATE_FORMAT(create_date, '%Y-%m-%d') AS create_date
       FROM staff_segment WHERE name = ? AND create_date <= ?
       ORDER BY create_date DESC, id DESC LIMIT 1`,
      [name, date],
    );
    if (!rows.length) return null;
    const row = rows[0];
    return {
      id: Number(row.id),
      name: String(row.name),
      begain_time: String(row.begain_time),
      end_time: String(row.end_time),
      cross_day: Number(row.cross_day ?? 0),
      duty: Number(row.duty ?? 0),
      night_work: Number(row.night_work ?? 0),
      rest_time: Number(row.rest_time ?? 0),
      rest_time2: Number(row.rest_time2 ?? 0),
      create_date: String(row.create_date),
    };
  }
}
