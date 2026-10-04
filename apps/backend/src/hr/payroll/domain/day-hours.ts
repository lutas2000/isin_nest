import {
  DayResult,
  LeaveRow,
  ManhourRow,
  SegmentRow,
  VacationType,
} from './types';
import { fixEnd, fixStart, halfHourFloorHours } from './rounding';
import {
  DAY_MS,
  MINUTE_MS,
  addMinutes,
  compareTime,
  dateToMs,
  formatMinute,
  hourOfDay,
  toMs,
  withTime,
} from './wall-clock';

/**
 * 單人單日工時計算。移植自 Java `HourPage` 與 `ManHourReport.writeHour`，
 * 執行順序與副作用（例如請假會改寫預設上班時間）都照舊保留。
 */

export interface DayHoursInput {
  name: string;
  date: string;
  vacationType: VacationType;
  /** 當日生效段別（pickDaySegment）。 */
  segment: SegmentRow;
  /** 責任制旗標，取自最舊段別（pickOldestSegment）。 */
  oldestSegmentDuty: boolean;
  isForeign: boolean;
  /** 當日工時區間，已依 start_time 排序。 */
  manhours: ManhourRow[];
  /** 當日請假，已依 start_time 排序。 */
  leaves: LeaveRow[];
}

export interface DayHoursOutput {
  result: DayResult;
  warnings: string[];
}

const NORMAL_WORK_HOURS = 8;

class HourPage {
  late = false;
  overtime = 0;
  workTime = 0;
  absenteeism = 0;
  leavingTime = 0;
  rest1: number;
  rest2: number;
  restTime1: [number, number];
  restTime2: [number, number];
  defaultStartTime: number;
  defaultEndTime: number;

  constructor(
    private readonly date: string,
    private readonly segment: SegmentRow,
    private readonly vacationType: VacationType,
    private readonly isForeign: boolean,
  ) {
    this.defaultStartTime = dateToMs(date, segment.begain_time);
    this.defaultEndTime = dateToMs(date, segment.end_time);
    if (segment.cross_day) this.defaultEndTime += DAY_MS;
    this.rest1 = segment.rest_time / 60;
    this.rest2 = segment.rest_time2 / 60;
    const noon = withTime(this.defaultStartTime, 12, 0);
    this.restTime1 = [noon, addMinutes(noon, segment.rest_time)];
    const evening = withTime(this.defaultStartTime, 18, 0);
    this.restTime2 = [evening, addMinutes(evening, segment.rest_time2)];
  }

  /** 遲到：僅平日，上班打卡晚於預設上班 3 到 14 分鐘。 */
  startWork(arriveMs: number): void {
    if (this.vacationType !== 'normal') return;
    const minute = compareTime(this.defaultStartTime, arriveMs, MINUTE_MS);
    if (minute >= 3 && minute < 15) this.late = true;
  }

  work(arriveMs: number, leaveMs: number): void {
    if (this.vacationType === 'paid') {
      this.workOnHoliday(arriveMs, leaveMs);
      return;
    }
    let userStart = arriveMs;
    // 只有夜班計算提前加班
    if (hourOfDay(this.defaultStartTime) < 12 && userStart < this.defaultStartTime) {
      userStart = this.defaultStartTime;
    }
    userStart = fixStart(userStart);
    const userEnd = fixEnd(leaveMs);
    let workingTime = halfHourFloorHours(userStart, userEnd);
    workingTime -= this.subtractRest(userStart, userEnd);
    this.workTime += workingTime;
  }

  private workOnHoliday(arriveMs: number, leaveMs: number): void {
    if (this.isForeign) {
      this.rest1 = 0;
      this.rest2 = 0;
    } else {
      this.rest1 = 1;
      this.rest2 = 0;
    }
    const start = fixStart(arriveMs);
    const end = fixEnd(leaveMs);
    let workingTime = halfHourFloorHours(start, end);
    workingTime -= this.subtractRest(start, end);
    this.workTime += workingTime;
  }

  leave(startMs: number, endMs: number): void {
    // 如果請假時間等於預設工作開始時間，當日預設上班改為請假結束
    if (this.defaultStartTime === startMs) this.defaultStartTime = endMs;
    this.leavingTime += halfHourFloorHours(startMs, endMs);
    this.leavingTime -= this.subtractRest(startMs, endMs);
    if (this.leavingTime > 8) this.leavingTime = 8;
  }

  private subtractRest(startMs: number, endMs: number): number {
    let rest = 0;
    if (startMs <= this.restTime1[0] && endMs >= this.restTime1[1]) rest += this.rest1;
    if (startMs <= this.restTime2[0] && endMs >= this.restTime2[1]) rest += this.rest2;
    return rest;
  }

  calculate(isDuty: boolean): void {
    if (this.vacationType === 'normal') {
      if (this.workTime > NORMAL_WORK_HOURS) {
        // 責任制假日加班以一日記（舊程式在此直接 return，跳過後續扣減）
        if (isDuty) return;
        this.overtime += this.workTime - NORMAL_WORK_HOURS;
        this.workTime = NORMAL_WORK_HOURS;
      } else if (this.workTime < NORMAL_WORK_HOURS) {
        this.absenteeism = NORMAL_WORK_HOURS - this.workTime;
      }
    } else if (this.vacationType === 'unpaid') {
      // 無薪假不計曠職
      if (this.workTime > NORMAL_WORK_HOURS) {
        if (isDuty) return;
        this.overtime += this.workTime - NORMAL_WORK_HOURS;
        this.workTime = NORMAL_WORK_HOURS;
      }
    } else if (isDuty) {
      // 責任制平日不計加班；有薪假有上班以一日 8 小時記
      if (this.workTime > 1) this.overtime = 8;
      this.workTime = 0;
    } else {
      this.overtime += this.workTime;
      this.workTime = 0;
    }
    this.absenteeism -= this.leavingTime;
    if (this.absenteeism < 0) this.absenteeism = 0;
    if (this.overtime < 0) this.overtime = 0;
  }
}

export function calculateDayHours(input: DayHoursInput): DayHoursOutput {
  const warnings: string[] = [];
  const page = new HourPage(input.date, input.segment, input.vacationType, input.isForeign);

  // writeLeave：假別欄顯示最後一筆請假的假別，時數為累計值
  let leaveType = '';
  let leaveHours = 0;
  for (const leave of input.leaves) {
    page.leave(toMs(leave.start_time), toMs(leave.end_time));
    leaveType = leave.type;
    leaveHours = page.leavingTime;
  }

  // caculateHour
  if (input.manhours.length > 0) page.startWork(toMs(input.manhours[0].start_time));
  for (const manhour of input.manhours) {
    if (!manhour.end_time) {
      warnings.push(`${input.name} ${input.date} 缺少下班資料，該區間未計入`);
      continue;
    }
    page.work(toMs(manhour.start_time), toMs(manhour.end_time));
  }
  page.calculate(input.oldestSegmentDuty);

  // writeNoWage：無薪假當天不足 8 小時的部分
  if (input.vacationType === 'unpaid') {
    const totalNonWorkTime = 8 - page.workTime;
    if (totalNonWorkTime > 0) {
      if (page.leavingTime === 0) leaveType = '無薪假';
      leaveHours = totalNonWorkTime;
    }
  }

  // writeDetailHour：曠職覆寫假別欄
  if (page.absenteeism > 0) {
    leaveType = '曠職';
    leaveHours = page.absenteeism;
  }

  const segmentsText = input.manhours
    .map((row) => `${formatMinute(toMs(row.start_time))}~${row.end_time ? formatMinute(toMs(row.end_time)) : ''} `)
    .join('');

  return {
    warnings,
    result: {
      name: input.name,
      date: input.date,
      vacationType: input.vacationType,
      segmentsText,
      work: page.workTime,
      overtime: page.overtime,
      leaveType,
      leaveHours,
      late: page.late ? 1 : 0,
      weekdayFlag: input.vacationType === 'paid' ? 0 : 1,
    },
  };
}
