import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('staff_workhour')
export class StaffWorkhour {
  @ApiProperty({ description: '工時彙總ID', example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: '員工姓名', example: '張三' })
  @Column({ type: 'varchar', length: 6 })
  name: string;

  @ApiProperty({ description: '日期', example: '2024-01-01' })
  @Column({ type: 'date' })
  date: Date;

  @ApiProperty({ description: '上班時數', example: 8.0 })
  @Column({ type: 'float' })
  work_time: number;

  @ApiProperty({ description: '請假時數', example: 0 })
  @Column({ type: 'float' })
  leave_time: number;

  @ApiProperty({ description: '加班時數', example: 2.0 })
  @Column({ type: 'float' })
  overtime: number;

  @ApiProperty({ description: '遲到分鐘', example: 0 })
  @Column({ type: 'int' })
  late: number;
}
