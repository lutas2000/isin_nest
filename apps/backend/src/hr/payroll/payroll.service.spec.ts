import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { PayrollSourceData, SegmentRow, StaffRow } from './domain/types';
import { PayrollRunDay } from './entities/payroll-run-day.entity';
import { PayrollRunStaff } from './entities/payroll-run-staff.entity';
import { PayrollRun } from './entities/payroll-run.entity';
import { sha256 } from './payroll-file.service';
import { PayrollService } from './payroll.service';
import { PayrollSourceLoader } from './source/payroll-source.loader';

const staff = (overrides: Partial<StaffRow>): StaffRow => ({
  id: 'A01',
  name: '張三',
  department: '生產部',
  wage: 30000,
  allowance: 3000,
  organizer: 0,
  labor_insurance: 500,
  health_insurance: 400,
  pension: 1800,
  is_foreign: false,
  benifit: true,
  need_check: true,
  have_fake: false,
  begain_work: '2020-01-01',
  stop_work: null,
  ...overrides,
});

const segment = (overrides: Partial<SegmentRow>): SegmentRow => ({
  id: 1,
  name: '張三',
  begain_time: '08:00:00',
  end_time: '17:00:00',
  cross_day: false,
  duty: false,
  night_work: false,
  rest_time: 60,
  rest_time2: 60,
  create_date: '2020-01-01',
  ...overrides,
});

function sourceData(): PayrollSourceData {
  return {
    period: { start: '2026-06-01', end: '2026-06-03' },
    variant: 'official',
    staff: [staff({}), staff({ id: 'A02', name: '李四', department: '銷管部', need_check: false })],
    segments: [segment({}), segment({ id: 2, name: '李四' })],
    manhours: [
      { name: '張三', start_time: '2026-06-01 07:58:00', end_time: '2026-06-01 19:05:00' },
      { name: '張三', start_time: '2026-06-02 08:00:00', end_time: '2026-06-02 17:00:00' },
    ],
    leaves: [{ name: '張三', type: '防疫假', start_time: '2026-06-03 08:00:00', end_time: '2026-06-03 17:00:00' }],
    vacations: {},
  };
}

/** 以 Map 模擬三張表與交易，不接 PostgreSQL。 */
function harness(data: PayrollSourceData = sourceData()) {
  let nextId = 1;
  const runs = new Map<number, PayrollRun>();
  const staffRows: PayrollRunStaff[] = [];
  const dayRows: PayrollRunDay[] = [];

  const manager = {
    create: (_entity: unknown, value: Record<string, unknown>) => ({ ...value }),
    save: jest.fn(async (entityOrRows: unknown, rows?: unknown[]) => {
      if (entityOrRows === PayrollRunStaff) {
        for (const row of rows as PayrollRunStaff[]) staffRows.push({ ...row, id: nextId++ });
        return rows;
      }
      if (entityOrRows === PayrollRunDay) {
        for (const row of rows as PayrollRunDay[]) dayRows.push({ ...row, id: nextId++ });
        return rows;
      }
      const run = { ...(entityOrRows as PayrollRun), id: nextId++, createdAt: new Date(), updatedAt: new Date() };
      runs.set(run.id, run);
      return run;
    }),
    delete: jest.fn(async (_entity: unknown, where: { runId: number }) => {
      for (let i = staffRows.length - 1; i >= 0; i--) if (staffRows[i].runId === where.runId) staffRows.splice(i, 1);
    }),
    update: jest.fn(async (_entity: unknown, where: { id: number }, patch: Partial<PayrollRun>) => {
      Object.assign(runs.get(where.id)!, patch);
    }),
  };
  const dataSource = { transaction: jest.fn(async (work: (m: typeof manager) => Promise<unknown>) => work(manager)) };

  const runRepo = {
    findOne: jest.fn(async ({ where }: { where: { id: number } }) => {
      const run = runs.get(where.id);
      if (!run) return null;
      const { inputJson: _omit, ...rest } = run;
      return { ...rest };
    }),
    find: jest.fn(async () => [...runs.values()]),
    update: jest.fn(async (where: { id: number }, patch: Partial<PayrollRun>) => {
      Object.assign(runs.get(where.id)!, patch);
    }),
    createQueryBuilder: jest.fn(() => {
      let id = 0;
      const qb = {
        select: () => qb,
        where: (_sql: string, params: { id: number }) => ((id = params.id), qb),
        andWhere: () => qb,
        getRawOne: async () => (runs.has(id) ? { inputJson: runs.get(id)!.inputJson } : undefined),
        getCount: async () => 0,
      };
      return qb;
    }),
  };
  const staffRepo = {
    find: jest.fn(async ({ where }: { where: { runId: number } }) =>
      staffRows.filter((row) => row.runId === where.runId).sort((a, b) => a.wageOrder - b.wageOrder),
    ),
  };
  const dayRepo = {
    find: jest.fn(async ({ where }: { where: { runId: number } }) => dayRows.filter((row) => row.runId === where.runId)),
  };
  const loader: PayrollSourceLoader = { source: 'mariadb', load: jest.fn(async () => data) };
  const written = new Map<string, Buffer>();
  const files = {
    resolve: (periodStart: string, fileName: string) => `files/payroll/${periodStart.slice(0, 4)}/${fileName}`,
    write: jest.fn(async (filePath: string, buffer: Buffer) => {
      written.set(filePath, buffer);
      return { filePath, fileSha256: sha256(buffer) };
    }),
    read: jest.fn(async (filePath: string | null, expected: string | null) => {
      const buffer = filePath ? written.get(filePath) : undefined;
      if (!buffer || (expected && sha256(buffer) !== expected)) return null;
      return buffer;
    }),
  };

  const service = new PayrollService(
    loader,
    runRepo as never,
    staffRepo as never,
    dayRepo as never,
    dataSource as never,
    files as never,
  );
  return { service, loader, runs, staffRows, dayRows, manager, files, written };
}

describe('PayrollService', () => {
  it('preview computes without touching repositories and strips function fields', async () => {
    const h = harness();
    const preview = await h.service.preview({ start: '2026-06-01', end: '2026-06-03', variant: 'official' });
    expect(preview.source).toBe('mariadb');
    expect(preview.departments.map((d) => d.department)).toEqual(['銷管部', '生產部']);
    expect(preview.warnings.some((w) => w.includes('防疫假'))).toBe(true);
    expect(JSON.parse(JSON.stringify(preview.departments[1].summaries[0]))).not.toHaveProperty('daysOvertimeAtLeast');
    expect(h.runs.size).toBe(0);
  });

  it('createRuns stores one draft run per department with staff and day rows and the full input', async () => {
    const h = harness();
    const { runs, warnings } = await h.service.createRuns(
      { start: '2026-06-01', end: '2026-06-03', variant: 'official', manual: { 張三: { bonus: 1000 } } },
      42,
    );
    expect(runs).toHaveLength(2);
    expect(runs.map((run) => run.department)).toEqual(['銷管部', '生產部']);
    expect(runs[0]).toMatchObject({ status: 'draft', source: 'mariadb', createdBy: 42 });
    expect(runs[0].filePath).toBe(`files/payroll/2026/115年6月薪資表-official-run${runs[0].id}.xlsx`);
    expect(runs[0].fileSha256).toHaveLength(64);
    expect(h.written.size).toBe(2);
    expect(h.runs.get(runs[0].id)).toMatchObject({ filePath: runs[0].filePath, fileSha256: runs[0].fileSha256 });
    expect(runs[0]).not.toHaveProperty('inputJson');
    expect(h.runs.get(runs[1].id)!.inputJson).toEqual(sourceData());
    expect(h.runs.get(runs[1].id)!.warningsJson).toEqual(warnings);

    const production = h.staffRows.filter((row) => row.runId === runs[1].id);
    expect(production).toHaveLength(1);
    expect(production[0]).toMatchObject({ name: '張三', staffId: 'A01', wageOrder: 0, hourOrder: 0, bonus: 1000, manualJson: { bonus: 1000 } });
    expect(production[0].netPay).toBe(production[0].additionTotal - production[0].deductionTotal);
    const sales = h.staffRows.filter((row) => row.runId === runs[0].id);
    expect(sales[0]).toMatchObject({ name: '李四', hourOrder: null, needCheck: false });

    expect(h.dayRows.filter((row) => row.runId === runs[1].id)).toHaveLength(3);
    expect(h.dayRows.filter((row) => row.runId === runs[0].id)).toHaveLength(0);
  });

  it('updateManual merges fields, recalculates totals, and refuses unknown staff or fields', async () => {
    const h = harness();
    const { runs } = await h.service.createRuns(
      { start: '2026-06-01', end: '2026-06-03', variant: 'official', manual: { 張三: { bonus: 1000 } } },
      null,
    );
    const id = runs[1].id;
    const before = (await h.service.findRun(id)).staff[0];

    const detail = await h.service.updateManual(id, { 張三: { advance: 500 } });
    const after = detail.staff[0];
    expect(after.manualJson).toEqual({ bonus: 1000, advance: 500 });
    expect(after.bonus).toBe(1000);
    expect(after.advance).toBe(500);
    expect(after.deductionTotal).toBe(before.deductionTotal + 500);
    expect(after.netPay).toBe(before.netPay - 500);
    expect(detail.days).toHaveLength(3);
    expect(detail.fileSha256).not.toBe(before.id && h.runs.get(id)!.fileSha256 === undefined);
    expect(h.files.write).toHaveBeenCalledTimes(3); // 2 runs + 1 regenerate

    await expect(h.service.updateManual(id, { 王五: { bonus: 1 } })).rejects.toBeInstanceOf(BadRequestException);
    await expect(h.service.updateManual(id, { 張三: { wage: 1 } as never })).rejects.toBeInstanceOf(BadRequestException);
    await expect(h.service.updateManual(id, { 張三: { bonus: 'x' } as never })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('finalize locks the run against further manual edits and repeated finalize', async () => {
    const h = harness();
    const { runs } = await h.service.createRuns({ start: '2026-06-01', end: '2026-06-03', variant: 'official' }, 7);
    const id = runs[0].id;
    const finalized = await h.service.finalize(id, 9);
    expect(finalized).toMatchObject({ status: 'final', finalizedBy: 9 });
    expect(finalized.finalizedAt).toBeInstanceOf(Date);
    await expect(h.service.finalize(id, 9)).rejects.toBeInstanceOf(ConflictException);
    await expect(h.service.updateManual(id, { 李四: { bonus: 1 } })).rejects.toBeInstanceOf(ConflictException);
    await expect(h.service.findRun(999)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('getFile serves the stored workbook and rebuilds it from the snapshot when the file is gone', async () => {
    const h = harness();
    const { runs } = await h.service.createRuns({ start: '2026-06-01', end: '2026-06-03', variant: 'official' }, 7);
    const id = runs[1].id;
    const served = await h.service.getFile(id);
    expect(served.fileName).toBe(`115年6月薪資表-official-run${id}.xlsx`);
    expect(h.files.write).toHaveBeenCalledTimes(2);

    h.written.clear();
    const rebuilt = await h.service.getFile(id);
    expect(h.files.write).toHaveBeenCalledTimes(3);
    expect(rebuilt.buffer.length).toBeGreaterThan(1000);
    expect(h.runs.get(id)!.fileSha256).toBe(sha256(rebuilt.buffer));
    await expect(h.service.getFile(999)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects an inverted period before loading anything', async () => {
    const h = harness();
    await expect(
      h.service.preview({ start: '2026-06-30', end: '2026-06-01', variant: 'official' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(h.loader.load).not.toHaveBeenCalled();
  });
});
