import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('staff_segment')
export class StaffSegment {
  @ApiProperty({ description: '段別編號', example: 1 })
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @ApiProperty({ description: '員工姓名', example: '張三' })
  @Column({ type: 'varchar', length: 6 })
  name: string;

  @ApiProperty({ description: '開始時間', example: '08:00:00' })
  @Column({ type: 'time' })
  begain_time: string;

  @ApiProperty({ description: '結束時間', example: '17:00:00' })
  @Column({ type: 'time' })
  end_time: string;

  @ApiProperty({ description: '是否跨日', example: 0 })
  @Column({ type: 'int', default: 0 })
  cross_day: number;

  @ApiProperty({ description: '責任制', example: 0 })
  @Column({ type: 'int', default: 0 })
  duty: number;

  @ApiProperty({ description: '夜班', example: 0 })
  @Column({ type: 'int', default: 0 })
  night_work: number;

  @ApiProperty({ description: '休息時間(分)', example: 60 })
  @Column({ type: 'int', default: 0 })
  rest_time: number;

  @ApiProperty({ description: '加班休息時間(18:00)', example: 60 })
  @Column({ type: 'int', default: 60 })
  rest_time2: number;

  @ApiProperty({ description: '建立日期', example: '2024-01-01' })
  @Column({ type: 'date' })
  create_date: Date;
}
