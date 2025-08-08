import { PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Staff } from '../../staff/entities/staff.entity';

export abstract class BaseManhour {
  @ApiProperty({ description: '工時記錄ID', example: 1 })
  @PrimaryGeneratedColumn()
  id: number; // 主鍵，自動遞增

  @ApiProperty({ description: '員工ID', example: 'STAFF001' })
  @Column({ type: 'varchar', length: 10 })
  staffId: string; // 員工編號

  @ApiProperty({
    description: '開始時間',
    required: false,
    example: '2024-01-01 09:00:00',
  })
  @Column({ type: 'datetime', nullable: true })
  start_time?: Date; // 開始時間

  @ApiProperty({
    description: '結束時間',
    required: false,
    example: '2024-01-01 18:00:00',
  })
  @Column({ type: 'datetime', nullable: true })
  end_time?: Date; // 結束時間

  @ApiProperty({ description: '上班時間(小時)', example: 8.5 })
  @Column({ type: 'float', default: 0 })
  work_time: number; // 上班時間(hr)

  @ApiProperty({ description: '日期', required: false, example: '2024-01-01' })
  @Column({ type: 'date', nullable: true })
  day?: Date; // 日期

  // 建立與Staff的多對一關係
  @ManyToOne(() => Staff, { eager: true })
  @JoinColumn({ name: 'staffId' }) // 外鍵欄位名稱
  staff?: Staff; // 關聯的員工資料
}
