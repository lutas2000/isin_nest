import { calculatePayroll } from './payroll';
import { pickDaySegment, pickLatestSegment, pickOldestSegment } from './segment';
import { excelRound, fixEnd, fixStart } from './rounding';
import { summarizeStaffMonth } from './month-summary';
import { DayResult, PayrollSourceData, SegmentRow, StaffRow } from './types';
import { formatMinute, toMs } from './wall-clock';

const staff = (overrides: Partial<StaffRow>): StaffRow => ({
  id: 'A01',
  name: '張三',
  department: '生產部',
  wage: 30000,
  allowance: 3000,
  organizer: 0,
  labor_insurance: 0,
  health_insurance: 0,
  pension: 0,
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

describe('rounding helpers', () => {
  const at = (time: string) => toMs(`2026-09-01 ${time}`);
  it('fixStart follows the 1–14 / 15–44 / 45+ minute rules', () => {
    expect(formatMinute(fixStart(at('08:00:30')))).toBe('08:00');
    expect(formatMinute(fixStart(at('08:14:59')))).toBe('08:00');
    expect(formatMinute(fixStart(at('08:15:00')))).toBe('08:30');
    expect(formatMinute(fixStart(at('08:44:59')))).toBe('08:30');
    expect(formatMinute(fixStart(at('08:45:00')))).toBe('09:00');
  });
  it('fixEnd follows the <20 / <50 / 50+ minute rules', () => {
    expect(formatMinute(fixEnd(at('17:19:59')))).toBe('17:00');
    expect(formatMinute(fixEnd(at('17:20:00')))).toBe('17:30');
    expect(formatMinute(fixEnd(at('17:49:59')))).toBe('17:30');
    expect(formatMinute(fixEnd(at('17:50:00')))).toBe('18:00');
  });
  it('excelRound rounds halves away from zero', () => {
    expect(excelRound(137.5)).toBe(138);
    expect(excelRound(2.4999)).toBe(2);
    expect(excelRound(-137.5)).toBe(-138);
  });
});

describe('segment pickers keep the three legacy selection rules', () => {
  const segments = [
    segment({ id: 1, create_date: '2020-01-01', duty: true, night_work: false }),
    segment({ id: 2, create_date: '2026-09-15', duty: false, night_work: true }),
  ];
  it('picks the newest segment effective on the day', () => {
    expect(pickDaySegment(segments, '張三', '2026-09-01')?.id).toBe(1);
    expect(pickDaySegment(segments, '張三', '2026-09-15')?.id).toBe(2);
    expect(pickDaySegment(segments, '李四', '2026-09-15')).toBeNull();
  });
  it('picks the newest segment regardless of date for wage flags', () => {
    expect(pickLatestSegment(segments, '張三')?.night_work).toBe(true);
  });
  it('picks the oldest segment for the daily duty flag', () => {
    expect(pickOldestSegment(segments, '張三')?.duty).toBe(true);
  });
});

describe('summarizeStaffMonth', () => {
  const day = (overrides: Partial<DayResult>): DayResult => ({
    name: '張三',
    date: '2026-09-01',
    vacationType: 'normal',
    segmentsText: '',
    work: 8,
    overtime: 0,
    leaveType: '',
    leaveHours: 0,
    late: 0,
    weekdayFlag: 1,
    ...overrides,
  });
  it('splits overtime into the four legacy buckets and sums leave per type', () => {
    const summary = summarizeStaffMonth('張三', [
      day({ overtime: 3 }),
      day({ overtime: 1, late: 1 }),
      day({ overtime: 10, weekdayFlag: 0, work: 0, vacationType: 'paid' }),
      day({ overtime: 6, weekdayFlag: 0, work: 0, vacationType: 'paid' }),
      day({ leaveType: '病假', leaveHours: 4, work: 4 }),
      day({ leaveType: '病假', leaveHours: 2, work: 6, late: 1 }),
      day({ name: '李四', overtime: 9 }),
    ]);
    expect(summary.overtime).toEqual({
      paidHolidayWithin8: 14,
      paidHolidayOver8: 2,
      weekdayWithin2: 3,
      weekdayOver2: 1,
    });
    expect(summary.leaveByType['病假']).toBe(6);
    expect(summary.lateCount).toBe(2);
    expect(summary.daysOvertimeAtLeast(3)).toBe(3);
    expect(summary.paidHolidayWorkedDays).toBe(0);
    expect(summary.workedDays).toBe(4);
  });
});

describe('calculatePayroll', () => {
  const data: PayrollSourceData = {
    period: { start: '2026-09-01', end: '2026-09-03' },
    variant: 'official',
    staff: [
      staff({}),
      staff({ id: 'A02', name: '李四', is_foreign: true }),
      staff({ id: 'A03', name: '王五', need_check: false }),
      staff({ id: 'A04', name: '趙六', stop_work: '2026-08-31' }),
      staff({ id: 'A05', name: '新人', begain_work: '2026-09-03' }),
      staff({ id: 'B01', name: '銷管', department: '銷管部' }),
    ],
    segments: [
      segment({}),
      segment({ id: 2, name: '李四' }),
      segment({ id: 3, name: '銷管' }),
      segment({ id: 4, name: '新人' }),
    ],
    manhours: [
      { name: '張三', start_time: '2026-09-01 08:00:00', end_time: '2026-09-01 17:00:00' },
      { name: '張三', start_time: '2026-09-02 08:00:00', end_time: '2026-09-02 17:00:00' },
      { name: '李四', start_time: '2026-09-01 08:00:00', end_time: '2026-09-01 20:00:00' },
      { name: '新人', start_time: '2026-09-03 08:00:00', end_time: '2026-09-03 17:00:00' },
    ],
    leaves: [
      { name: '張三', type: '防疫假', start_time: '2026-09-03 08:00:00', end_time: '2026-09-03 17:00:00' },
    ],
    vacations: { '2026-09-02': 1 },
  };

  it('builds one department result per default department in the legacy order', () => {
    const result = calculatePayroll(data);
    expect(result.departments.map((d) => d.department)).toEqual(['銷管部', '生產部']);
    const production = result.departments[1];
    // sorted by is_foreign then name; the wage sheet also puts need_check first
    expect(production.hourSheetNames).toEqual(['張三', '新人', '李四']);
    expect(production.wageSheetNames).toEqual(['張三', '新人', '李四', '王五']);
  });

  it('skips departed staff entirely and new staff before their start date', () => {
    const production = calculatePayroll(data).departments[1];
    expect(production.days.some((d) => d.name === '趙六')).toBe(false);
    expect(production.days.filter((d) => d.name === '新人').map((d) => d.date)).toEqual(['2026-09-03']);
    expect(production.days.filter((d) => d.name === '張三').map((d) => d.date)).toEqual([
      '2026-09-01',
      '2026-09-02',
      '2026-09-03',
    ]);
  });

  it('maps removed leave types to 無薪假 with a warning and feeds the day results into wages', () => {
    const result = calculatePayroll(data);
    expect(result.warnings).toContain('張三 2026-09-03 08:00:00 假別「防疫假」已移除，改以「無薪假」計算');
    const production = result.departments[1];
    const sep3 = production.days.find((d) => d.name === '張三' && d.date === '2026-09-03');
    expect(sep3).toMatchObject({ leaveType: '無薪假', leaveHours: 8, work: 0 });
    const sep2 = production.days.find((d) => d.name === '張三' && d.date === '2026-09-02');
    expect(sep2).toMatchObject({ vacationType: 'paid', overtime: 8, work: 0 });
    const wage = production.wages.find((w) => w.name === '張三');
    expect(wage?.overtimePay).toBe(1100); // 137.5 × 8
    expect(wage?.unpaidLeave).toBe(1100);
    expect(wage?.fullAttendance).toBe(1200);
  });

  it('honours explicit department and manual field options', () => {
    const result = calculatePayroll(data, {
      departments: ['生產部'],
      manual: { 張三: { bonus: 500 } },
    });
    expect(result.departments).toHaveLength(1);
    expect(result.departments[0].wages[0].bonus).toBe(500);
  });
});
