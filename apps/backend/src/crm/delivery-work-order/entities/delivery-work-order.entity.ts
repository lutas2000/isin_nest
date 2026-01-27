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
import { Staff } from '../../../hr/staff/entities/staff.entity';
import { DeliveryWorkOrderStatus } from '../../enums/work-order-status.enum';

@Entity('delivery_work_order')
export class DeliveryWorkOrder {
  @ApiProperty({ description: '送貨工作單ID', example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: '訂貨單ID', example: 'ORD001' })
  @Column({
    type: 'varchar',
    length: 50,
    name: 'order_id',
  })
  orderId: string;

  @ApiProperty({ description: '司機員工編號', example: 'STAFF001', required: false })
  @Column({
    type: 'varchar',
    length: 10,
    name: 'driver_id',
    nullable: true,
  })
  driverId?: string;

  @ApiProperty({ description: '送貨地址', example: '台北市信義區信義路五段7號' })
  @Column({
    type: 'varchar',
    length: 500,
    name: 'delivery_address',
    nullable: true,
  })
  deliveryAddress?: string;

  @ApiProperty({ description: '聯絡電話', example: '02-1234-5678' })
  @Column({
    type: 'varchar',
    length: 50,
    name: 'contact_phone',
    nullable: true,
  })
  contactPhone?: string;

  @ApiProperty({ description: '預定送貨日期', example: '2024-01-15' })
  @Column({
    type: 'date',
    name: 'scheduled_date',
    nullable: true,
  })
  scheduledDate?: Date;

  @ApiProperty({ description: '狀態', enum: DeliveryWorkOrderStatus, example: DeliveryWorkOrderStatus.PENDING })
  @Column({
    type: 'varchar',
    length: 50,
    default: DeliveryWorkOrderStatus.PENDING,
  })
  status: DeliveryWorkOrderStatus;

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
    name: 'delivered_at',
    nullable: true,
  })
  deliveredAt?: Date;

  // 關聯到 Order
  @ManyToOne(() => Order, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  // 關聯到 Staff (司機)
  @ManyToOne(() => Staff, { nullable: true })
  @JoinColumn({ name: 'driver_id' })
  driver?: Staff;
}
