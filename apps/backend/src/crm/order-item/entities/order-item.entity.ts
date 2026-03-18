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
import { numericTransformer } from '../../../common/transformers/numeric.transformer';

@Entity('order_item')
export class OrderItem {
  @ApiProperty({ description: '訂單工件ID', example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: '訂單ID', example: 'ORD001' })
  @Column({
    type: 'varchar',
    length: 50,
    name: 'order_id',
  })
  orderId: string;

  @ApiProperty({ description: 'CAD 檔案（檔案名稱）', example: 'design.dxf' })
  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    name: 'cad_file',
  })
  cadFile?: string;

  @ApiProperty({ description: '客戶檔案（檔案名稱）', example: 'customer_file.dxf' })
  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    name: 'customer_file',
  })
  customerFile?: string;

  @ApiProperty({ description: '材料', example: '不鏽鋼' })
  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  material?: string;

  @ApiProperty({ description: '厚度', example: 3.1 })
  @Column({
    type: 'decimal',
    scale: 1,
    nullable: true,
  })
  thickness?: number;

  @ApiProperty({ description: '數量', example: 100 })
  @Column({ type: 'int', default: 0 })
  quantity: number;

  @ApiProperty({ description: '代料（最多三個字）', example: '代料A', required: false })
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

  @ApiProperty({ description: '加工項目 ID 陣列', example: [1, 2, 3], type: [Number] })
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

  @ApiProperty({ description: '估計切割時間（分鐘）', example: 120 })
  @Column({ type: 'int', nullable: true, name: 'estimated_cutting_time' })
  estimatedCuttingTime?: number;

  @ApiProperty({ description: '圖號', example: 'DWG-2024-001', required: false })
  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    name: 'drawing_number',
  })
  drawingNumber?: string;

  @ApiProperty({ description: '排版ID', example: 1, required: false })
  @Column({
    type: 'int',
    nullable: true,
    name: 'nesting_id',
  })
  nestingId: number | null;

  @ApiProperty({ description: '狀態', example: 'TODO', required: false })
  @Column({
    type: 'varchar',
    length: 50,
    default: 'TODO',
    nullable: false,
  })
  status: string;

  @ApiProperty({ description: '備註' })
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

  // 關聯到 Order（多對一）
  @ApiProperty({ description: '關聯的訂單資料', type: () => Order })
  @ManyToOne(() => Order, (order) => order.orderItems, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;
}
