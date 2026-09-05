import { Entity, PrimaryColumn, Column } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('attend_record')
export class AttendRecord {
  @ApiProperty({ description: '出勤記錄ID', example: '1704067200張三' })
  @PrimaryColumn({ type: 'varchar', length: 32 })
  id: string;

  @ApiProperty({ description: '員工編號', example: 'STAFF001' })
  @Column({ name: 'staff_id', type: 'varchar', length: 10 })
  staffId: string;

  @ApiProperty({ description: '員工姓名', example: '張三', required: false })
  @Column({ type: 'varchar', length: 6, nullable: true, name: 'staff_name' })
  staffName?: string;

  @ApiProperty({ description: '打卡時間', example: '2024-01-01T09:00:00Z' })
  @Column({ type: 'timestamptz', name: 'create_time' })
  createTime: Date;

  @ApiProperty({ description: '打卡方式', example: 'card', required: false })
  @Column({ type: 'varchar', length: 10, nullable: true, name: 'input_type' })
  inputType?: string;

  @ApiProperty({
    description: '出勤類型 0:新紀錄 1:上班 2:下班 3:不明',
    example: 0,
    enum: [0, 1, 2, 3],
  })
  @Column({ type: 'int', default: 0, name: 'attend_type' })
  attendType: number;
}
