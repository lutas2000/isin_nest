import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { PayrollSourceData, PayrollVariant } from '../domain/types';
import { PayrollRunStaff } from './payroll-run-staff.entity';
import { PayrollRunDay } from './payroll-run-day.entity';

export type PayrollRunStatus = 'draft' | 'final';
export type PayrollRunSource = 'mariadb' | 'postgres';

/**
 * 一次薪資產出的 snapshot。一個部門一筆，對應舊報表的一個工作表組。
 * `final` 之後不可再改，永久保留（2026-10-04 決議）。
 */
@Entity('payroll_run')
@Index(['periodStart', 'variant', 'department'])
export class PayrollRun {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: '2026-06-01' })
  @Column({ name: 'period_start', type: 'date' })
  periodStart: string;

  @ApiProperty({ example: '2026-06-30' })
  @Column({ name: 'period_end', type: 'date' })
  periodEnd: string;

  @ApiProperty({ enum: ['official', 'foreign', 'fake'] })
  @Column({ type: 'varchar', length: 10 })
  variant: PayrollVariant;

  @ApiProperty({ example: '生產部' })
  @Column({ type: 'varchar', length: 4 })
  department: string;

  @ApiProperty({ enum: ['mariadb', 'postgres'] })
  @Column({ type: 'varchar', length: 10 })
  source: PayrollRunSource;

  @ApiProperty({ enum: ['draft', 'final'] })
  @Column({ type: 'varchar', length: 10, default: 'draft' })
  status: PayrollRunStatus;

  /** 完整計算輸入，重算與稽核用。API 回應預設不帶。 */
  @Column({ name: 'input_json', type: 'jsonb', select: false })
  inputJson: PayrollSourceData;

  @ApiProperty({ type: [String] })
  @Column({ name: 'warnings_json', type: 'jsonb', default: () => "'[]'" })
  warningsJson: string[];

  @ApiProperty({ required: false, nullable: true })
  @Column({ name: 'file_path', type: 'varchar', length: 255, nullable: true })
  filePath: string | null;

  @ApiProperty({ required: false, nullable: true })
  @Column({ name: 'file_sha256', type: 'varchar', length: 64, nullable: true })
  fileSha256: string | null;

  @ApiProperty({ description: '建立者 users.id', required: false, nullable: true })
  @Column({ name: 'created_by', type: 'int', nullable: true })
  createdBy: number | null;

  @ApiProperty({ description: '定稿者 users.id', required: false, nullable: true })
  @Column({ name: 'finalized_by', type: 'int', nullable: true })
  finalizedBy: number | null;

  @ApiProperty({ required: false, nullable: true })
  @Column({ name: 'finalized_at', type: 'timestamptz', nullable: true })
  finalizedAt: Date | null;

  @ApiProperty()
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => PayrollRunStaff, (row) => row.run, { cascade: ['insert'] })
  staff: PayrollRunStaff[];

  @OneToMany(() => PayrollRunDay, (row) => row.run, { cascade: ['insert'] })
  days: PayrollRunDay[];
}
