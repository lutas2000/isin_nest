import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Vendor } from '../../vendor/entities/vendor.entity';

/**
 * Processing 主檔（加工項目定義）
 * 用於定義所有可用的加工類型
 * vendorId = null 代表內部加工
 * vendorId 有值代表該加工由指定廠商執行
 */
@Entity('processing')
export class Processing {
  @ApiProperty({ description: '加工 ID', example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: '加工名稱', example: '折彎' })
  @Column({
    type: 'varchar',
    length: 100,
  })
  name: string;

  @ApiProperty({ description: '廠商 ID（null 代表內部加工）', example: 1, required: false })
  @Column({
    type: 'int',
    nullable: true,
    name: 'vendor_id',
  })
  vendorId?: number;

  @ApiProperty({ description: '備註', example: '需要特殊設備', required: false })
  @Column({
    type: 'text',
    nullable: true,
  })
  notes?: string;

  @ApiProperty({ description: '顯示順序', example: 1 })
  @Column({
    type: 'int',
    default: 0,
    name: 'display_order',
  })
  displayOrder: number;

  // 關聯到 Vendor（多對一，可為 null）
  @ApiProperty({ description: '關聯的廠商', type: () => Vendor, required: false })
  @ManyToOne(() => Vendor, { nullable: true })
  @JoinColumn({ name: 'vendor_id' })
  vendor?: Vendor;
}
