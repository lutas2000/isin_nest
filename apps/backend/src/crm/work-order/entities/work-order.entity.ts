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
import { WorkOrderItem } from '../../work-order-item/entities/work-order-item.entity';

@Entity('work_order')
export class WorkOrder {
  @ApiProperty({ description: '工單ID', example: 'WO001' })
  @PrimaryColumn({ type: 'varchar', length: 50 })
  id: string;

  @ApiProperty({ description: '業務員員工編號', example: 'STAFF001' })
  @Column({
    type: 'varchar',
    length: 10,
    name: 'staff_id',
    charset: 'utf8mb4',
    collation: 'utf8mb4_unicode_ci',
  })
  staffId: string;

  @ApiProperty({ description: '客戶ID', example: 'CUST001' })
  @Column({
    type: 'varchar',
    length: 50,
    name: 'customer_id',
    charset: 'utf8mb4',
    collation: 'utf8mb4_unicode_ci',
  })
  customerId: string;

  @ApiProperty({ description: '運送方式', example: 'EXPRESS' })
  @Column({
    type: 'varchar',
    length: 50,
    name: 'shipping_method',
    charset: 'utf8mb4',
    collation: 'utf8mb4_unicode_ci',
  })
  shippingMethod: string;

  @ApiProperty({ description: '付款方式', example: 'TRANSFER' })
  @Column({
    type: 'varchar',
    length: 50,
    name: 'payment_method',
    charset: 'utf8mb4',
    collation: 'utf8mb4_unicode_ci',
  })
  paymentMethod: string;

  @ApiProperty({ description: '備註', example: '請優先處理' })
  @Column({
    type: 'text',
    nullable: true,
    charset: 'utf8mb4',
    collation: 'utf8mb4_unicode_ci',
  })
  notes?: string;

  @ApiProperty({ description: '金額', example: 100000 })
  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  amount: number;

  @ApiProperty({ description: '是否完成', example: false })
  @Column({ type: 'tinyint', width: 1, default: 0, name: 'is_completed' })
  isCompleted: boolean;

  @CreateDateColumn({
    type: 'datetime',
    name: 'created_at',
  })
  createdAt: Date;

  @Column({
    type: 'datetime',
    nullable: true,
    name: 'ended_at',
  })
  endedAt?: Date;

  @UpdateDateColumn({
    type: 'datetime',
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
  @ManyToOne(() => Customer, (customer) => customer.workOrders, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  // 關聯到 WorkOrderItem（一對多）
  @OneToMany(() => WorkOrderItem, (workOrderItem) => workOrderItem.workOrder)
  workOrderItems?: WorkOrderItem[];
}

