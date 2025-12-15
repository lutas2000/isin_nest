import {
  Entity,
  PrimaryColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Contact } from '../../contact/entities/contact.entity';
import { Quote } from '../../quote/entities/quote.entity';
import { WorkOrder } from '../../work-order/entities/work-order.entity';

@Entity('customer')
export class Customer {
  @ApiProperty({ description: '客戶ID', example: 'CUST001' })
  @PrimaryColumn({ type: 'varchar', length: 50 })
  id: string;

  @ApiProperty({ description: '公司名稱', example: '台灣精密工業股份有限公司' })
  @Column({
    type: 'varchar',
    length: 200,
    charset: 'utf8mb4',
    collation: 'utf8mb4_unicode_ci',
  })
  companyName: string;

  @ApiProperty({ description: '發票抬頭', example: '台灣精密工業股份有限公司' })
  @Column({
    type: 'varchar',
    length: 200,
    nullable: true,
    charset: 'utf8mb4',
    collation: 'utf8mb4_unicode_ci',
  })
  invoiceTitle?: string;

  @ApiProperty({ description: '公司簡稱', example: '台灣精密' })
  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    charset: 'utf8mb4',
    collation: 'utf8mb4_unicode_ci',
  })
  companyShortName?: string;

  @ApiProperty({ description: '電話（多個）', example: ['02-1234-5678', '0912-345-678'] })
  @Column('json', { nullable: true })
  phones?: string[];

  @ApiProperty({ description: '統一編號（多個）', example: ['12345678'] })
  @Column('json', { nullable: true })
  taxIds?: string[];

  @ApiProperty({ description: '郵遞區號', example: '100' })
  @Column({
    type: 'varchar',
    length: 10,
    nullable: true,
  })
  postalCode?: string;

  @ApiProperty({ description: '通訊地址', example: '台北市信義區信義路五段7號' })
  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    charset: 'utf8mb4',
    collation: 'utf8mb4_unicode_ci',
  })
  address?: string;

  @ApiProperty({ description: '送貨地址', example: '台北市信義區信義路五段7號' })
  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    charset: 'utf8mb4',
    collation: 'utf8mb4_unicode_ci',
  })
  deliveryAddress?: string;

  @ApiProperty({ description: '往來銀行', example: '台灣銀行' })
  @Column({
    type: 'varchar',
    length: 200,
    nullable: true,
    charset: 'utf8mb4',
    collation: 'utf8mb4_unicode_ci',
  })
  bank?: string;

  @ApiProperty({ description: '帳戶號碼', example: '1234567890123456' })
  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  accountNumber?: string;

  @ApiProperty({ description: '信用額度', example: 1000000 })
  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  creditLimit: number;

  @ApiProperty({ description: '帳款', example: 500000 })
  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  accountReceivable: number;

  @ApiProperty({ description: '傳真', example: '02-1234-5679' })
  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  fax?: string;

  @ApiProperty({ description: 'Email', example: 'contact@company.com' })
  @Column({
    type: 'varchar',
    length: 200,
    nullable: true,
  })
  email?: string;

  @ApiProperty({ description: '主要產品', example: 'CNC 加工零件' })
  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    charset: 'utf8mb4',
    collation: 'utf8mb4_unicode_ci',
  })
  mainProducts?: string;

  @ApiProperty({ description: '開始交易日期', example: '2023-01-01' })
  @Column({ type: 'date', nullable: true })
  firstTransactionDate?: Date;

  @ApiProperty({ description: '最近交易日期', example: '2024-01-15' })
  @Column({ type: 'date', nullable: true })
  lastTransactionDate?: Date;

  @ApiProperty({ description: '備註', example: '重要客戶' })
  @Column({
    type: 'text',
    nullable: true,
    charset: 'utf8mb4',
    collation: 'utf8mb4_unicode_ci',
  })
  notes?: string;

  @CreateDateColumn({
    type: 'datetime',
    name: 'created_at',
  })
  createdAt: Date;

  @UpdateDateColumn({
    type: 'datetime',
    name: 'updated_at',
  })
  updatedAt: Date;

  // 關聯到 Contact（一對多）
  @OneToMany(() => Contact, (contact) => contact.customer)
  contacts?: Contact[];

  // 關聯到 Quote（一對多）
  @OneToMany(() => Quote, (quote) => quote.customer)
  quotes?: Quote[];

  // 關聯到 WorkOrder（一對多）
  @OneToMany(() => WorkOrder, (workOrder) => workOrder.customer)
  workOrders?: WorkOrder[];
}

