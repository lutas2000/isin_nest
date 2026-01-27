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
import { OrderItem } from '../../order-item/entities/order-item.entity';
import { Staff } from '../../../hr/staff/entities/staff.entity';
import { DesignWorkOrderStatus } from '../../enums/work-order-status.enum';

@Entity('design_work_order')
export class DesignWorkOrder {
  @ApiProperty({ description: '設計工作單ID', example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: '訂貨單ID', example: 'ORD001' })
  @Column({
    type: 'varchar',
    length: 50,
    name: 'order_id',
  })
  orderId: string;

  @ApiProperty({ description: '訂貨單工件ID', example: 1 })
  @Column({
    type: 'int',
    name: 'order_item_id',
  })
  orderItemId: number;

  @ApiProperty({ description: '指派設計師員工編號', example: 'STAFF001', required: false })
  @Column({
    type: 'varchar',
    length: 10,
    name: 'assigned_staff_id',
    nullable: true,
  })
  assignedStaffId?: string;

  @ApiProperty({ description: '設計主管員工編號', example: 'STAFF002', required: false })
  @Column({
    type: 'varchar',
    length: 10,
    name: 'supervisor_staff_id',
    nullable: true,
  })
  supervisorStaffId?: string;

  @ApiProperty({ description: '圖號', example: 'DWG-2024-001', required: false })
  @Column({
    type: 'varchar',
    length: 100,
    name: 'drawing_number',
    nullable: true,
  })
  drawingNumber?: string;

  @ApiProperty({ description: '客戶圖面檔案', example: 'customer_file.pdf', required: false })
  @Column({
    type: 'varchar',
    length: 500,
    name: 'customer_file',
    nullable: true,
  })
  customerFile?: string;

  @ApiProperty({ description: 'CAD 檔案 (DWG)', example: 'design.dwg', required: false })
  @Column({
    type: 'varchar',
    length: 500,
    name: 'cad_file',
    nullable: true,
  })
  cadFile?: string;

  @ApiProperty({ description: 'CNC 檔案', example: 'cnc_output.nc', required: false })
  @Column({
    type: 'varchar',
    length: 500,
    name: 'cnc_file',
    nullable: true,
  })
  cncFile?: string;

  @ApiProperty({ description: '狀態', enum: DesignWorkOrderStatus, example: DesignWorkOrderStatus.PENDING })
  @Column({
    type: 'varchar',
    length: 50,
    default: DesignWorkOrderStatus.PENDING,
  })
  status: DesignWorkOrderStatus;

  @ApiProperty({ description: '優先順序', example: 1 })
  @Column({
    type: 'int',
    default: 0,
  })
  priority: number;

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

  @Column({
    type: 'timestamptz',
    name: 'completed_at',
    nullable: true,
  })
  completedAt?: Date;

  // 關聯到 Order
  @ManyToOne(() => Order, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  // 關聯到 OrderItem
  @ManyToOne(() => OrderItem, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_item_id' })
  orderItem: OrderItem;

  // 關聯到 Staff (指派設計師)
  @ManyToOne(() => Staff, { nullable: true })
  @JoinColumn({ name: 'assigned_staff_id' })
  assignedStaff?: Staff;

  // 關聯到 Staff (設計主管)
  @ManyToOne(() => Staff, { nullable: true })
  @JoinColumn({ name: 'supervisor_staff_id' })
  supervisorStaff?: Staff;
}
