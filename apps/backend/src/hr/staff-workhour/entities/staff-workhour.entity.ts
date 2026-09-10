import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Staff } from '../../staff/entities/staff.entity';

@Entity('staff_workhour')
@Unique('UQ_staff_workhour_staff_date', ['staffId', 'date'])
export class StaffWorkhour {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 'STAFF001' })
  @Column({ type: 'varchar', length: 10 })
  staffId: string;

  @ManyToOne(() => Staff, { eager: true })
  @JoinColumn({ name: 'staffId' })
  staff?: Staff;

  @ApiProperty({ example: '2024-06-01' })
  @Column({ type: 'date' })
  date: Date;

  @ApiProperty({ description: '工作時數（小時）', example: 8 })
  @Column({ type: 'float', default: 0 })
  work_time: number;

  @ApiProperty({ description: '已核准請假時數', example: 1 })
  @Column({ type: 'float', default: 0 })
  leave_time: number;

  @ApiProperty({ description: '加班時數', example: 1.5 })
  @Column({ type: 'float', default: 0 })
  overtime: number;

  @ApiProperty({ description: '遲到分鐘數', example: 15 })
  @Column({ type: 'int', default: 0 })
  late: number;
}
