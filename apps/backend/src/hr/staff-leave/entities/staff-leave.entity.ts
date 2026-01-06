import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Staff } from '../../staff/entities/staff.entity';

@Entity('staff_leave') // 表名為 staff_leave
export class StaffLeave {
  @ApiProperty({ description: '請假記錄編號', example: 1 })
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number; // 請假記錄編號

  @ApiProperty({ description: '員工ID', example: 'STAFF001' })
  @Column({ 
    type: 'varchar',
    length: 10,
    charset: 'utf8mb4',
    collation: 'utf8mb4_unicode_ci'
  })
  staff_id: string; // 員工ID

  @ApiProperty({ description: '員工資料', type: () => Staff, required: false })
  @ManyToOne(() => Staff, { eager: true, nullable: true })
  @JoinColumn({ name: 'staff_id' })
  staff?: Staff; // 員工關聯

  @ApiProperty({ description: '請假類型', example: '特休' })
  @Column({
    type: 'varchar',
    length: 20,
    charset: 'utf8mb4',
    collation: 'utf8mb4_unicode_ci',
  })
  type: string; // 請假類型

  @ApiProperty({
    description: '開始時間',
    example: '2023-12-01 09:00:00',
  })
  @Column({ type: 'datetime' })
  start_time: Date; // 開始時間

  @ApiProperty({
    description: '結束時間',
    example: '2023-12-01 18:00:00',
  })
  @Column({ type: 'datetime' })
  end_time: Date; // 結束時間

  @ApiProperty({ description: '請假時數', example: 8.0 })
  @Column({ type: 'float', default: 0, comment: '時數' })
  time: number; // 時數

  @ApiProperty({
    description: '審核主管ID',
    example: 'STAFF002',
    required: false,
  })
  @Column({ type: 'varchar', length: 10, nullable: true })
  verify_by_staff_id: string; // 審核主管ID

  @ApiProperty({
    description: '審核主管資料',
    type: () => Staff,
    required: false,
  })
  @ManyToOne(() => Staff, { eager: true, nullable: true })
  @JoinColumn({ name: 'verify_by_staff_id' })
  verifyByStaff?: Staff; // 審核主管關聯
}
