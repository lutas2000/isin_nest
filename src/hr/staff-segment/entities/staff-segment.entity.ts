import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Staff } from '../../staff/entities/staff.entity';

@Entity('staff_segment')
export class StaffSegment {
  @ApiProperty({ description: '段別編號', example: 1 })
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @ApiProperty({ description: '員工編號', example: 'STAFF001' })
  @Column({ type: 'varchar', length: 10 })
  staffId: string;

  @ApiProperty({ description: '開始時間', example: '08:00:00' })
  @Column({ type: 'time' })
  begain_time: string;

  @ApiProperty({ description: '結束時間', example: '17:00:00' })
  @Column({ type: 'time' })
  end_time: string;

  @ApiProperty({ description: '是否跨日', example: false })
  @Column({ type: 'tinyint', width: 1, default: 0 })
  cross_day: boolean;

  @ApiProperty({ description: '責任制', example: false })
  @Column({ type: 'tinyint', width: 1, default: 0 })
  duty: boolean;

  @ApiProperty({ description: '夜班', example: false })
  @Column({ type: 'tinyint', width: 1, default: 0 })
  night_work: boolean;

  @ApiProperty({ description: '休息時間(分)', example: 60 })
  @Column({ type: 'int', default: 0 })
  rest_time: number;

  @ApiProperty({ description: '加班休息時間(6:00)', example: 60 })
  @Column({ type: 'int', default: 60 })
  rest_time2: number;

  @ApiProperty({ description: '建立日期', example: '2024-01-01' })
  @Column({
    type: 'date',
    default: () => 'CURRENT_DATE',
  })
  create_date: Date;

  // 關聯到 Staff 實體
  @ApiProperty({ description: '關聯的員工資料', type: () => Staff })
  @ManyToOne(() => Staff, { eager: false })
  @JoinColumn({ name: 'staffId' })
  staff: Staff;
}
