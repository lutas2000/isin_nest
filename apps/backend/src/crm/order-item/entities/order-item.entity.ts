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
import { numericTransformer } from '../../../common/transformers/numeric.transformer';

@Entity('order_item')
export class OrderItem {
  @ApiProperty({ description: '訂貨單工件ID', example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: '訂貨單ID', example: 'ORD001' })
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

  @ApiProperty({ description: '厚度', example: '3mm' })
  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  thickness?: string;

  @ApiProperty({ description: '數量', example: 100 })
  @Column({ type: 'int', default: 0 })
  quantity: number;

  @ApiProperty({ description: '單位', example: '件' })
  @Column({
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  unit?: string;

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

  @ApiProperty({ description: '繪圖負責人員工編號', example: 'STAFF001', required: false })
  @Column({ 
    type: 'varchar',
    length: 10,
    nullable: true, 
    name: 'drawing_staff_id' 
  })
  drawingStaffId?: string;

  @ApiProperty({ description: '圖號', example: 'DWG-2024-001', required: false })
  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    name: 'drawing_number',
  })
  drawingNumber?: string;

  @ApiProperty({ description: '是否已排版', example: false })
  @Column({
    type: 'boolean',
    default: false,
    name: 'is_nested',
  })
  isNested: boolean;

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
  @ApiProperty({ description: '關聯的訂貨單資料', type: () => Order })
  @ManyToOne(() => Order, (order) => order.orderItems, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  // 關聯到 Staff（繪圖負責人，可為 null）
  @ApiProperty({ description: '關聯的繪圖負責人員工資料', type: () => Staff, required: false })
  @ManyToOne(() => Staff, { nullable: true })
  @JoinColumn({ name: 'drawing_staff_id' })
  drawingStaff?: Staff;
}
