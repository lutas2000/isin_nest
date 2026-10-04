import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { ManualWageFields, OvertimeBuckets } from '../domain/types';
import { PayrollRun } from './payroll-run.entity';

/**
 * 薪資 run 內每人一筆：月彙總、四桶加班、各假別時數與全部薪資項目。
 * 金額欄位都是後端四捨五入後的整數，與舊 Excel 顯示值相同。
 */
@Entity('payroll_run_staff')
@Index(['runId', 'name'], { unique: true })
export class PayrollRunStaff {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty()
  @Column({ name: 'run_id', type: 'int' })
  runId: number;

  @ManyToOne(() => PayrollRun, (run) => run.staff, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'run_id' })
  run: PayrollRun;

  @ApiProperty({ example: 'A12' })
  @Column({ name: 'staff_id', type: 'varchar', length: 10 })
  staffId: string;

  @ApiProperty({ example: '張三' })
  @Column({ type: 'varchar', length: 6 })
  name: string;

  @ApiProperty()
  @Column({ name: 'is_foreign', type: 'boolean' })
  isForeign: boolean;

  @ApiProperty({ description: '是否列入打卡記錄表並計算加班' })
  @Column({ name: 'need_check', type: 'boolean' })
  needCheck: boolean;

  @ApiProperty({ description: '薪資表順序，從 0 起' })
  @Column({ name: 'wage_order', type: 'int' })
  wageOrder: number;

  @ApiProperty({ description: '打卡記錄表順序；未列入時為 null', nullable: true })
  @Column({ name: 'hour_order', type: 'int', nullable: true })
  hourOrder: number | null;

  // --- 月彙總 ---
  @ApiProperty() @Column({ name: 'work_hours', type: 'double precision' }) workHours: number;
  @ApiProperty() @Column({ name: 'overtime_hours', type: 'double precision' }) overtimeHours: number;
  @ApiProperty() @Column({ name: 'leave_hours', type: 'double precision' }) leaveHours: number;
  @ApiProperty() @Column({ name: 'late_count', type: 'int' }) lateCount: number;
  @ApiProperty() @Column({ name: 'paid_holiday_worked_days', type: 'int' }) paidHolidayWorkedDays: number;
  @ApiProperty() @Column({ name: 'worked_days', type: 'int' }) workedDays: number;

  @ApiProperty({ description: '四桶加班時數' })
  @Column({ name: 'overtime_json', type: 'jsonb' })
  overtimeJson: OvertimeBuckets;

  @ApiProperty({ description: '假別 → 時數' })
  @Column({ name: 'leave_by_type_json', type: 'jsonb' })
  leaveByTypeJson: Record<string, number>;

  @ApiProperty({ description: '前端輸入的手動欄位' })
  @Column({ name: 'manual_json', type: 'jsonb', default: () => "'{}'" })
  manualJson: Partial<ManualWageFields>;

  // --- 薪資項目（WageItems） ---
  @ApiProperty() @Column({ name: 'base_salary', type: 'int' }) baseSalary: number;
  @ApiProperty() @Column({ type: 'int' }) allowance: number;
  @ApiProperty() @Column({ name: 'overtime_pay', type: 'int' }) overtimePay: number;
  @ApiProperty() @Column({ name: 'full_attendance', type: 'int' }) fullAttendance: number;
  @ApiProperty() @Column({ type: 'int' }) bonus: number;
  @ApiProperty() @Column({ name: 'annual_leave_add', type: 'int' }) annualLeaveAdd: number;
  @ApiProperty() @Column({ type: 'int' }) organizer: number;
  @ApiProperty() @Column({ name: 'night_allowance', type: 'int' }) nightAllowance: number;
  @ApiProperty() @Column({ name: 'meal_allowance', type: 'int' }) mealAllowance: number;
  @ApiProperty() @Column({ name: 'addition_total', type: 'int' }) additionTotal: number;
  @ApiProperty() @Column({ name: 'sick_leave', type: 'int' }) sickLeave: number;
  @ApiProperty() @Column({ name: 'personal_leave', type: 'int' }) personalLeave: number;
  @ApiProperty() @Column({ type: 'int' }) absenteeism: number;
  @ApiProperty() @Column({ name: 'official_holiday', type: 'int' }) officialHoliday: number;
  @ApiProperty() @Column({ name: 'annual_leave_deduct', type: 'int' }) annualLeaveDeduct: number;
  @ApiProperty() @Column({ name: 'unpaid_leave', type: 'int' }) unpaidLeave: number;
  @ApiProperty() @Column({ name: 'health_insurance', type: 'int' }) healthInsurance: number;
  @ApiProperty() @Column({ name: 'labor_insurance', type: 'int' }) laborInsurance: number;
  @ApiProperty() @Column({ name: 'welfare_fund', type: 'int' }) welfareFund: number;
  @ApiProperty() @Column({ type: 'int' }) advance: number;
  @ApiProperty() @Column({ name: 'tax_withheld', type: 'int' }) taxWithheld: number;
  @ApiProperty() @Column({ name: 'other_deduction', type: 'int' }) otherDeduction: number;
  @ApiProperty() @Column({ name: 'deduction_total', type: 'int' }) deductionTotal: number;
  @ApiProperty() @Column({ type: 'int' }) pension: number;
  @ApiProperty() @Column({ name: 'net_pay', type: 'int' }) netPay: number;
}
