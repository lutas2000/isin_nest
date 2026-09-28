import { ServiceUnavailableException } from '@nestjs/common';
import {
  LegacyStaffService,
  legacyDate,
  legacyInputType,
  workDay,
} from './legacy-staff.service';

type RecordRow = {
  id: string;
  staff_name: string;
  create_time: string;
  attend_type: number;
};

describe('Legacy staff Django parity', () => {
  it('stops import when no device ID is linked in MariaDB', async () => {
    const transaction = jest.fn();
    const db = {
      query: jest.fn().mockResolvedValue([]),
      transaction,
    };
    const clock = {
      getAttendanceLogs: jest
        .fn()
        .mockResolvedValue([
          { userId: '1', clock: new Date('2026-09-24T08:00:00Z') },
        ]),
    };
    const service = new LegacyStaffService(db as never, clock as never);
    await expect(service.import()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(transaction).not.toHaveBeenCalled();
  });

  it('uses the persisted machine ID link and stable record name', async () => {
    const query = jest.fn().mockResolvedValue({ affectedRows: 1 });
    const transaction = jest.fn((work) => work({ query }));
    const db = {
      query: jest.fn().mockResolvedValue([
        { machine_id: 1, staff_id: 'E002', record_name: '乙' },
      ]),
      transaction,
    };
    const clock = {
      getAttendanceLogs: jest
        .fn()
        .mockResolvedValue([
          { userId: '1', clock: new Date('2026-09-24T08:00:00Z') },
        ]),
    };
    const service = new LegacyStaffService(db as never, clock as never);
    await service.import();
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO attend_record'),
      expect.arrayContaining(['E002', '乙', '2026-09-24 08:00:00']),
    );
  });

  it('allows the final workday and skips punches after stop_work', async () => {
    const query = jest.fn().mockResolvedValue({ affectedRows: 1 });
    const db = {
      query: jest.fn().mockResolvedValue([
        { machine_id: 46, staff_id: 'A35', record_name: '黃俊傑', stop_work: '2026-08-31' },
      ]),
      transaction: jest.fn((work) => work({ query })),
    };
    const clock = { getAttendanceLogs: jest.fn().mockResolvedValue([
      { userId: '46', clock: new Date('2026-08-31T23:59:59Z') },
      { userId: '46', clock: new Date('2026-09-01T00:00:00Z') },
    ]) };
    const service = new LegacyStaffService(db as never, clock as never);
    await service.import();
    expect(query).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO attend_record'),
      expect.arrayContaining(['A35', '黃俊傑', '2026-08-31 23:59:59']),
    );
  });

  it('uses Django wall time and a 05:00 work-day boundary', () => {
    expect(legacyDate(new Date('2026-09-24T01:30:00Z'))).toBe(
      '2026-09-24 01:30:00',
    );
    expect(workDay('2026-09-24 01:30:00')).toBe('2026-09-23');
    expect(workDay('2026-09-24 05:00:00')).toBe('2026-09-24');
  });

  it('stores M70 verification modes in the legacy input_type format', () => {
    expect([80, 81, 16, 17, 120].map(legacyInputType)).toEqual([
      '人臉', '', '指紋', '指紋', '指紋',
    ]);
  });

  it('classifies an odd number of punches like Django and pairs cross-midnight work', async () => {
    const records: RecordRow[] = [
      {
        id: '1',
        staff_name: '甲',
        create_time: '2026-09-23 16:00:00',
        attend_type: 0,
      },
      {
        id: '2',
        staff_name: '甲',
        create_time: '2026-09-23 16:01:00',
        attend_type: 0,
      },
      {
        id: '3',
        staff_name: '甲',
        create_time: '2026-09-24 01:30:00',
        attend_type: 0,
      },
    ];
    const manhours: unknown[][] = [];
    const query = jest.fn(async (sql: string, values: unknown[] = []) => {
      if (sql.includes('FROM attend_record WHERE attend_type = 0'))
        return records.filter((r) => r.attend_type === 0);
      if (sql.includes('FROM attend_record WHERE staff_name = ?')) {
        return records.filter(
          (r) =>
            r.staff_name === values[0] &&
            r.create_time >= String(values[1]) &&
            r.create_time < String(values[2]),
        );
      }
      if (sql.startsWith('UPDATE attend_record')) {
        const id = sql.includes('SET attend_type = 3') ? values[0] : values[1];
        records.find((r) => r.id === id)!.attend_type = sql.includes(
          'SET attend_type = 3',
        )
          ? 3
          : Number(values[0]);
        return [];
      }
      if (sql.startsWith('SELECT name FROM staff')) return [{ name: '甲' }];
      if (sql.startsWith('INSERT INTO staff_manhour')) {
        manhours.push(values);
        return [];
      }
      return [];
    });
    const db = {
      transaction: (
        work: (connection: { query: typeof query }) => Promise<unknown>,
      ) => work({ query }),
    };
    const service = new LegacyStaffService(db as never, {} as never);
    await service.appoint();
    expect(records.map((r) => r.attend_type)).toEqual([1, 3, 2]);
    await service.recalculateFrom('2026-09-23');
    expect(manhours).toContainEqual([
      '甲',
      '2026-09-23 16:00:00',
      '2026-09-24 01:30:00',
      '2026-09-23',
    ]);
  });
});
