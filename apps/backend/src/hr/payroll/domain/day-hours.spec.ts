import { calculateDayHours, DayHoursInput } from './day-hours';
import { SegmentRow } from './types';

const daySegment: SegmentRow = {
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
};

const nightSegment: SegmentRow = {
  ...daySegment,
  id: 2,
  begain_time: '20:00:00',
  end_time: '05:00:00',
  cross_day: true,
  night_work: true,
};

function run(overrides: Partial<DayHoursInput>) {
  return calculateDayHours({
    name: '張三',
    date: '2026-09-01',
    vacationType: 'normal',
    segment: daySegment,
    oldestSegmentDuty: false,
    isForeign: false,
    manhours: [],
    leaves: [],
    ...overrides,
  });
}

const punch = (start: string, end: string | null) => ({
  name: '張三',
  start_time: `2026-09-01 ${start}`,
  end_time: end ? `${end.length > 8 ? end : `2026-09-01 ${end}`}` : null,
});

describe('calculateDayHours (HourPage port)', () => {
  it('counts a full weekday as 8 hours after clamping early arrival and subtracting lunch', () => {
    const { result, warnings } = run({ manhours: [punch('07:58:00', '17:02:00')] });
    expect(warnings).toEqual([]);
    expect(result).toMatchObject({
      work: 8,
      overtime: 0,
      leaveType: '',
      leaveHours: 0,
      late: 0,
      weekdayFlag: 1,
      segmentsText: '07:58~17:02 ',
    });
  });

  it('flags late only between 3 and 14 minutes after the default start', () => {
    expect(run({ manhours: [punch('08:02:00', '17:00:00')] }).result.late).toBe(0);
    expect(run({ manhours: [punch('08:03:00', '17:00:00')] }).result.late).toBe(1);
    expect(run({ manhours: [punch('08:14:59', '17:00:00')] }).result.late).toBe(1);
    const fifteen = run({ manhours: [punch('08:15:00', '17:00:00')] }).result;
    expect(fifteen.late).toBe(0);
    // 08:15 rounds to 08:30, so the day is 7.5 hours and 0.5 hour counts as absenteeism
    expect(fifteen).toMatchObject({ work: 7.5, leaveType: '曠職', leaveHours: 0.5 });
  });

  it('rounds the end punch and splits overtime after 8 hours, subtracting the dinner break', () => {
    const { result } = run({ manhours: [punch('08:00:00', '20:10:00')] });
    expect(result).toMatchObject({ work: 8, overtime: 2 });
  });

  it('treats every paid-holiday hour as overtime with a fixed 1 hour lunch (0 for foreign staff)', () => {
    const local = run({ vacationType: 'paid', manhours: [punch('08:00:00', '17:00:00')] }).result;
    expect(local).toMatchObject({ work: 0, overtime: 8, weekdayFlag: 0 });
    const foreign = run({
      vacationType: 'paid',
      isForeign: true,
      manhours: [punch('08:00:00', '17:00:00')],
    }).result;
    expect(foreign).toMatchObject({ work: 0, overtime: 9 });
  });

  it('gives duty staff a flat 8 hours of overtime on a worked paid holiday and none on weekdays', () => {
    const holiday = run({
      vacationType: 'paid',
      oldestSegmentDuty: true,
      manhours: [punch('08:00:00', '10:30:00')],
    }).result;
    expect(holiday).toMatchObject({ work: 0, overtime: 8 });
    const weekday = run({
      oldestSegmentDuty: true,
      manhours: [punch('08:00:00', '20:00:00')],
    }).result;
    expect(weekday).toMatchObject({ work: 10, overtime: 0 });
  });

  it('writes 無薪假 for the missing hours on an unpaid holiday without a leave record', () => {
    const idle = run({ vacationType: 'unpaid' }).result;
    expect(idle).toMatchObject({ work: 0, leaveType: '無薪假', leaveHours: 8, weekdayFlag: 1 });
    const partial = run({ vacationType: 'unpaid', manhours: [punch('08:00:00', '12:00:00')] }).result;
    expect(partial).toMatchObject({ work: 4, leaveType: '無薪假', leaveHours: 4 });
  });

  it('keeps the recorded leave type on an unpaid holiday but reports the full non-working hours', () => {
    const { result } = run({
      vacationType: 'unpaid',
      leaves: [{ name: '張三', type: '事假', start_time: '2026-09-01 08:00:00', end_time: '2026-09-01 12:00:00' }],
    });
    expect(result).toMatchObject({ leaveType: '事假', leaveHours: 8 });
  });

  it('shifts the default start when leave begins at the segment start, affecting lateness and clamping', () => {
    const { result } = run({
      leaves: [{ name: '張三', type: '事假', start_time: '2026-09-01 08:00:00', end_time: '2026-09-01 10:00:00' }],
      manhours: [punch('10:05:00', '17:00:00')],
    });
    expect(result).toMatchObject({ work: 6, overtime: 0, leaveType: '事假', leaveHours: 2, late: 1 });
  });

  it('reduces absenteeism by leave hours and caps leave at 8 hours', () => {
    const half = run({
      leaves: [{ name: '張三', type: '病假', start_time: '2026-09-01 13:00:00', end_time: '2026-09-01 17:00:00' }],
      manhours: [punch('08:00:00', '12:00:00')],
    }).result;
    expect(half).toMatchObject({ work: 4, leaveType: '病假', leaveHours: 4 });

    const capped = run({
      leaves: [{ name: '張三', type: '特休', start_time: '2026-09-01 08:00:00', end_time: '2026-09-01 20:00:00' }],
    }).result;
    expect(capped).toMatchObject({ work: 0, leaveType: '特休', leaveHours: 8 });
  });

  it('overrides the leave column with 曠職 when absenteeism remains', () => {
    const { result } = run({
      leaves: [{ name: '張三', type: '事假', start_time: '2026-09-01 15:00:00', end_time: '2026-09-01 17:00:00' }],
      manhours: [punch('08:00:00', '12:00:00')],
    });
    // 4 worked + 2 leave → 2 hours absenteeism
    expect(result).toMatchObject({ work: 4, leaveType: '曠職', leaveHours: 2 });
  });

  it('skips an interval without an end punch and reports a warning', () => {
    const { result, warnings } = run({ manhours: [punch('08:00:00', null)] });
    expect(warnings).toEqual(['張三 2026-09-01 缺少下班資料，該區間未計入']);
    expect(result).toMatchObject({ work: 0, leaveType: '曠職', leaveHours: 8, segmentsText: '08:00~ ' });
  });

  it('lets night shifts earn overtime for early arrival across midnight', () => {
    const { result } = run({
      segment: nightSegment,
      manhours: [punch('19:30:00', '2026-09-02 05:00:00')],
    });
    expect(result).toMatchObject({ work: 8, overtime: 1.5, late: 0 });
  });

  it('sums multiple intervals and subtracts each break only when the interval spans it', () => {
    const { result } = run({
      manhours: [punch('08:00:00', '12:00:00'), punch('13:00:00', '17:00:00'), punch('18:00:00', '21:00:00')],
    });
    // 4 + 4 + 3 (18:00 interval starts at the break start, so the break is subtracted) = 10
    expect(result).toMatchObject({ work: 8, overtime: 2 });
  });
});
