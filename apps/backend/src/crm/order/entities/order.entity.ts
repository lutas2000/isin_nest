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
import { Customer } from '../../customer/entities/customer.entity';
import { Staff } from '../../../hr/staff/entities/staff.entity';
import { OrderItem } from '../../order-item/entities/order-item.entity';
import { numericTransformer } from '../../../common/transformers/numeric.transformer';

// 訂貨單狀態
export enum OrderStatus {
  PENDING = 'pending',           // 待處理
  DESIGN = 'design',             // 設計中
  CUTTING = 'cutting',           // 切割中
  PROCESSING = 'processing',     // 加工中
  READY_FOR_DELIVERY = 'ready_for_delivery', // 等待配送
  DELIVERED = 'delivered',       // 已送達
  COMPLETED = 'completed',       // 已完成
}

@Entity('order')
export class Order {
  @ApiProperty({ description: '訂貨單ID', example: 'ORD001' })
  @PrimaryColumn({ type: 'varchar', length: 50 })
  id: string;

  @ApiProperty({ description: '來源報價單ID', example: 'Q001', required: false })
  @Column({
    type: 'varchar',
    length: 50,
    name: 'quote_id',
    nullable: true,
  })
  quoteId?: string;

  @ApiProperty({ description: '業務員員工編號', example: 'STAFF001' })
  @Column({
    type: 'varchar',
    length: 10,
    name: 'staff_id',
  })
  staffId: string;

  @ApiProperty({ description: '客戶ID', example: 'CUST001' })
  @Column({
    type: 'varchar',
    length: 50,
    name: 'customer_id',
  })
  customerId: string;

  @ApiProperty({ description: '運送方式', example: '快遞' })
  @Column({
    type: 'varchar',
    length: 50,
    name: 'shipping_method',
  })
  shippingMethod: string;

  @ApiProperty({ description: '付款方式', example: '轉帳' })
  @Column({
    type: 'varchar',
    length: 50,
    name: 'payment_method',
  })
  paymentMethod: string;

  @ApiProperty({ description: '備註', example: '請優先處理' })
  @Column({
    type: 'text',
    nullable: true,
  })
  notes?: string;

  @ApiProperty({ description: '金額', example: 100000 })
  @Column({
    type: 'numeric',
    precision: 15,
    scale: 2,
    default: 0,
    transformer: numericTransformer,
  })
  amount: number;

  @ApiProperty({ description: '訂單狀態', enum: OrderStatus, example: OrderStatus.PENDING })
  @Column({
    type: 'varchar',
    length: 50,
    default: OrderStatus.PENDING,
  })
  status: OrderStatus;

  @ApiProperty({ description: '是否完成', example: false })
  @Column({ type: 'boolean', default: false, name: 'is_completed' })
  isCompleted: boolean;

  @CreateDateColumn({
    type: 'timestamptz',
    name: 'created_at',
  })
  createdAt: Date;

  @Column({
    type: 'timestamptz',
    nullable: true,
    name: 'ended_at',
  })
  endedAt?: Date;

  @UpdateDateColumn({
    type: 'timestamptz',
    name: 'updated_at',
  })
  updatedAt: Date;

  // 關聯到 Staff（業務員）
  @ApiProperty({ description: '關聯的員工資料', type: () => Staff })
  @ManyToOne(() => Staff)
  @JoinColumn({ name: 'staff_id' })
  staff: Staff;

  // 關聯到 Customer
  @ApiProperty({ description: '關聯的客戶資料', type: () => Customer })
  @ManyToOne(() => Customer, (customer) => customer.orders, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  // 關聯到 OrderItem（一對多）
  @OneToMany(() => OrderItem, (orderItem) => orderItem.order)
  orderItems?: OrderItem[];
}
