import { Entity, PrimaryColumn, Column, OneToOne } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../auth/entities/user.entity';

@Entity('staff') // 表名為 staff
export class Staff {
  @ApiProperty({ description: '员工编号', example: 'STAFF001' })
  @PrimaryColumn({ type: 'varchar', length: 10 })
  id: string; // 員工編號

  @ApiProperty({ description: '姓名', example: '张三' })
  @Column({ type: 'varchar', length: 6 })
  name: string; // 姓名

  @ApiProperty({ description: '职称', required: false, example: '工程师' })
  @Column({ type: 'varchar', length: 8, nullable: true })
  post?: string; // 職稱（允許 NULL 值）

  @ApiProperty({ description: '工作组别', required: false, example: 'A组' })
  @Column({ type: 'varchar', length: 4, nullable: true })
  work_group?: string; // 工作組別（允許 NULL 值）

  @ApiProperty({ description: '部门', required: false, example: '技术部' })
  @Column({ type: 'varchar', length: 4, nullable: true })
  department?: string; // 部門（允許 NULL 值）

  @ApiProperty({ description: '本薪', example: 50000 })
  @Column({ type: 'int', default: 0 })
  wage: number; // 本薪

  @ApiProperty({ description: '勤务津贴', example: 5000 })
  @Column({ type: 'int', default: 0 })
  allowance: number; // 勤務津貼

  @ApiProperty({ description: '干部加给', example: 3000 })
  @Column({ type: 'int', default: 0 })
  organizer: number; // 幹部加給

  @ApiProperty({ description: '劳保', example: 2000 })
  @Column({ type: 'int', default: 0 })
  labor_insurance: number; // 勞保

  @ApiProperty({ description: '健保', example: 1500 })
  @Column({ type: 'int', default: 0 })
  health_insurance: number; // 健保

  @ApiProperty({ description: '退休提拨', example: 3000 })
  @Column({ type: 'int', default: 0 })
  pension: number; // 退休提撥

  @ApiProperty({ description: '是否为外劳', example: false })
  @Column({ type: 'tinyint', width: 1, default: 0 })
  is_foreign: boolean; // 是否為外勞（tinyint 1）

  @ApiProperty({ description: '是否参加福利会', example: true })
  @Column({ type: 'tinyint', width: 1, default: 0 })
  benifit: boolean; // 是否參加福利會（tinyint 1）

  @ApiProperty({ description: '是否需要打卡', example: true })
  @Column({ type: 'tinyint', width: 1, default: 1 })
  need_check: boolean; // 是否需要打卡（tinyint 1）

  @ApiProperty({ description: '到职日期', required: false, example: '2023-01-01' })
  @Column({ type: 'date', nullable: true })
  begain_work?: Date; // 到職日期（允許 NULL 值）

  @ApiProperty({ description: '离职日期', required: false, example: '2024-12-31' })
  @Column({ type: 'date', nullable: true })
  stop_work?: Date; // 離職日期（允許 NULL 值）

  @ApiProperty({ description: '是否需要外账', example: false })
  @Column({ type: 'tinyint', width: 1, default: 0 })
  have_fake: boolean; // 是否需要外帳（tinyint 1）

  @OneToOne(() => User, user => user.staff)
  user?: User;
}
