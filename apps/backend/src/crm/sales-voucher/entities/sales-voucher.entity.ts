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
import { Order } from '../../order/entities/order.entity';
import { SalesVoucherItem } from '../../sales-voucher-item/entities/sales-voucher-item.entity';
import { numericTransformer } from '../../../common/transformers/numeric.transformer';

@Entity('sales_voucher')
export class SalesVoucher {
  @ApiProperty({ description: '銷貨單ID', example: 'SV150328001' })
  @PrimaryColumn({ type: 'varchar', length: 50 })
  id: string;

  @ApiProperty({ description: '關聯訂單ID', required: false })
  @Column({
    type: 'varchar',
    length: 50,
    name: 'order_id',
    nullable: true,
  })
  orderId?: string | null;

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

  @ApiProperty({ description: '運送方式（交易條件快照）', example: '快遞' })
  @Column({
    type: 'varchar',
    length: 50,
    name: 'shipping_method',
  })
  shippingMethod: string;

  @ApiProperty({ description: '付款方式（交易條件快照）', example: '轉帳' })
  @Column({
    type: 'varchar',
    length: 50,
    name: 'payment_method',
  })
  paymentMethod: string;

  @ApiProperty({ description: '備註', required: false })
  @Column({
    type: 'text',
    nullable: true,
  })
  notes?: string;

  @ApiProperty({ description: '未稅／明細合計', example: 100000 })
  @Column({
    type: 'numeric',
    precision: 15,
    scale: 2,
    default: 0,
    transformer: numericTransformer,
  })
  amount: number;

  @ApiProperty({ description: '稅金額', example: 5000 })
  @Column({
    type: 'numeric',
    precision: 15,
    scale: 2,
    default: 0,
    transformer: numericTransformer,
  })
  tax: number;

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

  @ManyToOne(() => Staff)
  @JoinColumn({ name: 'staff_id' })
  staff: Staff;

  @ManyToOne(() => Customer, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @ManyToOne(() => Order, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'order_id' })
  order?: Order | null;

  @OneToMany(() => SalesVoucherItem, (item) => item.salesVoucher)
  salesVoucherItems?: SalesVoucherItem[];
}
