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

  @ApiProperty({ description: '加工類型', example: '折床' })
  @Column({
    type: 'varchar',
    length: 100,
    name: 'processing_type',
  })
  processingType: string;

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

  // 關聯到 Staff (指派人員)
  @ManyToOne(() => Staff, { nullable: true })
  @JoinColumn({ name: 'assigned_staff_id' })
  assignedStaff?: Staff;
}
