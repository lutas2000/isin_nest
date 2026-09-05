import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('staff_manhour2')
export class StaffManhour2 {
  @ApiProperty({ description: '工時記錄ID', example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: '員工姓名', example: '張三' })
  @Column({ type: 'varchar', length: 5 })
  name: string;

  @Column({ type: 'timestamptz', nullable: true })
  start_time?: Date;

  @Column({ type: 'timestamptz', nullable: true })
  end_time?: Date;

  @Column({ type: 'float', default: 0 })
  work_time: number;
}
