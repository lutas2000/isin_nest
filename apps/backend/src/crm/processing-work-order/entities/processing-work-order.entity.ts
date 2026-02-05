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
import { Order } from '../../order/entities/order.entity';
import { OrderItem } from '../../order-item/entities/order-item.entity';
import { Staff } from '../../../hr/staff/entities/staff.entity';
import { Vendor } from '../../vendor/entities/vendor.entity';
import { Processing } from '../../processing/entities/processing.entity';
import { ProcessingWorkOrderStatus } from '../../enums/work-order-status.enum';

@Entity('processing_work_order')
export class ProcessingWorkOrder {
  @ApiProperty({ description: '加工工作單ID', example: 1 })
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

  @ApiProperty({ description: '加工項目ID', example: 1 })
  @Column({
    type: 'int',
    name: 'processing_id',
  })
  processingId: number;

  @ApiProperty({ description: '廠商ID（可覆蓋 Processing 預設廠商）', example: 1, required: false })
  @Column({
    type: 'int',
    nullable: true,
    name: 'vendor_id',
  })
  vendorId?: number;

  @ApiProperty({ description: '指派人員員工編號', example: 'STAFF001', required: false })
  @Column({
    type: 'varchar',
    length: 10,
    name: 'assigned_staff_id',
    nullable: true,
  })
  assignedStaffId?: string;

  @ApiProperty({ description: '狀態', enum: ProcessingWorkOrderStatus, example: ProcessingWorkOrderStatus.PENDING })
  @Column({
    type: 'varchar',
    length: 50,
    default: ProcessingWorkOrderStatus.PENDING,
  })
  status: ProcessingWorkOrderStatus;

  @ApiProperty({ description: '備註', required: false })
  @Column({
    type: 'text',
    nullable: true,
  })
  notes?: string;

  @ApiProperty({ description: '送出日期（委外加工時使用）', required: false })
  @Column({
    type: 'timestamptz',
    name: 'shipped_at',
    nullable: true,
  })
  shippedAt?: Date;

  @ApiProperty({ description: '取回日期（委外加工時使用）', required: false })
  @Column({
    type: 'timestamptz',
    name: 'returned_at',
    nullable: true,
  })
  returnedAt?: Date;

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

  @Column({
    type: 'timestamptz',
    name: 'completed_at',
    nullable: true,
  })
  completedAt?: Date;

  // 關聯到 Order
  @ManyToOne(() => Order, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  // 關聯到 OrderItem
  @ManyToOne(() => OrderItem, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_item_id' })
  orderItem: OrderItem;

  // 關聯到 Processing
  @ApiProperty({ description: '關聯的加工項目', type: () => Processing })
  @ManyToOne(() => Processing)
  @JoinColumn({ name: 'processing_id' })
  processing: Processing;

  // 關聯到 Vendor（可覆蓋 Processing 預設廠商）
  @ApiProperty({ description: '關聯的廠商', type: () => Vendor, required: false })
  @ManyToOne(() => Vendor, { nullable: true })
  @JoinColumn({ name: 'vendor_id' })
  vendor?: Vendor;

  // 關聯到 Staff (指派人員)
  @ManyToOne(() => Staff, { nullable: true })
  @JoinColumn({ name: 'assigned_staff_id' })
  assignedStaff?: Staff;
}
