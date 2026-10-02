import { encodeM70DeviceTime } from '../time-clock/realand-m70.protocol';
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
  function punch(userId: string, time: string) {
    const clock = new Date(time);
    const raw = Buffer.alloc(12);
    encodeM70DeviceTime(clock).copy(raw);
    raw.writeUInt32LE(Number(userId), 4);
    raw[8] = 80;
    return { index: 0, deviceNumber: 3, userId, clock, verifyMode: 80, raw };
  }

  function harness(logs, mappings) {
    let inbox = new Map<string, any>();
    let records = new Map<string, unknown[]>();
    const marker = jest.fn();
    const query = jest.fn(async (sql: string, values: any[] = []) => {
      if (sql.includes('INSERT IGNORE INTO staff_m70_log')) {
        if (!inbox.has(values[0])) inbox.set(values[0], {
          id: values[0], machine_id: values[2], create_time: values[3], verify_mode: values[4], raw: values[5], state: 'pending',
        });
        return { affectedRows: 1 };
      }
      if (sql.includes('FROM staff_m70_user')) return mappings;
      if (sql.includes("WHERE state = 'pending'")) return [...inbox.values()].filter(row => row.state === 'pending');
      if (sql.startsWith('INSERT INTO attend_record')) {
        const affectedRows = records.has(values[0]) ? 0 : 1;
        records.set(values[0], values);
        return { affectedRows };
      }
      if (sql.startsWith('UPDATE staff_m70_log')) {
        const id = values[values.length - 1];
        inbox.get(id).state = sql.includes("state = 'departed'") ? 'departed' : 'imported';
        return { affectedRows: 1 };
      }
      return [];
    });
    const db = { transaction: jest.fn(async work => {
      const beforeInbox = new Map([...inbox].map(([key, row]) => [key, { ...row }]));
      const beforeRecords = new Map(records);
      try { return await work({ query }); }
      catch (error) { inbox = beforeInbox; records = beforeRecords; throw error; }
    }) };
    const clock = { consumeUnreadAttendanceLogs: jest.fn(async persist => {
      const result = await persist(logs);
      marker();
      return result;
    }) };
    const service = new LegacyStaffService(db as never, clock as never);
    return { service, query, marker, clock, db, get inbox() { return inbox; }, get records() { return records; } };
  }

  it('retains an unmapped raw punch before marking and imports it after the mapping is supplied', async () => {
    const logs = [punch('1', '2026-09-24T08:00:00Z')];
    const mappings: any[] = [];
    const h = harness(logs, mappings);
    await h.service.import();
    expect(h.records.size).toBe(0);
    expect([...h.inbox.values()][0]).toMatchObject({ state: 'pending', raw: logs[0].raw });
    expect(h.marker).toHaveBeenCalledTimes(1);
    mappings.push({ machine_id: 1, staff_id: 'E002', record_name: '乙' });
    logs.splice(0);
    await h.service.import();
    expect(h.records.size).toBe(1);
    expect([...h.inbox.values()][0].state).toBe('imported');
  });

  it('uses the persisted machine ID link and stable record name', async () => {
    const h = harness([punch('1', '2026-09-24T08:00:00Z')], [
      { machine_id: 1, staff_id: 'E002', record_name: '乙' },
    ]);
    await h.service.import();
    expect(h.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO attend_record'),
      expect.arrayContaining(['E002', '乙', '2026-09-24 08:00:00']),
    );
    expect(h.marker).toHaveBeenCalledTimes(1);
    expect([...h.inbox.values()][0].state).toBe('imported');
  });

  it('allows the final workday and retains filtered departed punches without importing them', async () => {
    const h = harness([
      punch('46', '2026-08-31T23:59:59Z'), punch('46', '2026-09-01T00:00:00Z'),
    ], [{ machine_id: 46, staff_id: 'A35', record_name: '黃俊傑', stop_work: '2026-08-31' }]);
    await h.service.import();
    expect(h.records.size).toBe(1);
    expect([...h.inbox.values()].map(row => row.state)).toEqual(['imported', 'departed']);
    expect(h.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO attend_record'),
      expect.arrayContaining(['A35', '黃俊傑', '2026-08-31 23:59:59']),
    );
  });

  it('rolls back both raw and mapped punches and does not mark on a database failure', async () => {
    const h = harness([punch('1', '2026-09-24T08:00:00Z')], [
      { machine_id: 1, staff_id: 'E002', record_name: '乙' },
    ]);
    const normalQuery = h.query.getMockImplementation()!;
    h.query.mockImplementation(async (sql, values) => {
      if (sql.startsWith('INSERT INTO attend_record')) throw new Error('forced insert failure');
      return normalQuery(sql, values);
    });
    await expect(h.service.import()).rejects.toThrow('forced insert failure');
    expect(h.inbox.size).toBe(0);
    expect(h.records.size).toBe(0);
    expect(h.marker).not.toHaveBeenCalled();
    h.query.mockImplementation(normalQuery);
    await h.service.import();
    expect(h.records.size).toBe(1);
  });

  it('deduplicates the committed batch after a device marking failure', async () => {
    const h = harness([punch('1', '2026-09-24T08:00:00Z')], [
      { machine_id: 1, staff_id: 'E002', record_name: '乙' },
    ]);
    h.marker.mockImplementationOnce(() => { throw new Error('mark timeout'); });
    await expect(h.service.import()).rejects.toThrow('mark timeout');
    expect(h.records.size).toBe(1);
    expect(h.inbox.size).toBe(1);
    await h.service.import();
    expect(h.records.size).toBe(1);
    expect(h.inbox.size).toBe(1);
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
