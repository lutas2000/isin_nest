import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Staff } from '../../staff/entities/staff.entity';

@Entity('attend_record')
export class AttendRecord {
  @ApiProperty({ description: '出勤記錄ID', example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: '員工編號', example: 'STAFF001' })
  @Column({ 
    name: 'staff_id',
    type: 'varchar',
    length: 10,
  })
  staffId: string;

  @ApiProperty({ description: '員工姓名', example: '張三', required: false })
  @Column({
    type: 'varchar',
    length: 6,
    nullable: true,
    name: 'staff_name',
  })
  staffName?: string;

  @ApiProperty({
    description: '建立時間',
    example: '2024-01-01T09:00:00Z',
  })
  @CreateDateColumn({
    type: 'timestamptz',
    name: 'create_time',
  })
  createTime: Date;

  @ApiProperty({
    description: '輸入類型',
    example: 'fingerprint',
    required: false,
  })
  @Column({
    type: 'varchar',
    length: 20,
    nullable: true,
    name: 'input_type',
  })
  inputType?: string;

  @ApiProperty({
    description: '出勤類型 0:未決定 1:上班 2:下班',
    example: 1,
    enum: [0, 1, 2],
  })
  @Column({
    type: 'int',
    default: 0,
    name: 'attend_type',
    comment: '0:未決定 1:上班 2:下班',
  })
  attendType: number;

  // 關聯到 Staff 實體
  @ApiProperty({
    description: '關聯的員工資料',
    type: () => Staff,
  })
  @ManyToOne(() => Staff, { eager: false })
  @JoinColumn({ name: 'staff_id' })
  staff: Staff;
}
