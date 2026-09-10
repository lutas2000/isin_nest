export interface WorkhourManhourInput {
  start_time?: Date | null;
  end_time?: Date | null;
  work_time?: number | null;
}

export interface WorkhourLeaveInput {
  time?: number | null;
}

export interface StaffWorkhourCalculationInput {
  staffId: string;
  date: Date;
  expectedStartTime?: string;
  standardHours?: number;
  manhours: WorkhourManhourInput[];
  leaves: WorkhourLeaveInput[];
}

export interface StaffWorkhourCalculation {
  staffId: string;
  date: Date;
  work_time: number;
  leave_time: number;
  overtime: number;
  late: number;
}

export interface PayrollStaffInput {
  id: string;
  name: string;
  wage?: number;
  allowance?: number;
  organizer?: number;
  labor_insurance?: number;
  health_insurance?: number;
  pension?: number;
}

export interface PayrollWorkhourInput {
  work_time: number;
  leave_time: number;
  overtime: number;
  late: number;
}

export interface PayrollReportItem {
  staffId: string;
  staffName: string;
  grossPay: number;
  deductions: number;
  netPay: number;
  workHours: number;
  leaveHours: number;
  overtimeHours: number;
  lateMinutes: number;
}

export function calculateStaffWorkhour(
  input: StaffWorkhourCalculationInput,
): StaffWorkhourCalculation {
  const workTime = round(
    input.manhours.reduce(
      (total, manhour) =>
      total +
        (typeof manhour.work_time === 'number' && manhour.work_time > 0
          ? manhour.work_time
          : calculateIntervalHours(manhour.start_time, manhour.end_time)),
      0,
    ),
  );
  const leaveTime = round(
    input.leaves.reduce((total, leave) => total + (leave.time || 0), 0),
  );
  const standardHours = input.standardHours ?? 8;
  const overtime = round(Math.max(0, workTime - standardHours));
  const late = calculateLateMinutes(
    input.date,
    input.manhours,
    input.expectedStartTime,
  );

  return {
    staffId: input.staffId,
    date: input.date,
    work_time: workTime,
    leave_time: leaveTime,
    overtime,
    late,
  };
}

export function calculatePayroll(
  staff: PayrollStaffInput,
  workhour: PayrollWorkhourInput,
): PayrollReportItem {
  const grossPay =
    (staff.wage || 0) + (staff.allowance || 0) + (staff.organizer || 0);
  const deductions =
    (staff.labor_insurance || 0) +
    (staff.health_insurance || 0) +
    (staff.pension || 0);

  return {
    staffId: staff.id,
    staffName: staff.name,
    grossPay,
    deductions,
    netPay: grossPay - deductions,
    workHours: round(workhour.work_time || 0),
    leaveHours: round(workhour.leave_time || 0),
    overtimeHours: round(workhour.overtime || 0),
    lateMinutes: Math.max(0, Math.round(workhour.late || 0)),
  };
}

function calculateIntervalHours(
  startTime?: Date | null,
  endTime?: Date | null,
): number {
  if (!startTime || !endTime) return 0;
  return Math.max(0, (endTime.getTime() - startTime.getTime()) / 3600000);
}

function calculateLateMinutes(
  date: Date,
  manhours: WorkhourManhourInput[],
  expectedStartTime?: string,
): number {
  if (!expectedStartTime) return 0;
  const firstStart = manhours
    .map((manhour) => manhour.start_time)
    .filter((start): start is Date => start instanceof Date)
    .sort((left, right) => left.getTime() - right.getTime())[0];
  if (!firstStart) return 0;

  const [hour, minute, second = '0'] = expectedStartTime.split(':');
  const expected = new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      Number(hour),
      Number(minute),
      Number(second),
    ),
  );
  return Math.max(0, Math.round((firstStart.getTime() - expected.getTime()) / 60000));
}

function round(value: number): number {
  return Number(value.toFixed(2));
}
