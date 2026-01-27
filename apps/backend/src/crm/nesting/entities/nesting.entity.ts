import {
  Entity,
  PrimaryGeneratedColumn,
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

// 排版狀態
export enum NestingStatus {
  DRAFT = 'draft',           // 草稿
  FINALIZED = 'finalized',   // 已定案
}

@Entity('nesting')
export class Nesting {
  @ApiProperty({ description: '排版ID', example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: '排版圖號', example: 'ABC2401150101' })
  @Column({
    type: 'varchar',
    length: 100,
    name: 'nesting_number',
    unique: true,
  })
  nestingNumber: string;

  @ApiProperty({ description: '訂貨單ID', example: 'ORD001' })
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

  @ApiProperty({ description: '狀態', enum: NestingStatus, example: NestingStatus.DRAFT })
  @Column({
    type: 'varchar',
    length: 50,
    default: NestingStatus.DRAFT,
  })
  status: NestingStatus;

  @ApiProperty({ description: '備註', required: false })
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
