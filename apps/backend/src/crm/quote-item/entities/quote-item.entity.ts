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
import { Quote } from '../../quote/entities/quote.entity';
import { Customer } from '../../customer/entities/customer.entity';

@Entity('quote_item')
export class QuoteItem {
  @ApiProperty({ description: '報價單工件ID', example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: '報價單ID', example: 1 })
  @Column({ type: 'int', name: 'quote_id' })
  quoteId: number;

  @ApiProperty({ description: '客戶ID', example: 'CUST001' })
  @Column({ type: 'varchar', length: 50, name: 'customer_id', nullable: true })
  customerId?: string;

  @ApiProperty({ description: '客戶圖檔（檔案名稱）', example: 'customer_file.dxf' })
  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    name: 'customer_file',
    charset: 'utf8mb4',
    collation: 'utf8mb4_unicode_ci',
  })
  customerFile?: string;

  @ApiProperty({ description: '材質', example: '不鏽鋼' })
  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    charset: 'utf8mb4',
    collation: 'utf8mb4_unicode_ci',
  })
  material?: string;

  @ApiProperty({ description: '厚度', example: '3mm' })
  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  thickness?: string;

  @ApiProperty({ description: '加工', example: '雷射切割' })
  @Column({
    type: 'varchar',
    length: 200,
    nullable: true,
    charset: 'utf8mb4',
    collation: 'utf8mb4_unicode_ci',
  })
  processing?: string;

  @ApiProperty({ description: '數量', example: 100 })
  @Column({ type: 'int', default: 0 })
  quantity: number;

  @ApiProperty({ description: '單價', example: 1000 })
  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  unitPrice: number;

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

  // 關聯到 Quote（多對一）
  @ApiProperty({ description: '關聯的報價單資料', type: () => Quote })
  @ManyToOne(() => Quote, (quote) => quote.quoteItems, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'quote_id' })
  quote: Quote;

  // 關聯到 Customer（多對一）
  @ApiProperty({ description: '關聯的客戶資料', type: () => Customer })
  @ManyToOne(() => Customer, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customer_id' })
  customer?: Customer;
}

