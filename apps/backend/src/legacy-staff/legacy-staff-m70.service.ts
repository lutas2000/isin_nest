import {
  BadRequestException,
  ConflictException,
  Injectable,
  HttpException,
  Logger,
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
  private deviceBusy = false;
  private readonly logger = new Logger(LegacyStaffM70Service.name);
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
    return this.deviceOperation('M70 employee sync', () => this.syncDeviceSnapshot());
  }

  private async syncDeviceSnapshot(): Promise<{ read: number; linked: number; unlinked: number }> {
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

  private deviceName(value: unknown): string {
    if (typeof value !== 'string' || !value.trim() || Buffer.byteLength(value.trim(), 'utf16le') > 48 || value.includes('\0'))
      throw new BadRequestException('name must be nonempty UTF-16 text within 48 bytes and contain no NUL');
    return value.trim();
  }

  private devicePassword(value: unknown): number {
    if ((typeof value !== 'string' && typeof value !== 'number') ||
      !/^[0-9]+$/.test(String(value)) || !Number.isSafeInteger(Number(value)) ||
      Number(value) < 1 || Number(value) > 0xffffffff)
      throw new BadRequestException('password must be a decimal integer from 1 to 4294967295');
    return Number(value);
  }

  private deviceBody(body: unknown, allowed: string[]): Record<string, unknown> {
    if (!body || typeof body !== 'object' || Array.isArray(body))
      throw new BadRequestException('JSON object body is required');
    if (Object.keys(body).some(key => !allowed.includes(key)))
      throw new BadRequestException(`Only ${allowed.join(', ')} are supported`);
    return body as Record<string, unknown>;
  }

  private async deviceOperation<T>(operation: string, work: () => Promise<T>): Promise<T> {
    if (this.deviceBusy) throw new ConflictException('M70 employee operation is already running');
    this.deviceBusy = true;
    try {
      const result = await work();
      this.logger.log(`${operation} succeeded`);
      return result;
    } catch (error) {
      this.logger.warn(`${operation} failed`);
      if (error instanceof HttpException) throw error;
      // A device write and a MariaDB update cannot form one transaction.
      // Do not claim rollback or retry a potentially completed write.
      throw new ServiceUnavailableException('M70 operation failed; device state may have changed. Read device users and run sync before retrying.');
    } finally {
      this.deviceBusy = false;
    }
  }

  async listDeviceUsers(): Promise<{ machine_id: number; name: string | null }[]> {
    return this.deviceOperation('M70 employee read', async () =>
      (await this.clock.listUsers({ includeNames: true })).map(user => ({ machine_id: user.userId, name: user.name ?? null })),
    );
  }

  private async saveDeviceSnapshot(id: number, name: string, serial: string): Promise<M70Mapping> {
    // Preserve staff_id and record_name, including historical links for deleted users.
    await this.db.query(`INSERT INTO staff_m70_user
      (machine_id, device_name, device_serial, present_on_device, last_synced_at)
      VALUES (?, ?, ?, 1, NOW()) ON DUPLICATE KEY UPDATE
      device_name = VALUES(device_name), device_serial = VALUES(device_serial),
      present_on_device = 1, last_synced_at = NOW()`, [id, name, serial]);
    return this.get(id);
  }

  async createDeviceUser(input: unknown): Promise<M70Mapping> {
    const body = this.deviceBody(input, ['machine_id', 'name', 'password']);
    const id = machineId(body.machine_id);
    if (id === 0) throw new BadRequestException('machine_id must be greater than zero for enrollment');
    const name = this.deviceName(body.name);
    const password = this.devicePassword(body.password);
    return this.deviceOperation(`M70 employee create id=${id}`, async () => {
      // Check the real device; the mapping may be stale or missing.
      const users = await this.clock.listUsers({ includeNames: true });
      if (users.some(user => user.userId === id)) throw new ConflictException(`M70 device user ${id} already exists`);
      const identity = await this.clock.getDeviceIdentity();
      // Ensure MariaDB is reachable before issuing device writes.
      const mappings = await this.db.query('SELECT machine_id FROM staff_m70_user WHERE machine_id = ?', [id]);
      if (mappings.length) throw new ConflictException(`Machine ID ${id} is already reserved in mapping; do not reuse historical IDs`);
      const savedLogs = await this.db.query('SELECT machine_id FROM staff_m70_log WHERE machine_id = ? LIMIT 1', [id]);
      if (savedLogs.length) throw new ConflictException(`Machine ID ${id} has saved attendance history and cannot be reused`);
      const logs = await this.clock.getAttendanceLogs({ includeAll: true });
      if (logs.some(log => String(log.userId) === String(id)))
        throw new ConflictException(`Machine ID ${id} has attendance history and cannot be reused`);
      await this.clock.upsertUser({ userId: id, name, password });
      const created = (await this.clock.listUsers({ includeNames: true })).find(user => user.userId === id);
      if (!created || created.name !== name) throw new ServiceUnavailableException('M70 creation readback failed; inspect device and sync');
      return this.saveDeviceSnapshot(id, name, identity.serialNumber);
    });
  }

  async updateDeviceUser(idValue: string, input: unknown): Promise<M70Mapping> {
    const id = machineId(idValue);
    const body = this.deviceBody(input, ['name', 'password']);
    if (!Object.keys(body).length) throw new BadRequestException('name or password is required');
    const name = body.name === undefined ? undefined : this.deviceName(body.name);
    const password = body.password === undefined ? undefined : this.devicePassword(body.password);
    if (name === undefined && password === undefined) throw new BadRequestException('name or password is required');
    return this.deviceOperation(`M70 employee update id=${id}`, async () => {
      const before = (await this.clock.listUsers({ includeNames: true })).find(user => user.userId === id);
      if (!before) throw new NotFoundException(`M70 device user ${id} not found`);
      const identity = await this.clock.getDeviceIdentity();
      await this.db.query('SELECT machine_id FROM staff_m70_user WHERE machine_id = ?', [id]);
      const beforeLogs = await this.clock.getAttendanceLogs({ includeAll: true });
      await this.clock.upsertUser({ userId: id, ...(name !== undefined ? { name } : {}), ...(password !== undefined ? { password } : {}) });
      const after = (await this.clock.listUsers({ includeNames: true })).find(user => user.userId === id);
      if (!after || after.name !== (name ?? before.name))
        throw new ServiceUnavailableException('M70 update readback failed; inspect device and sync');
      const afterLogs = await this.clock.getAttendanceLogs({ includeAll: true });
      const rawLogs = new Set(afterLogs.map(log => log.raw.toString('hex')));
      if (!beforeLogs.every(log => rawLogs.has(log.raw.toString('hex'))))
        throw new ServiceUnavailableException('M70 update attendance verification failed; inspect device state');
      return this.saveDeviceSnapshot(id, after.name ?? '', identity.serialNumber);
    });
  }

  async deleteDeviceUser(idValue: string): Promise<{ machine_id: number; deleted: true }> {
    const id = machineId(idValue);
    return this.deviceOperation(`M70 employee delete id=${id}`, async () => {
      const user = (await this.clock.listUsers({ includeNames: true })).find(user => user.userId === id);
      if (!user) throw new NotFoundException(`M70 device user ${id} not found`);
      const identity = await this.clock.getDeviceIdentity();
      // Store the historic mapping before deletion even if it has never been synced.
      await this.saveDeviceSnapshot(id, user.name ?? '', identity.serialNumber);
      await this.clock.deleteUser(id);
      if ((await this.clock.listUsers({ includeNames: true })).some(row => row.userId === id))
        throw new ServiceUnavailableException('M70 deletion readback failed; inspect device and sync');
      await this.db.query('UPDATE staff_m70_user SET present_on_device = 0, last_synced_at = NOW() WHERE machine_id = ?', [id]);
      return { machine_id: id, deleted: true };
    });
  }

  async renameDevice(idValue: string, body: { name?: unknown }): Promise<{ name: string; logsUnchanged: boolean }> {
    const result = await this.updateDeviceUser(idValue, { name: body?.name });
    return { name: result.device_name!, logsUnchanged: true };
  }
}
