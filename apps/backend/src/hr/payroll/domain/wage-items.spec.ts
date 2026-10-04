import { LEAVE_TYPES } from './leave-types';
import { SegmentRow, StaffMonthSummary, StaffRow } from './types';
import { calculateWageItems } from './wage-items';

const staff: StaffRow = {
  id: 'A01',
  name: '張三',
  department: '生產部',
  wage: 30000,
  allowance: 3000,
  organizer: 500,
  labor_insurance: 600,
  health_insurance: 400,
  pension: 1800,
  is_foreign: false,
  benifit: false,
  need_check: true,
  have_fake: false,
  begain_work: '2020-01-01',
  stop_work: null,
};

const segment: SegmentRow = {
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

function summary(overrides: Partial<StaffMonthSummary> & { leave?: Record<string, number> } = {}): StaffMonthSummary {
  const leaveByType: Record<string, number> = {};
  for (const type of LEAVE_TYPES) leaveByType[type] = 0;
  Object.assign(leaveByType, overrides.leave);
  return {
    name: '張三',
    workHours: 160,
    overtimeHours: 0,
    leaveHours: 0,
    lateCount: 0,
    overtime: { paidHolidayWithin8: 0, paidHolidayOver8: 0, weekdayWithin2: 0, weekdayOver2: 0 },
    leaveByType,
    daysOvertimeAtLeast: () => 0,
    paidHolidayWorkedDays: 0,
    workedDays: 20,
    ...overrides,
  };
}

describe('calculateWageItems (WageCaculate port)', () => {
  it('pays overtime from (wage + allowance) / 240 with 1 / 1.33 / 1.66 multipliers', () => {
    const items = calculateWageItems({
      staff,
      latestSegment: segment,
      variant: 'official',
      summary: summary({
        overtime: { paidHolidayWithin8: 8, paidHolidayOver8: 0, weekdayWithin2: 2, weekdayOver2: 0 },
      }),
    });
    // 137.5 × (8 + 2 × 1.33) = 1465.75
    expect(items.overtimePay).toBe(1466);
  });

  it('multiplies overtime by 1.1 and pays the night allowance for night-shift staff', () => {
    const items = calculateWageItems({
      staff,
      latestSegment: { ...segment, night_work: true },
      variant: 'official',
      summary: summary({
        overtime: { paidHolidayWithin8: 8, paidHolidayOver8: 0, weekdayWithin2: 0, weekdayOver2: 0 },
        leave: { 事假: 8 },
        workedDays: 21,
      }),
    });
    expect(items.overtimePay).toBe(1210); // 137.5 × 8 × 1.1
    expect(items.nightAllowance).toBe(2967); // 3000 × (1 − 8/720)
    expect(items.mealAllowance).toBe(1050); // 50 × 21 worked days
  });

  it('scales the full attendance bonus by leave and lateness thresholds', () => {
    const bonus = (leave: Record<string, number>, lateCount = 0) =>
      calculateWageItems({
        staff,
        latestSegment: segment,
        variant: 'official',
        summary: summary({ leave, lateCount }),
      }).fullAttendance;
    expect(bonus({})).toBe(1200);
    expect(bonus({ 病假: 2 })).toBe(840);
    expect(bonus({ 事假: 4 })).toBe(480);
    expect(bonus({ 病假: 8 })).toBe(240);
    expect(bonus({ 事假: 8 })).toBe(0);
    expect(bonus({ 病假: 16 })).toBe(0);
    expect(bonus({ 產假: 16 })).toBe(0);
    expect(bonus({ 曠職: 0.5 })).toBe(0);
    expect(bonus({}, 3)).toBe(0);
    expect(bonus({}, 2)).toBe(1200);
  });

  it('never pays the full attendance bonus to foreign staff and raises their meal threshold', () => {
    const items = calculateWageItems({
      staff: { ...staff, is_foreign: true },
      latestSegment: segment,
      variant: 'foreign',
      summary: summary({
        daysOvertimeAtLeast: (threshold) => (threshold === 6 ? 2 : 5),
        paidHolidayWorkedDays: 1,
      }),
    });
    expect(items.fullAttendance).toBe(0);
    expect(items.mealAllowance).toBe(150);
  });

  it('deducts leave at the documented rates and excludes pension from the deduction total', () => {
    const items = calculateWageItems({
      staff,
      latestSegment: segment,
      variant: 'official',
      summary: summary({ leave: { 病假: 4, 事假: 2, 曠職: 1, 公休: 8, 無薪假: 8 } }),
      manual: { bonus: 1000, advance: 2000, taxWithheld: 999 },
    });
    expect(items.sickLeave).toBe(275); // 4 × (15000 + 1500) / 240
    expect(items.personalLeave).toBe(275); // 2 × 33000 / 240
    expect(items.absenteeism).toBe(138); // 1 × 137.5 → 138
    expect(items.officialHoliday).toBe(1000); // 8 × 30000 / 240
    expect(items.unpaidLeave).toBe(1100); // 8 × 137.5
    expect(items.welfareFund).toBe(100);
    expect(items.taxWithheld).toBe(0); // official sheets have no tax row
    expect(items.additionTotal).toBe(30000 + 3000 + 0 + 0 + 1000 + 0 + 500 + 0 + 0);
    expect(items.deductionTotal).toBe(275 + 275 + 138 + 1000 + 1100 + 400 + 600 + 100 + 2000);
    expect(items.netPay).toBe(items.additionTotal - items.deductionTotal);
    expect(items.pension).toBe(1800);
  });

  it('includes tax withholding on the foreign and fake sheets only', () => {
    const foreign = calculateWageItems({
      staff,
      latestSegment: segment,
      variant: 'foreign',
      summary: summary(),
      manual: { taxWithheld: 300 },
    });
    expect(foreign.taxWithheld).toBe(300);
    expect(foreign.deductionTotal).toBe(400 + 600 + 100 + 300);
  });

  it('zeroes every attendance-based item for staff who do not punch', () => {
    const items = calculateWageItems({
      staff: { ...staff, need_check: false, benifit: true },
      latestSegment: { ...segment, night_work: true },
      variant: 'official',
      summary: summary({
        overtime: { paidHolidayWithin8: 8, paidHolidayOver8: 8, weekdayWithin2: 8, weekdayOver2: 8 },
        leave: { 病假: 8, 事假: 8, 曠職: 8, 公休: 8, 無薪假: 8 },
      }),
    });
    expect(items).toMatchObject({
      overtimePay: 0,
      fullAttendance: 0,
      nightAllowance: 0,
      mealAllowance: 0,
      sickLeave: 0,
      personalLeave: 0,
      absenteeism: 0,
      officialHoliday: 0,
      unpaidLeave: 0,
      welfareFund: 0,
    });
    expect(items.netPay).toBe(33500 - 1000);
  });
});
