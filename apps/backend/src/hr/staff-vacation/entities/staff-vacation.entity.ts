import { Entity, PrimaryColumn, Column } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('staff_vacation')
export class StaffVacation {
  @ApiProperty({ description: '日期', example: '2024-01-01' })
  @PrimaryColumn({ type: 'date' })
  date: Date;

  @ApiProperty({ description: '是否支薪', example: true })
  @Column({ type: 'boolean', default: false })
  pay: boolean;

  @ApiProperty({ description: '假別', example: '國定假日' })
  @Column({
    type: 'varchar',
    length: 50,
  })
  type: string;
}

