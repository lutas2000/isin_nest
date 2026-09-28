import {
  ConflictException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { TimeClockService } from '../time-clock/time-clock.service';
import {
  LegacyConnection,
  LegacyStaffDbService,
} from './legacy-staff-db.service';

interface PunchRow {
  id: string;
  staff_name: string;
  create_time: string;
  attend_type: number;
}

/** The old Django mapper tagged M70 wall time as UTC without shifting its clock. */
export function legacyDate(value: Date): string {
  return value.toISOString().slice(0, 19).replace('T', ' ');
}

/** Values observed in legacy attend_record for matching M70 punches. */
export function legacyInputType(verifyMode?: number): string {
  if (verifyMode === 80) return '人臉';
  if (verifyMode === 16 || verifyMode === 17 || verifyMode === 120) return '指紋';
  if (verifyMode === 81 || verifyMode === undefined) return '';
  return String(verifyMode);
}

function taipeiToday(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export function workDay(value: string): string {
  const date = new Date(value.replace(' ', 'T') + 'Z');
  if (date.getUTCHours() < 5) date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

function nextDay(day: string): string {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

@Injectable()
export class LegacyStaffService {
  private readonly logger = new Logger(LegacyStaffService.name);
  private running = false;

  constructor(
    private readonly db: LegacyStaffDbService,
    private readonly clock: TimeClockService,
  ) {}

  private async exclusive<T>(run: () => Promise<T>): Promise<T> {
    if (this.running)
      throw new ConflictException('Staff flow is already running');
    this.running = true;
    try {
      return await run();
    } finally {
      this.running = false;
    }
  }

  async import(): Promise<void> {
    return this.exclusive(() => this.importLogs());
  }

  private async importLogs(): Promise<void> {
    const mappings = await this.db.query(`SELECT m.machine_id, m.staff_id, m.record_name,
      DATE_FORMAT(s.stop_work, '%Y-%m-%d') AS stop_work
      FROM staff_m70_user m INNER JOIN staff s ON s.id = m.staff_id
      WHERE m.record_name IS NOT NULL AND m.present_on_device = 1`);
    // Reading every record keeps retries safe even when a previous database write failed.
    // The device's unread marker must never be changed by this path.
    const logs = await this.clock.getAttendanceLogs({
      includeAll: true,
      markAsRead: false,
    });
    const staffByDeviceId = new Map<string, { id: string; name: string; stopWork: string | null }>();
    for (const row of mappings)
      staffByDeviceId.set(String(row.machine_id), {
        id: String(row.staff_id), name: String(row.record_name),
        stopWork: row.stop_work ? String(row.stop_work) : null,
      });
    if (
      logs.length &&
      !logs.some((log) => log.userId && staffByDeviceId.has(log.userId.trim()))
    ) {
      throw new ServiceUnavailableException(
        'No M70 logs have a linked MariaDB machine ID',
      );
    }
    let inserted = 0;
    let duplicate = 0;
    let unknown = 0;
    let departed = 0;
    await this.db.transaction(async (connection) => {
      for (const log of logs) {
        const person = log.userId && staffByDeviceId.get(log.userId.trim());
        if (!person || !log.clock) {
          unknown++;
          continue;
        }
        const timestamp = legacyDate(log.clock);
        // stop_work is the final employed calendar day, inclusive. Historical
        // punches on or before that date may still be imported on a retry.
        if (person.stopWork && timestamp.slice(0, 10) > person.stopWork) {
          departed++;
          continue;
        }
        const epochSeconds = Math.floor(log.clock.getTime() / 1000);
        const id = `${epochSeconds}.0${person.name}`;
        const result = await connection.query(
          'INSERT INTO attend_record (id, staff_id, staff_name, create_time, input_type, attend_type) VALUES (?, ?, ?, ?, ?, 0) ON DUPLICATE KEY UPDATE id = id',
          [
            id,
            person.id,
            person.name,
            timestamp,
            legacyInputType(log.verifyMode),
            0,
          ],
        );
        if (result.affectedRows === 1) inserted++;
        else duplicate++;
      }
    });
    this.logger.log(
      `M70 import: read=${logs.length}, inserted=${inserted}, duplicate=${duplicate}, skipped=${unknown}, departed=${departed}`,
    );
  }

  async appoint(): Promise<void> {
    return this.exclusive(async () => {
      await this.db.transaction((connection) =>
        this.appointInTransaction(connection),
      );
    });
  }

  private async appointInTransaction(
    connection: LegacyConnection,
  ): Promise<string | null> {
    const undecided = (await connection.query(
      'SELECT id, staff_name, create_time, attend_type FROM attend_record WHERE attend_type = 0 ORDER BY create_time, id',
    )) as PunchRow[];
    const groups = new Set<string>();
    for (const row of undecided)
      groups.add(`${row.staff_name}\0${workDay(row.create_time)}`);
    for (const key of groups) {
      const [name, day] = key.split('\0');
      const rows = (await connection.query(
        'SELECT id, staff_name, create_time, attend_type FROM attend_record WHERE staff_name = ? AND create_time >= ? AND create_time < ? ORDER BY create_time, id',
        [name, `${day} 05:00:00`, `${nextDay(day)} 05:00:00`],
      )) as PunchRow[];
      if (rows.length > 1 && rows.length % 2 === 1) {
        const unknown = rows.splice(rows.length - 2, 1)[0];
        await connection.query(
          'UPDATE attend_record SET attend_type = 3 WHERE id = ?',
          [unknown.id],
        );
      }
      for (let index = 0; index < rows.length; index++) {
        await connection.query(
          'UPDATE attend_record SET attend_type = ? WHERE id = ?',
          [(index % 2) + 1, rows[index].id],
        );
      }
    }
    return undecided.length ? undecided[0].create_time : null;
  }

  async recalculateFrom(startDay: string): Promise<void> {
    return this.exclusive(async () => {
      const today = taipeiToday();
      if (startDay > today) return;
      await this.db.transaction(async (connection) => {
        for (let day = startDay; day <= today; day = nextDay(day)) {
          await this.calculateDay(connection, day);
        }
      });
    });
  }

  async today(): Promise<void> {
    return this.exclusive(async () => {
      await this.importLogs();
      await this.db.transaction(async (connection) => {
        await this.appointInTransaction(connection);
        const today = taipeiToday();
        const yesterday = new Date(`${today}T00:00:00Z`);
        yesterday.setUTCDate(yesterday.getUTCDate() - 1);
        await this.calculateDay(
          connection,
          yesterday.toISOString().slice(0, 10),
        );
        await this.calculateDay(connection, today);
      });
    });
  }

  async scheduled(): Promise<void> {
    return this.exclusive(async () => {
      await this.importLogs();
      await this.db.transaction(async (connection) => {
        const first = await this.appointInTransaction(connection);
        if (!first) return;
        const today = taipeiToday();
        for (let day = workDay(first); day <= today; day = nextDay(day)) {
          await this.calculateDay(connection, day);
        }
      });
    });
  }

  private async calculateDay(
    connection: LegacyConnection,
    day: string,
  ): Promise<void> {
    const staff = await connection.query(
      'SELECT name FROM staff WHERE need_check = 1 AND begain_work <= ? AND (stop_work >= ? OR stop_work IS NULL)',
      [day, day],
    );
    for (const person of staff) {
      const name = String(person.name);
      await connection.query(
        'DELETE FROM staff_manhour WHERE name = ? AND day = ?',
        [name, day],
      );
      const rows = (await connection.query(
        'SELECT create_time, attend_type FROM attend_record WHERE staff_name = ? AND create_time >= ? AND create_time < ? AND attend_type IN (1, 2) ORDER BY create_time, id',
        [name, `${day} 05:00:00`, `${nextDay(day)} 05:00:00`],
      )) as PunchRow[];
      const starts = rows.filter((row) => row.attend_type === 1);
      const ends = rows.filter((row) => row.attend_type === 2);
      for (let index = 0; index < starts.length; index++) {
        await connection.query(
          'INSERT INTO staff_manhour (name, start_time, end_time, work_time, day) VALUES (?, ?, ?, 0, ?)',
          [
            name,
            starts[index].create_time,
            ends[index]?.create_time ?? null,
            day,
          ],
        );
      }
    }
    this.logger.log(`Legacy staff calculated: ${day}, staff=${staff.length}`);
  }
}
