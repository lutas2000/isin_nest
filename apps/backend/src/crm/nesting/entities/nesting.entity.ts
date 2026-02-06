import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Order } from '../../order/entities/order.entity';
import { DesignWorkOrder } from '../../design-work-order/entities/design-work-order.entity';
import { NestingItem } from './nesting-item.entity';

@Entity('nesting')
export class Nesting {
  @ApiProperty({ description: '排版ID', example: 'NST-20260206-A01' })
  @PrimaryColumn({
    type: 'text',
  })
  id: string;

  @ApiProperty({ description: '訂單ID', example: 'ORD001' })
  @Column({
    type: 'varchar',
    length: 50,
    name: 'order_id',
  })
  orderId: string;

  @ApiProperty({ description: '設計工作單ID', example: 1, required: false })
  @Column({
    type: 'int',
    name: 'design_work_order_id',
    nullable: true,
  })
  designWorkOrderId?: number;

  @ApiProperty({ description: '材料', example: '不鏽鋼' })
  @Column({
    type: 'varchar',
    length: 100,
  })
  material: string;

  @ApiProperty({ description: '厚度', example: '3mm' })
  @Column({
    type: 'varchar',
    length: 50,
  })
  thickness: string;

  @ApiProperty({ description: '數量（張數）', example: 1 })
  @Column({
    type: 'int',
    default: 1,
  })
  quantity: number;

  @ApiProperty({ description: '排版圖檔（PDF/圖片）', example: 'nesting_map.pdf', required: false })
  @Column({
    type: 'varchar',
    length: 500,
    name: 'nesting_image_file',
    nullable: true,
  })
  nestingImageFile?: string;

  @ApiProperty({ description: 'CNC 檔案', example: 'nesting.nc', required: false })
  @Column({
    type: 'varchar',
    length: 500,
    name: 'cnc_file',
    nullable: true,
  })
  cncFile?: string;

  @ApiProperty({ description: '排版 X 尺寸', example: 2415.6, required: false })
  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  x?: number;

  @ApiProperty({ description: '排版 Y 尺寸', example: 1194.3, required: false })
  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  y?: number;

  @ApiProperty({ description: '切割長度', example: 51288.1, required: false })
  @Column({
    type: 'decimal',
    precision: 15,
    scale: 4,
    nullable: true,
    name: 'cut_length',
  })
  cutLength?: number;

  @ApiProperty({ description: '劃線長度', example: 23152, required: false })
  @Column({
    type: 'decimal',
    precision: 15,
    scale: 4,
    nullable: true,
    name: 'line_length',
  })
  lineLength?: number;

  @ApiProperty({
    description: '加工時間（秒）',
    example: 1166,
    required: false,
  })
  @Column({
    type: 'int',
    nullable: true,
    name: 'processing_time_seconds',
  })
  processingTime?: number;

  @ApiProperty({
    description: '使用率（百分比，例如 71.59）',
    example: 71.59,
    required: false,
  })
  @Column({
    type: 'decimal',
    precision: 6,
    scale: 3,
    nullable: true,
  })
  utilization?: number;

  @ApiProperty({ description: '重量', example: 46.438, required: false })
  @Column({
    type: 'decimal',
    precision: 12,
    scale: 4,
    nullable: true,
  })
  weight?: number;

  @ApiProperty({
    description: '廢料（百分比，例如 28.411）',
    example: 28.411,
    required: false,
  })
  @Column({
    type: 'decimal',
    precision: 6,
    scale: 3,
    nullable: true,
  })
  scrap?: number;

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

  // 關聯到 Order
  @ManyToOne(() => Order, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  // 關聯到 DesignWorkOrder
  @ManyToOne(() => DesignWorkOrder, { nullable: true })
  @JoinColumn({ name: 'design_work_order_id' })
  designWorkOrder?: DesignWorkOrder;

  // 關聯到 NestingItem（一對多）
  @OneToMany(() => NestingItem, (nestingItem) => nestingItem.nesting)
  nestingItems?: NestingItem[];
}
