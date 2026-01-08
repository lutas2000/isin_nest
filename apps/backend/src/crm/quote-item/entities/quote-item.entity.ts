import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Quote } from '../../quote/entities/quote.entity';
import { numericTransformer } from '../../../common/transformers/numeric.transformer';

@Entity('quote_item')
export class QuoteItem {
  @ApiProperty({ description: '報價單工件ID', example: '00010301_1' })
  @PrimaryColumn({
    type: 'varchar',
    length: 50,
  })
  id: string;

  @ApiProperty({ description: '報價單ID', example: 'CUST001-Q001' })
  @Column({ 
    name: 'quote_id',
    type: 'varchar',
    length: 50,
   })
  quoteId: string;

  @ApiProperty({ description: '客戶圖檔（檔案名稱）', example: 'customer_file.dxf' })
  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    name: 'customer_file',
  })
  customerFile?: string;

  @ApiProperty({ description: '材質', example: '不鏽鋼' })
  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
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
  })
  processing?: string;

  @ApiProperty({ description: '數量', example: 100 })
  @Column({ type: 'int', default: 0 })
  quantity: number;

  @ApiProperty({ description: '單價', example: 1000 })
  @Column({
    type: 'numeric',
    precision: 15,
    scale: 2,
    default: 0,
    transformer: numericTransformer,
  })
  unitPrice: number;

  @ApiProperty({ description: '備註', example: '一、以上報價有效期限 7 天。' })
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

  // 關聯到 Quote（多對一）
  @ApiProperty({ description: '關聯的報價單資料', type: () => Quote })
  @ManyToOne(() => Quote, (quote) => quote.quoteItems, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'quote_id' })
  quote: Quote;
}

