import {
  Entity,
  PrimaryColumn,
  Column,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../../auth/entities/user.entity';

@Entity('staff') // 表名為 staff
export class Staff {
  @ApiProperty({ description: '員工編號', example: 'STAFF001' })
  @PrimaryColumn({
    type: 'varchar',
    length: 10,
    charset: 'utf8mb4',
    collation: 'utf8mb4_unicode_ci',
  })
  id: string; // 員工編號

  @ApiProperty({ description: '關聯的用戶ID', required: false, example: 1 })
  @Column({ nullable: true })
  userId?: number; // 關聯的用戶 ID

  @ApiProperty({ description: '姓名', example: '張三' })
  @Column({
    type: 'varchar',
    length: 50,
    charset: 'utf8mb4',
    collation: 'utf8mb4_unicode_ci',
  })
  name: string; // 姓名

  @ApiProperty({ description: '職稱', required: false, example: '工程師' })
  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    charset: 'utf8mb4',
    collation: 'utf8mb4_unicode_ci',
  })
  post?: string; // 職稱（允許 NULL 值）

  @ApiProperty({ description: '工作组别', required: false, example: 'A组' })
  @Column({
    type: 'varchar',
    length: 20,
    nullable: true,
    charset: 'utf8mb4',
    collation: 'utf8mb4_unicode_ci',
  })
  work_group?: string; // 工作組別（允許 NULL 值）

  @ApiProperty({ description: '部門', required: false, example: '技術部' })
  @Column({
    type: 'varchar',
    length: 30,
    nullable: true,
    charset: 'utf8mb4',
    collation: 'utf8mb4_unicode_ci',
  })
  department?: string; // 部門（允許 NULL 值）

  @ApiProperty({ description: '本薪', required: false, example: 50000 })
  @Column({ type: 'int', default: 0 })
  wage: number; // 本薪

  @ApiProperty({ description: '勤務津貼', required: false, example: 5000 })
  @Column({ type: 'int', default: 0 })
  allowance: number; // 勤務津貼

  @ApiProperty({ description: '幹部加給', required: false, example: 3000 })
  @Column({ type: 'int', default: 0 })
  organizer: number; // 幹部加給

  @ApiProperty({ description: '勞保', required: false, example: 2000 })
  @Column({ type: 'int', default: 0 })
  labor_insurance: number; // 勞保

  @ApiProperty({ description: '健保', required: false, example: 1500 })
  @Column({ type: 'int', default: 0 })
  health_insurance: number; // 健保

  @ApiProperty({ description: '退休提撥', required: false, example: 3000 })
  @Column({ type: 'int', default: 0 })
  pension: number; // 退休提撥

  @ApiProperty({ description: '是否為外勞', example: false })
  @Column({ type: 'tinyint', width: 1, default: 0 })
  is_foreign: boolean; // 是否為外勞（tinyint 1）

  @ApiProperty({ description: '是否參加福委會', example: true })
  @Column({ type: 'tinyint', width: 1, default: 0 })
  benifit: boolean; // 是否參加福利會（tinyint 1）

  @ApiProperty({ description: '是否需要打卡', example: true })
  @Column({ type: 'tinyint', width: 1, default: 1 })
  need_check: boolean; // 是否需要打卡（tinyint 1）

  @ApiProperty({
    description: '到職日期',
    required: false,
    example: '2023-01-01',
  })
  @Column({ type: 'date', nullable: true })
  begain_work?: Date; // 到職日期（允許 NULL 值）

  @ApiProperty({
    description: '離職日期',
    required: false,
    example: '2024-12-31',
  })
  @Column({ type: 'date', nullable: true })
  stop_work?: Date; // 離職日期（允許 NULL 值）

  @ApiProperty({ description: '是否需要外帳', example: false })
  @Column({ type: 'tinyint', width: 1, default: 0 })
  have_fake: boolean; // 是否需要外帳（tinyint 1）

  @OneToOne(() => User, (user) => user.staff, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user?: User;
}
