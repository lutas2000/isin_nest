import { PrimaryGeneratedColumn, Column } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

export abstract class BaseManhour {
  @ApiProperty({ description: '工時記錄ID', example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: '員工姓名', example: '張三' })
  @Column({ type: 'varchar', length: 6 })
  name: string;

  @ApiProperty({
    description: '開始時間',
    required: false,
    example: '2024-01-01 09:00:00',
  })
  @Column({ type: 'timestamptz', nullable: true })
  start_time?: Date;

  @ApiProperty({
    description: '結束時間',
    required: false,
    example: '2024-01-01 18:00:00',
  })
  @Column({ type: 'timestamptz', nullable: true })
  end_time?: Date;

  @ApiProperty({ description: '上班時間(小時)', example: 8.5 })
  @Column({ type: 'float', default: 0 })
  work_time: number;

  @ApiProperty({ description: '日期', required: false, example: '2024-01-01' })
  @Column({ type: 'date', nullable: true })
  day?: Date;
}
