import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { TimeClockService } from '../time-clock/time-clock.service';
import { LegacyStaffDbService } from './legacy-staff-db.service';

export interface M70Mapping {
  machine_id: number;
  device_name: string | null;
  staff_id: string | null;
  record_name: string | null;
  staff_name: string | null;
  device_serial: string | null;
  present_on_device: number;
  first_seen_at: string;
  last_synced_at: string | null;
}

function machineId(value: unknown): number {
  const number = Number(value);
  if (!/^(0|[1-9]\d*)$/.test(String(value)) || !Number.isSafeInteger(number) || number > 0xffffffff)
    throw new BadRequestException('machineId must be an unsigned 32-bit integer');
  return number;
}

@Injectable()
export class LegacyStaffM70Service {
  constructor(
    private readonly db: LegacyStaffDbService,
    private readonly clock: TimeClockService,
  ) {}

  async list(): Promise<M70Mapping[]> {
    return this.db.query(`SELECT m.*, s.name AS staff_name FROM staff_m70_user m
      LEFT JOIN staff s ON s.id = m.staff_id ORDER BY m.machine_id`);
  }

  async staffOptions(): Promise<{ id: string; name: string }[]> {
    return this.db.query('SELECT id, name FROM staff ORDER BY name, id');
  }

  private async staffName(id: string | null): Promise<string | null> {
    if (id === null) return null;
    const rows = await this.db.query('SELECT name FROM staff WHERE id = ?', [id]);
    if (!rows.length) throw new BadRequestException(`staff_id ${id} does not exist`);
    return String(rows[0].name);
  }

  private staffId(value: unknown): string | null {
    if (value === null || value === '') return null;
    if (typeof value !== 'string' || value.length > 10)
      throw new BadRequestException('staff_id must be a legacy staff ID or null');
    return value;
  }

  async create(body: { machine_id?: unknown; staff_id?: unknown }): Promise<M70Mapping> {
    const id = machineId(body?.machine_id);
    const staffId = this.staffId(body?.staff_id ?? null);
    const name = await this.staffName(staffId);
    try {
      await this.db.query(
        'INSERT INTO staff_m70_user (machine_id, staff_id, record_name, present_on_device) VALUES (?, ?, ?, 0)',
        [id, staffId, name],
      );
    } catch (error) {
      if (error?.code === 'ER_DUP_ENTRY') throw new ConflictException(`M70 user ${id} already exists`);
      throw error;
    }
    return this.get(id);
  }

  async update(idValue: string, body: { staff_id?: unknown }): Promise<M70Mapping> {
    const id = machineId(idValue);
    if (!body || !Object.prototype.hasOwnProperty.call(body, 'staff_id'))
      throw new BadRequestException('staff_id is required');
    const current = await this.get(id);
    const staffId = this.staffId(body.staff_id);
    const name = staffId === current.staff_id ? current.record_name : await this.staffName(staffId);
    await this.db.query('UPDATE staff_m70_user SET staff_id = ?, record_name = ? WHERE machine_id = ?', [staffId, name, id]);
    return this.get(id);
  }

  async remove(idValue: string): Promise<void> {
    const id = machineId(idValue);
    const result = await this.db.query('DELETE FROM staff_m70_user WHERE machine_id = ?', [id]);
    if (!result.affectedRows) throw new NotFoundException(`M70 user ${id} not found`);
  }

  async get(id: number): Promise<M70Mapping> {
    const rows = await this.db.query(`SELECT m.*, s.name AS staff_name FROM staff_m70_user m
      LEFT JOIN staff s ON s.id = m.staff_id WHERE m.machine_id = ?`, [id]);
    if (!rows.length) throw new NotFoundException(`M70 user ${id} not found`);
    return rows[0];
  }

  async sync(): Promise<{ read: number; linked: number; unlinked: number }> {
    // Fetch the complete device snapshot before changing the database. A failed
    // read must never mark existing users as absent.
    const [users, identity, staff] = await Promise.all([
      this.clock.listUsers({ includeNames: true }),
      this.clock.getDeviceIdentity(),
      this.staffOptions(),
    ]);
    const names = new Map<string, string | null>();
    for (const person of staff) {
      const name = person.name.trim();
      names.set(name, names.has(name) ? null : person.id);
    }
    const deviceNames = new Map<string, number>();
    const ids = new Set<number>();
    for (const user of users) {
      const id = machineId(user.userId);
      if (ids.has(id)) throw new ServiceUnavailableException(`M70 returned duplicate user ${id}`);
      ids.add(id);
      if (!user.name?.trim()) throw new ServiceUnavailableException(`M70 user ${id} has no name`);
      const name = user.name.trim();
      deviceNames.set(name, (deviceNames.get(name) || 0) + 1);
    }
    await this.db.transaction(async (connection) => {
      await connection.query('UPDATE staff_m70_user SET present_on_device = 0');
      for (const user of users) {
        const id = user.userId;
        const name = user.name!.trim();
        const match = id === 56 && name === '鄭得利' ? 'A82' :
          deviceNames.get(name) === 1 ? names.get(name) : null;
        const staffId = match || null;
        const recordName = staffId ? staff.find((row) => row.id === staffId)?.name || null : null;
        await connection.query(`INSERT INTO staff_m70_user
          (machine_id, device_name, staff_id, record_name, device_serial, present_on_device, last_synced_at)
          VALUES (?, ?, ?, ?, ?, 1, NOW())
          ON DUPLICATE KEY UPDATE device_name = VALUES(device_name),
          device_serial = VALUES(device_serial), present_on_device = 1,
          last_synced_at = NOW()`,
          [id, name, staffId, recordName, identity.serialNumber],
        );
      }
    });
    const rows = await this.list();
    const linked = rows.filter((row) => row.present_on_device && row.staff_id).length;
    return { read: users.length, linked, unlinked: users.length - linked };
  }

  async renameDevice(idValue: string, body: { name?: unknown }): Promise<{ name: string; logsUnchanged: boolean }> {
    const id = machineId(idValue);
    const name = body?.name;
    if (typeof name !== 'string' || !name.trim() || name.length > 24)
      throw new BadRequestException('name must be 1–24 characters');
    await this.get(id);
    const beforeName = await this.clock.getUserName(id);
    const beforeStatus = await this.clock.getDeviceStatus();
    const beforeLogs = await this.clock.getAttendanceLogs({ includeAll: true, markAsRead: false });
    if (beforeName !== name.trim()) await this.clock.setUserName(id, name.trim());
    const afterName = await this.clock.getUserName(id);
    const afterStatus = await this.clock.getDeviceStatus();
    const afterLogs = await this.clock.getAttendanceLogs({ includeAll: true, markAsRead: false });
    const sameLogs = beforeLogs.length === afterLogs.length &&
      beforeLogs.every((row, index) => row.raw.equals(afterLogs[index].raw));
    if (afterName !== name.trim() || !sameLogs ||
      beforeStatus.unreadAttendanceLogCount !== afterStatus.unreadAttendanceLogCount)
      throw new ServiceUnavailableException('M70 rename verification failed; inspect device state');
    await this.sync();
    return { name: afterName, logsUnchanged: true };
  }
}
