import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { VacationType } from '../domain/types';
import { PayrollRun } from './payroll-run.entity';

/**
 * 薪資 run 內每人每日一筆，對應舊「打卡記錄」工作表的一列。
 */
@Entity('payroll_run_day')
@Index(['runId', 'name', 'date'], { unique: true })
export class PayrollRunDay {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty()
  @Column({ name: 'run_id', type: 'int' })
  runId: number;

  @ManyToOne(() => PayrollRun, (run) => run.days, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'run_id' })
  run: PayrollRun;

  @ApiProperty({ example: '張三' })
  @Column({ type: 'varchar', length: 6 })
  name: string;

  @ApiProperty({ example: '2026-06-01' })
  @Column({ type: 'date' })
  date: string;

  @ApiProperty({ enum: ['normal', 'paid', 'unpaid'] })
  @Column({ name: 'vacation_type', type: 'varchar', length: 6 })
  vacationType: VacationType;

  @ApiProperty({ description: '打卡時段文字', example: '08:00~17:00 ' })
  @Column({ name: 'segments_text', type: 'varchar', length: 255 })
  segmentsText: string;

  @ApiProperty() @Column({ type: 'double precision' }) work: number;
  @ApiProperty() @Column({ type: 'double precision' }) overtime: number;

  @ApiProperty({ example: '事假' })
  @Column({ name: 'leave_type', type: 'varchar', length: 6 })
  leaveType: string;

  @ApiProperty() @Column({ name: 'leave_hours', type: 'double precision' }) leaveHours: number;
  @ApiProperty() @Column({ type: 'smallint' }) late: 0 | 1;
  @ApiProperty() @Column({ name: 'weekday_flag', type: 'smallint' }) weekdayFlag: 0 | 1;
}
