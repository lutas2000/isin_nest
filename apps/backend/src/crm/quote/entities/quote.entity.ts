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
import { QuoteItem } from '../../quote-item/entities/quote-item.entity';
import { numericTransformer } from '../../../common/transformers/numeric.transformer';

@Entity('quote')
export class Quote {
  @ApiProperty({ description: '報價單ID', example: '00010301' })
  @PrimaryColumn({
    type: 'varchar',
    length: 50,
  })
  id: string;

  @ApiProperty({ description: '經手人員工編號', example: 'STAFF001' })
  @Column({
    type: 'varchar',
    length: 10,
    name: 'staff_id',
    nullable: true,
  })
  staffId?: string;

  @ApiProperty({ description: '客戶ID', example: 'CUST001' })
  @Column({
    type: 'varchar',
    length: 50,
    name: 'customer_id',
    nullable: true,
  })
  customerId?: string;

  @ApiProperty({ description: '總計金額', example: 100000 })
  @Column({
    type: 'numeric',
    precision: 15,
    scale: 2,
    default: 0,
    transformer: numericTransformer,
  })
  totalAmount: number;

  @ApiProperty({ description: '注意事項', example: '請於一週內回覆' })
  @Column({
    type: 'text',
    nullable: true,
  })
  notes?: string;

  @ApiProperty({ description: '客戶是否簽名', example: false })
  @Column({ type: 'boolean', default: false, name: 'is_signed' })
  isSigned: boolean;

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

  // 關聯到 Staff（經手人）
  @ApiProperty({ description: '關聯的員工資料', type: () => Staff })
  @ManyToOne(() => Staff, { nullable: true })
  @JoinColumn({ name: 'staff_id' })
  staff?: Staff;

  // 關聯到 Customer
  @ApiProperty({ description: '關聯的客戶資料', type: () => Customer })
  @ManyToOne(() => Customer, (customer) => customer.quotes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customer_id' })
  customer?: Customer;

  // 關聯到 QuoteItem（一對多）
  @OneToMany(() => QuoteItem, (quoteItem) => quoteItem.quote)
  quoteItems?: QuoteItem[];
}

