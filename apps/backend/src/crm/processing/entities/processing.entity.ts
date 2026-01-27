import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { OrderItem } from '../../order-item/entities/order-item.entity';
import { Vendor } from '../../vendor/entities/vendor.entity';

export enum ProcessingStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
}

@Entity('processing')
export class Processing {
  @ApiProperty({ description: '加工 ID', example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: '訂貨單工件 ID', example: 1 })
  @Column({
    type: 'int',
    name: 'work_order_item_id', // 保持資料庫欄位名稱不變
  })
  orderItemId: number;

  @ApiProperty({ description: '加工類型代碼', example: 'LASER_CUT' })
  @Column({
    type: 'varchar',
    length: 50,
    name: 'processing_code',
  })
  processingCode: string;

  @ApiProperty({ description: '是否委外', example: false })
  @Column({
    type: 'boolean',
    default: false,
    name: 'is_outsourced',
  })
  isOutsourced: boolean;

  @ApiProperty({
    description: '狀態',
    example: 'pending',
    enum: ProcessingStatus,
  })
  @Column({
    type: 'varchar',
    length: 20,
    default: ProcessingStatus.PENDING,
  })
  status: ProcessingStatus;

  @ApiProperty({ description: '委外廠商 ID', example: 1, required: false })
  @Column({
    type: 'int',
    nullable: true,
    name: 'vendor_id',
  })
  vendorId?: number;

  @ApiProperty({ description: '開始時間', example: '2024-01-15T09:00:00Z', required: false })
  @Column({
    type: 'timestamptz',
    nullable: true,
    name: 'started_at',
  })
  startedAt?: Date;

  @ApiProperty({ description: '完成時間', example: '2024-01-15T17:00:00Z', required: false })
  @Column({
    type: 'timestamptz',
    nullable: true,
    name: 'completed_at',
  })
  completedAt?: Date;

  @ApiProperty({ description: '備註', example: '需要特別注意尺寸', required: false })
  @Column({
    type: 'text',
    nullable: true,
  })
  notes?: string;

  @CreateDateColumn({
    type: 'timestamptz',
    name: 'created_at',
  })
  createdAt: Date;

  @UpdateDateColumn({
    type: 'timestamptz',
    name: 'updated_at',
  })
  updatedAt: Date;

  // 關聯到 OrderItem（多對一）
  @ApiProperty({ description: '關聯的訂貨單工件', type: () => OrderItem })
  @ManyToOne(() => OrderItem, (item) => item.processingItems, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'work_order_item_id' }) // 保持資料庫欄位名稱不變
  orderItem: OrderItem;

  // 關聯到 Vendor（多對一，可為 null）
  @ApiProperty({ description: '關聯的委外廠商', type: () => Vendor, required: false })
  @ManyToOne(() => Vendor, { nullable: true })
  @JoinColumn({ name: 'vendor_id' })
  vendor?: Vendor;
}
