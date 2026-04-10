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
import { SalesVoucher } from '../../sales-voucher/entities/sales-voucher.entity';
import { numericTransformer } from '../../../common/transformers/numeric.transformer';

@Entity('sales_voucher_item')
export class SalesVoucherItem {
  @ApiProperty({ description: '銷貨單明細ID', example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: '銷貨單ID', example: 'SV150328001' })
  @Column({
    type: 'varchar',
    length: 50,
    name: 'sales_voucher_id',
  })
  salesVoucherId: string;

  @ApiProperty({ description: 'CAD 檔案（檔案名稱）', required: false })
  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    name: 'cad_file',
  })
  cadFile?: string;

  @ApiProperty({ description: '客戶檔案（檔案名稱）', required: false })
  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    name: 'customer_file',
  })
  customerFile?: string;

  @ApiProperty({ description: '材料', required: false })
  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  material?: string;

  @ApiProperty({ description: '厚度', required: false })
  @Column({
    type: 'decimal',
    scale: 1,
    nullable: true,
  })
  thickness?: number;

  @ApiProperty({ description: '數量', example: 100 })
  @Column({ type: 'int', default: 0 })
  quantity: number;

  @ApiProperty({ description: '代料（最多三個字）', required: false })
  @Column({
    type: 'varchar',
    length: 3,
    nullable: true,
    name: 'substitute',
  })
  substitute?: string;

  @ApiProperty({ description: '來源', example: '新圖' })
  @Column({
    type: 'varchar',
    length: 50,
  })
  source: string;

  @ApiProperty({ description: '加工項目 ID 陣列', type: [Number], required: false })
  @Column({
    type: 'jsonb',
    nullable: true,
    name: 'processing_ids',
  })
  processingIds?: number[];

  @ApiProperty({ description: '單價', example: 1000 })
  @Column({
    type: 'numeric',
    precision: 15,
    scale: 2,
    default: 0,
    name: 'unit_price',
    transformer: numericTransformer,
  })
  unitPrice: number;

  @ApiProperty({ description: '估計切割時間（分鐘）', required: false })
  @Column({ type: 'int', nullable: true, name: 'estimated_cutting_time' })
  estimatedCuttingTime?: number;

  @ApiProperty({ description: '圖號', required: false })
  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    name: 'drawing_number',
  })
  drawingNumber?: string;

  @ApiProperty({ description: '排版ID', required: false })
  @Column({
    type: 'int',
    nullable: true,
    name: 'nesting_id',
  })
  nestingId: number | null;

  @ApiProperty({ description: '狀態', example: 'TODO' })
  @Column({
    type: 'varchar',
    length: 50,
    default: 'TODO',
    nullable: false,
  })
  status: string;

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

  @ManyToOne(() => SalesVoucher, (v) => v.salesVoucherItems, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sales_voucher_id' })
  salesVoucher: SalesVoucher;
}
