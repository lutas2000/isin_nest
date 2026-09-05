import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('staff_leave')
export class StaffLeave {
  @ApiProperty({ description: '請假記錄編號', example: 1 })
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @ApiProperty({ description: '員工姓名', example: '張三' })
  @Column({ type: 'varchar', length: 6 })
  name: string;

  @ApiProperty({ description: '假別', example: '特休' })
  @Column({ type: 'varchar', length: 4 })
  type: string;

  @ApiProperty({ description: '開始時間', example: '2023-12-01 09:00:00' })
  @Column({ type: 'timestamptz' })
  start_time: Date;

  @ApiProperty({ description: '結束時間', example: '2023-12-01 18:00:00' })
  @Column({ type: 'timestamptz' })
  end_time: Date;

  @ApiProperty({ description: '請假時數', example: 8.0 })
  @Column({ type: 'float', default: 0 })
  time: number;

  @ApiProperty({ description: '簽核人', example: '王五' })
  @Column({ type: 'varchar', length: 6 })
  verify: string;
}
