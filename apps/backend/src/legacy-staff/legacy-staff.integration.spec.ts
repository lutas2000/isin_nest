import { INestApplication, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AdminGuard } from '../auth/admin.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TimeClockService } from '../time-clock/time-clock.service';
import { LegacyStaffController } from './legacy-staff.controller';
import { LegacyStaffDbService } from './legacy-staff-db.service';
import { LegacyStaffService } from './legacy-staff.service';
import { LegacyStaffM70Service } from './legacy-staff-m70.service';
import { LegacyStaffM70Controller } from './legacy-staff-m70.controller';

// Set LEGACY_STAFF_TEST_DB=staff_verify to run against an expendable local MariaDB.
// The explicit host, port and database guards prevent this test from writing to SOURCE_DB_*.
const enabled =
  process.env.LEGACY_STAFF_TEST_DB === 'staff_verify' &&
  process.env.LEGACY_STAFF_TEST_HOST === '127.0.0.1' &&
  process.env.LEGACY_STAFF_TEST_PORT === '13307';

(enabled ? describe : describe.skip)(
  'Legacy staff MariaDB API integration',
  () => {
    let app: INestApplication;
    let db: LegacyStaffDbService;
    const logs = [
      { userId: '1', clock: new Date('2026-09-23T16:00:00Z'), verifyMode: 1 },
      { userId: '1', clock: new Date('2026-09-23T16:01:00Z'), verifyMode: 1 },
      { userId: '1', clock: new Date('2026-09-24T01:30:00Z'), verifyMode: 1 },
    ];

    beforeAll(async () => {
      const config = {
        get: (key: string) =>
          ({
            SOURCE_DB_HOST: '127.0.0.1',
            SOURCE_DB_PORT: '13307',
            SOURCE_DB_USER: 'root',
            SOURCE_DB_PASS: process.env.LEGACY_STAFF_TEST_PASS,
            SOURCE_DB_NAME: 'staff_verify',
          })[key],
      };
      const clock = {
        listUsers: jest.fn().mockResolvedValue([{ userId: 1, name: '甲' }]),
        getDeviceIdentity: jest.fn().mockResolvedValue({ serialNumber: 'TEST-M70' }),
        getAttendanceLogs: jest.fn().mockResolvedValue(logs),
      };
      const module = await Test.createTestingModule({
        controllers: [LegacyStaffController, LegacyStaffM70Controller],
        providers: [
          LegacyStaffDbService,
          LegacyStaffService,
          LegacyStaffM70Service,
          { provide: ConfigService, useValue: config },
          { provide: TimeClockService, useValue: clock },
        ],
      })
        .overrideGuard(JwtAuthGuard)
        .useValue({ canActivate: () => true })
        .overrideGuard(AdminGuard)
        .useValue({ canActivate: () => true })
        .compile();
      app = module.createNestApplication();
      db = module.get(LegacyStaffDbService);
      await app.init();
      await db.query('DROP TABLE IF EXISTS staff_manhour');
      await db.query('DROP TABLE IF EXISTS attend_record');
      await db.query('DROP TABLE IF EXISTS staff_m70_user');
      await db.query('DROP TABLE IF EXISTS staff');
      await db.query(`CREATE TABLE staff (id varchar(10) CHARACTER SET utf8 COLLATE utf8_bin PRIMARY KEY, name varchar(6) NOT NULL,
      need_check tinyint NOT NULL, begain_work date NOT NULL, stop_work date NULL) ENGINE=InnoDB`);
      await db.query(`CREATE TABLE attend_record (id varchar(32) PRIMARY KEY,
      staff_id varchar(10) NOT NULL, staff_name varchar(6), create_time datetime NOT NULL,
      input_type varchar(10), attend_type int NOT NULL DEFAULT 0) ENGINE=InnoDB`);
      await db.query(`CREATE TABLE staff_manhour (id int AUTO_INCREMENT PRIMARY KEY,
      name varchar(6) NOT NULL, start_time datetime NULL, end_time datetime NULL,
      work_time float NOT NULL DEFAULT 0, day date NULL) ENGINE=InnoDB`);
      await db.query(`CREATE TABLE staff_m70_user (machine_id INT UNSIGNED PRIMARY KEY,
        device_name varchar(64), staff_id varchar(10) CHARACTER SET utf8 COLLATE utf8_bin,
        record_name varchar(64), device_serial varchar(64), present_on_device tinyint NOT NULL DEFAULT 1,
        first_seen_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, last_synced_at datetime,
        updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_staff_m70_user_staff FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
      await db.query(
        "INSERT INTO staff (id, name, need_check, begain_work) VALUES ('E001', '甲', 1, '2020-01-01')",
      );
      await db.query("INSERT INTO staff_m70_user (machine_id, device_name, staff_id, record_name) VALUES (1, '甲', 'E001', '甲')");
    });

    afterAll(async () => {
      if (app) await app.close();
    });

    it('imports through HTTP, deduplicates, classifies, and pairs a cross-midnight day', async () => {
      const server = app.getHttpServer();
      const log = jest.spyOn(Logger.prototype, 'log').mockImplementation();
      await request(server).post('/staff/import').expect(200, 'succeed');
      await request(server).post('/staff/import').expect(200, 'succeed');
      expect(log).toHaveBeenCalledWith(
        'M70 import: read=3, inserted=3, duplicate=0, skipped=0, departed=0',
      );
      expect(log).toHaveBeenCalledWith(
        'M70 import: read=3, inserted=0, duplicate=3, skipped=0, departed=0',
      );
      log.mockRestore();
      expect(
        (await db.query('SELECT COUNT(*) AS count FROM attend_record'))[0]
          .count,
      ).toBe(3);
      await request(server)
        .post('/staff/appoint')
        .expect(200, 'appoint_attend_type succeed');
      const records = await db.query(
        'SELECT attend_type FROM attend_record ORDER BY create_time',
      );
      expect(
        records.map((row: { attend_type: number }) => row.attend_type),
      ).toEqual([1, 3, 2]);
      await request(server)
        .post('/staff/work_hour/2026-09-23')
        .expect(200, 'succeed');
      const hours = await db.query(
        "SELECT name, start_time, end_time, work_time, day FROM staff_manhour WHERE day='2026-09-23'",
      );
      expect(hours).toEqual([
        {
          name: '甲',
          start_time: '2026-09-23 16:00:00',
          end_time: '2026-09-24 01:30:00',
          work_time: 0,
          day: '2026-09-23',
        },
      ]);
    });

    it('rolls back manhour deletion when an insert fails and succeeds on retry', async () => {
      const error = jest.spyOn(Logger.prototype, 'error').mockImplementation();
      await db.query(`CREATE TRIGGER reject_staff_hour BEFORE INSERT ON staff_manhour
      FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'forced validation failure'`);
      await request(app.getHttpServer())
        .post('/staff/work_hour/2026-09-23')
        .expect(500);
      error.mockRestore();
      const beforeRetry = await db.query(
        "SELECT start_time, end_time FROM staff_manhour WHERE day='2026-09-23'",
      );
      expect(beforeRetry).toHaveLength(1);
      await db.query('DROP TRIGGER reject_staff_hour');
      await request(app.getHttpServer())
        .post('/staff/work_hour/2026-09-23')
        .expect(200);
      const afterRetry = await db.query(
        "SELECT start_time, end_time FROM staff_manhour WHERE day='2026-09-23'",
      );
      expect(afterRetry).toEqual(beforeRetry);
    });

    it('syncs without overwriting manual links and supports mapping CRUD', async () => {
      const server = app.getHttpServer();
      await request(server).post('/staff/m70-users').send({ machine_id: 99 }).expect(201);
      await request(server).patch('/staff/m70-users/99').send({ staff_id: 'E001' }).expect(200);
      await request(server).post('/staff/m70-users/sync').expect(201, {
        read: 1, linked: 1, unlinked: 0,
      });
      const list = await request(server).get('/staff/m70-users').expect(200);
      expect(list.body.find((row: { machine_id: number }) => row.machine_id === 1)).toMatchObject({
        staff_id: 'E001', record_name: '甲', device_serial: 'TEST-M70', present_on_device: 1,
      });
      expect(list.body.find((row: { machine_id: number }) => row.machine_id === 99)).toMatchObject({
        staff_id: 'E001', present_on_device: 0,
      });
      await request(server).delete('/staff/m70-users/99').expect(200);
      await request(server).delete('/staff/m70-users/99').expect(404);
    });

    it('imports historical punches through the final workday but rejects later punches', async () => {
      await db.query("INSERT INTO staff (id, name, need_check, begain_work, stop_work) VALUES ('E002', '乙', 1, '2020-01-01', '2026-08-31')");
      await db.query("INSERT INTO staff_m70_user (machine_id, device_name, staff_id, record_name) VALUES (2, '乙', 'E002', '乙')");
      const clock = app.get(TimeClockService);
      jest.spyOn(clock, 'getAttendanceLogs').mockResolvedValueOnce([
        { userId: '2', clock: new Date('2026-08-31T23:59:59Z') },
        { userId: '2', clock: new Date('2026-09-01T00:00:00Z') },
      ] as never);
      await request(app.getHttpServer()).post('/staff/import').expect(200, 'succeed');
      const rows = await db.query("SELECT create_time FROM attend_record WHERE staff_id = 'E002'");
      expect(rows).toEqual([{ create_time: '2026-08-31 23:59:59' }]);
    });
  },
);
