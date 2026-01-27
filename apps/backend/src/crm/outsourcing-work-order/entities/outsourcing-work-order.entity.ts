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
import { OrderItem } from '../../order-item/entities/order-item.entity';
import { Vendor } from '../../vendor/entities/vendor.entity';
import { OutsourcingWorkOrderStatus } from '../../enums/work-order-status.enum';

@Entity('outsourcing_work_order')
export class OutsourcingWorkOrder {
  @ApiProperty({ description: '委外加工工作單ID', example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: '訂貨單ID', example: 'ORD001' })
  @Column({
    type: 'varchar',
    length: 50,
    name: 'order_id',
  })
  orderId: string;

  @ApiProperty({ description: '訂貨單工件ID', example: 1 })
  @Column({
    type: 'int',
    name: 'order_item_id',
  })
  orderItemId: number;

  @ApiProperty({ description: '委外廠商ID', example: 1 })
  @Column({
    type: 'int',
    name: 'vendor_id',
  })
  vendorId: number;

  @ApiProperty({ description: '加工類型', example: '烤漆' })
  @Column({
    type: 'varchar',
    length: 100,
    name: 'processing_type',
  })
  processingType: string;

  @ApiProperty({ description: '狀態', enum: OutsourcingWorkOrderStatus, example: OutsourcingWorkOrderStatus.PENDING })
  @Column({
    type: 'varchar',
    length: 50,
    default: OutsourcingWorkOrderStatus.PENDING,
  })
  status: OutsourcingWorkOrderStatus;

  @ApiProperty({ description: '送出日期', required: false })
  @Column({
    type: 'timestamptz',
    name: 'shipped_at',
    nullable: true,
  })
  shippedAt?: Date;

  @ApiProperty({ description: '取回日期', required: false })
  @Column({
    type: 'timestamptz',
    name: 'returned_at',
    nullable: true,
  })
  returnedAt?: Date;

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

  // 關聯到 OrderItem
  @ManyToOne(() => OrderItem, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_item_id' })
  orderItem: OrderItem;

  // 關聯到 Vendor
  @ManyToOne(() => Vendor)
  @JoinColumn({ name: 'vendor_id' })
  vendor: Vendor;
}
