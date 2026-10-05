import { Injectable } from '@nestjs/common';
import { LegacyStaffDbService } from '../../legacy-staff/legacy-staff-db.service';
import { dateToTaipeiWallClock, taipeiWallClockToDate } from '../taipei-time';
import { AttendRecord } from './entities/attend-record.entity';
import { AttendRecordFilter, AttendRecordReadStore } from './attend-record.store';

/**
 * 以舊 MariaDB 的 `attend_record` 為出勤記錄來源（第七階段前的過渡實作）。
 * `create_time` 存的是台北牆上時間，查詢條件也轉成同樣格式的字串。只讀，不改 schema。
 */
const COLUMNS = `id, staff_id, staff_name,
  DATE_FORMAT(create_time, '%Y-%m-%d %H:%i:%s') AS create_time,
  input_type, attend_type`;

function toRecord(row: any): AttendRecord {
  const record = new AttendRecord();
  record.id = String(row.id);
  record.staffId = String(row.staff_id);
  record.staffName = row.staff_name ?? undefined;
  record.createTime = taipeiWallClockToDate(String(row.create_time));
  record.inputType = row.input_type ?? undefined;
  record.attendType = Number(row.attend_type ?? 0);
  return record;
}

@Injectable()
export class MariadbAttendRecordStore implements AttendRecordReadStore {
  constructor(private readonly db: LegacyStaffDbService) {}

  async findPage(page: number, limit: number): Promise<{ data: AttendRecord[]; total: number }> {
    const rows = await this.db.query(
      `SELECT ${COLUMNS} FROM attend_record ORDER BY attend_record.create_time DESC, id DESC LIMIT ? OFFSET ?`,
      [limit, (page - 1) * limit],
    );
    const [{ total }] = await this.db.query('SELECT COUNT(*) AS total FROM attend_record');
    return { data: rows.map(toRecord), total: Number(total) };
  }

  async findOne(id: string): Promise<AttendRecord | null> {
    const rows = await this.db.query(`SELECT ${COLUMNS} FROM attend_record WHERE id = ?`, [id]);
    return rows.length ? toRecord(rows[0]) : null;
  }

  async find(filter: AttendRecordFilter): Promise<AttendRecord[]> {
    const where: string[] = [];
    const values: unknown[] = [];
    if (filter.staffId !== undefined) {
      where.push('staff_id = ?');
      values.push(filter.staffId);
    }
    if (filter.attendType !== undefined) {
      where.push('attend_type = ?');
      values.push(filter.attendType);
    }
    if (filter.start) {
      where.push('attend_record.create_time >= ?');
      values.push(dateToTaipeiWallClock(filter.start));
    }
    if (filter.end) {
      where.push('attend_record.create_time <= ?');
      values.push(dateToTaipeiWallClock(filter.end));
    }
    const rows = await this.db.query(
      `SELECT ${COLUMNS} FROM attend_record${where.length ? ` WHERE ${where.join(' AND ')}` : ''}
       ORDER BY attend_record.create_time DESC, id DESC`,
      values,
    );
    return rows.map(toRecord);
  }
}
