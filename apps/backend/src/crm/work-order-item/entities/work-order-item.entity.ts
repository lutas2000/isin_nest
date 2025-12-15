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
import { WorkOrder } from '../../work-order/entities/work-order.entity';
import { Staff } from '../../../hr/staff/entities/staff.entity';

@Entity('work_order_item')
export class WorkOrderItem {
  @ApiProperty({ description: '工單工件ID', example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: '工單ID', example: 'WO001' })
  @Column({ type: 'varchar', length: 50, name: 'work_order_id' })
  workOrderId: string;

  @ApiProperty({ description: 'CAD 檔案（檔案名稱）', example: 'design.dxf' })
  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    name: 'cad_file',
    charset: 'utf8mb4',
    collation: 'utf8mb4_unicode_ci',
  })
  cadFile?: string;

  @ApiProperty({ description: '客戶檔案（檔案名稱）', example: 'customer_file.dxf' })
  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    name: 'customer_file',
    charset: 'utf8mb4',
    collation: 'utf8mb4_unicode_ci',
  })
  customerFile?: string;

  @ApiProperty({ description: '材料', example: '不鏽鋼' })
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

  @ApiProperty({ description: '數量', example: 100 })
  @Column({ type: 'int', default: 0 })
  quantity: number;

  @ApiProperty({ description: '單位', example: '件' })
  @Column({
    type: 'varchar',
    length: 20,
    nullable: true,
    charset: 'utf8mb4',
    collation: 'utf8mb4_unicode_ci',
  })
  unit?: string;

  @ApiProperty({ description: '來源', example: 'NEW' })
  @Column({
    type: 'varchar',
    length: 50,
    charset: 'utf8mb4',
    collation: 'utf8mb4_unicode_ci',
  })
  source: string;

  @ApiProperty({ description: '加工', example: '雷射切割、折彎' })
  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    charset: 'utf8mb4',
    collation: 'utf8mb4_unicode_ci',
  })
  processing?: string;

  @ApiProperty({ description: '單價', example: 1000 })
  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0, name: 'unit_price' })
  unitPrice: number;

  @ApiProperty({ description: '估計切割時間（分鐘）', example: 120 })
  @Column({ type: 'int', nullable: true, name: 'estimated_cutting_time' })
  estimatedCuttingTime?: number;

  @ApiProperty({ description: '繪圖負責人員工編號', example: 'STAFF001', required: false })
  @Column({ type: 'varchar', length: 10, nullable: true, name: 'drawing_staff_id' })
  drawingStaffId?: string;

  @ApiProperty({ description: '狀態', example: 'TODO', required: false })
  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    charset: 'utf8mb4',
    collation: 'utf8mb4_unicode_ci',
  })
  status?: string;

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

  // 關聯到 WorkOrder（多對一）
  @ApiProperty({ description: '關聯的工單資料', type: () => WorkOrder })
  @ManyToOne(() => WorkOrder, (workOrder) => workOrder.workOrderItems)
  @JoinColumn({ name: 'work_order_id' })
  workOrder: WorkOrder;

  // 關聯到 Staff（繪圖負責人，可為 null）
  @ApiProperty({ description: '關聯的繪圖負責人員工資料', type: () => Staff, required: false })
  @ManyToOne(() => Staff, { nullable: true })
  @JoinColumn({ name: 'drawing_staff_id' })
  drawingStaff?: Staff;
}

