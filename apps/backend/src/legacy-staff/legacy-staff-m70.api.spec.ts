import { INestApplication, UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import request from 'supertest';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TimeClockService } from '../time-clock/time-clock.service';
import { LegacyStaffDbService } from './legacy-staff-db.service';
import { LegacyStaffM70Controller } from './legacy-staff-m70.controller';
import { LegacyStaffM70Service } from './legacy-staff-m70.service';
import { TimeClockConnectionError } from '../time-clock/time-clock.errors';

// Real HTTP routing, service validation and AdminGuard; no live device or database writes.
describe('Staff M70 device API', () => {
  let app: INestApplication;
  let users: Array<{ userId: number; name: string }>;
  let mappings: Map<number, any>;
  let logs: any[];
  const clock = {
    listUsers: jest.fn(),
    getDeviceIdentity: jest.fn(),
    getAttendanceLogs: jest.fn(),
    upsertUser: jest.fn(),
    deleteUser: jest.fn(),
  };
  const db = { query: jest.fn() };
  const base = '/staff/m70-users/device';
  const admin = (method: 'get' | 'post' | 'patch' | 'delete', url = base) =>
    request(app.getHttpServer())[method](url).set('Authorization', 'Bearer admin');

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [LegacyStaffM70Controller],
      providers: [LegacyStaffM70Service, { provide: LegacyStaffDbService, useValue: db }, { provide: TimeClockService, useValue: clock }],
    }).overrideGuard(JwtAuthGuard).useValue({ canActivate(context) {
      const req = context.switchToHttp().getRequest();
      if (!req.headers.authorization) throw new UnauthorizedException();
      req.user = { isAdmin: req.headers.authorization === 'Bearer admin' };
      return true;
    } }).compile();
    app = module.createNestApplication();
    await app.listen(0, '127.0.0.1');
  });
  afterAll(async () => app.close());
  beforeEach(() => {
    jest.resetAllMocks();
    users = [{ userId: 1, name: '原員工' }];
    mappings = new Map();
    logs = [{ userId: '1', raw: Buffer.from('original') }];
    clock.listUsers.mockImplementation(async () => users.map(u => ({ ...u })));
    clock.getDeviceIdentity.mockResolvedValue({ serialNumber: 'TEST' });
    clock.getAttendanceLogs.mockImplementation(async () => [...logs]);
    clock.upsertUser.mockImplementation(async user => {
      const current = users.find(u => u.userId === user.userId);
      if (current) { if (user.name !== undefined) current.name = user.name; }
      else users.push({ userId: user.userId, name: user.name });
    });
    clock.deleteUser.mockImplementation(async id => { users = users.filter(u => u.userId !== id); });
    db.query.mockImplementation(async (sql: string, args: any[] = []) => {
      if (sql.includes('FROM staff_m70_log')) return [];
      if (sql.startsWith('SELECT machine_id')) return mappings.has(args[0]) ? [{ machine_id: args[0] }] : [];
      if (sql.includes('WHERE m.machine_id = ?')) return mappings.has(args[0]) ? [{ ...mappings.get(args[0]) }] : [];
      if (sql.startsWith('INSERT INTO staff_m70_user')) {
        const [id, name, serial] = args;
        mappings.set(id, { staff_id: null, record_name: null, ...mappings.get(id), machine_id: id, device_name: name, device_serial: serial, present_on_device: 1 });
        return { affectedRows: 1 };
      }
      if (sql.startsWith('UPDATE staff_m70_user SET present_on_device = 0,')) {
        mappings.get(args[0]).present_on_device = 0;
        return { affectedRows: 1 };
      }
      throw new Error(`Unexpected SQL ${sql}`);
    });
  });

  it('protects every device route with JWT and the real AdminGuard', async () => {
    for (const [method, url] of [['get', base], ['post', base], ['patch', `${base}/9999`], ['delete', `${base}/9999`]] as const) {
      await request(app.getHttpServer())[method](url).expect(401);
      await request(app.getHttpServer())[method](url).set('Authorization', 'Bearer member').expect(403);
    }
    expect(clock.listUsers).not.toHaveBeenCalled();
  });

  it('creates, modifies, deletes and keeps the historical mapping and staff link', async () => {
    const created = await admin('post').send({ machine_id: 9999, name: '測試員工', password: '654321' }).expect(201);
    expect(created.body).toMatchObject({ machine_id: 9999, device_name: '測試員工', staff_id: null, present_on_device: 1 });
    expect(created.body.password).toBeUndefined();
    mappings.get(9999).staff_id = 'A1';
    mappings.get(9999).record_name = '固定紀錄姓名';
    const updated = await admin('patch', `${base}/9999`).send({ name: '修改姓名', password: 456789 }).expect(200);
    expect(updated.body).toMatchObject({ device_name: '修改姓名', staff_id: 'A1', record_name: '固定紀錄姓名' });
    expect(clock.upsertUser).toHaveBeenLastCalledWith({ userId: 9999, name: '修改姓名', password: 456789 });
    await admin('get').expect(200).expect([{ machine_id: 1, name: '原員工' }, { machine_id: 9999, name: '修改姓名' }]);
    await admin('delete', `${base}/9999`).expect(200).expect({ machine_id: 9999, deleted: true });
    expect(mappings.get(9999)).toMatchObject({ staff_id: 'A1', record_name: '固定紀錄姓名', present_on_device: 0 });
    expect(users).toEqual([{ userId: 1, name: '原員工' }]);
    expect(logs).toHaveLength(1);
    await admin('delete', `${base}/9999`).expect(404);
  });

  it('supports password-only modification and requires an existing device user', async () => {
    await admin('patch', `${base}/1`).send({ password: '345678' }).expect(200);
    expect(clock.upsertUser).toHaveBeenCalledWith({ userId: 1, password: 345678 });
    expect(mappings.get(1).device_name).toBe('原員工');
    await admin('patch', `${base}/9999`).send({ name: '甲' }).expect(404);
  });

  it('detects lost attendance records after modification before updating the mapping', async () => {
    clock.upsertUser.mockImplementationOnce(async user => { users[0].name = user.name; logs = []; });
    await admin('patch', `${base}/1`).send({ name: '甲' }).expect(503);
    expect(mappings.has(1)).toBe(false);
  });

  it('rejects invalid or unsupported input before any device call', async () => {
    for (const body of [
      {}, { machine_id: 0, name: '甲', password: 1 }, { machine_id: 1.5, name: '甲', password: 1 },
      { machine_id: 9999, name: '甲'.repeat(25), password: 1 },
      { machine_id: 9999, name: '甲\0乙', password: 1 },
      ...[null, true, -1, 0, 1.5, '1e3', 4294967296].map(password => ({ machine_id: 9999, name: '甲', password })),
      { machine_id: 9999, name: '甲', password: 1, privilege: 1 },
    ]) await admin('post').send(body).expect(400);
    for (const body of [{}, { enabled: true }, { name: null }, { password: null }])
      await admin('patch', `${base}/9999`).send(body).expect(400);
    await admin('delete', `${base}/bad`).expect(400);
    expect(clock.listUsers).not.toHaveBeenCalled();
    expect(clock.upsertUser).not.toHaveBeenCalled();
  });

  it('prevents reusing IDs on the device, in historical mapping or attendance', async () => {
    await admin('post').send({ machine_id: 1, name: '甲', password: 1 }).expect(409);
    mappings.set(9999, { machine_id: 9999, present_on_device: 0 });
    await admin('post').send({ machine_id: 9999, name: '甲', password: 1 }).expect(409);
    logs.push({ userId: '9998', raw: Buffer.from('old') });
    await admin('post').send({ machine_id: 9998, name: '甲', password: 1 }).expect(409);
    const query = db.query.getMockImplementation()!;
    db.query.mockImplementation(async (sql, args) => sql.includes('FROM staff_m70_log') ? [{ machine_id: 9997 }] : query(sql, args));
    await admin('post').send({ machine_id: 9997, name: '甲', password: 1 }).expect(409);
    expect(clock.upsertUser).not.toHaveBeenCalled();
  });

  it('reports unavailable device and failed write readback without claiming success', async () => {
    clock.listUsers.mockRejectedValueOnce(new TimeClockConnectionError('private endpoint'));
    const failed = await admin('get').expect(503);
    expect(JSON.stringify(failed.body)).not.toContain('private endpoint');
    clock.upsertUser.mockResolvedValueOnce(undefined); // Device acknowledged but snapshot did not change.
    await admin('post').send({ machine_id: 9999, name: '甲', password: 1 }).expect(503);
    expect(mappings.has(9999)).toBe(false);
    clock.deleteUser.mockResolvedValueOnce(undefined);
    await admin('delete', `${base}/1`).expect(503);
    expect(mappings.get(1).present_on_device).toBe(1);
  });

  it('reports MariaDB failure after a successful device write and allows sync/recovery', async () => {
    const query = db.query.getMockImplementation()!;
    db.query.mockImplementation(async (sql, args) => {
      if (sql.startsWith('INSERT')) throw new Error('DB disconnected');
      return query(sql, args);
    });
    await admin('post').send({ machine_id: 9999, name: '甲', password: 1 }).expect(503);
    expect(users.some(user => user.userId === 9999)).toBe(true);
    // Reading remains available; retrying creation must not overwrite this user.
    await admin('get').expect(200);
    await admin('post').send({ machine_id: 9999, name: '甲', password: 1 }).expect(409);
  });

  it('rejects overlapping employee writes and releases the lock afterwards', async () => {
    let release: (value: any) => void;
    const service = app.get(LegacyStaffM70Service);
    clock.listUsers.mockImplementationOnce(() => new Promise(resolve => { release = resolve; }));
    const first = service.listDeviceUsers();
    await admin('delete', `${base}/1`).expect(409);
    release!(users);
    await first;
    await admin('get').expect(200);
  });

  it('keeps the existing rename URL and accepts punches arriving during rename', async () => {
    clock.upsertUser.mockImplementationOnce(async user => {
      users[0].name = user.name;
      logs.push({ userId: '1', raw: Buffer.from('new') });
    });
    await admin('post', '/staff/m70-users/1/rename-device').send({ name: '改名' }).expect(201).expect({ name: '改名', logsUnchanged: true });
    expect(clock.getAttendanceLogs).toHaveBeenCalledWith({ includeAll: true });
  });

  it('publishes distinct device routes and write-only password documentation', () => {
    const doc = SwaggerModule.createDocument(app, new DocumentBuilder().addBearerAuth(undefined, 'JWT-auth').build());
    expect(doc.paths[base].post?.requestBody).toBeDefined();
    expect(doc.paths[`${base}/{machineId}`].patch).toBeDefined();
    expect(doc.paths[`${base}/{machineId}`].delete).toBeDefined();
    const schema = (doc.paths[base].post!.requestBody as any).content['application/json'].schema;
    expect(schema.properties.password.writeOnly).toBe(true);
  });
});
