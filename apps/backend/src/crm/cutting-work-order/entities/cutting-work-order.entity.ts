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
import { CuttingWorkOrderStatus } from '../../enums/work-order-status.enum';

@Entity('cutting_work_order')
export class CuttingWorkOrder {
  @ApiProperty({ description: '切割工作單ID', example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: '訂貨單ID', example: 'ORD001' })
  @Column({
    type: 'varchar',
    length: 50,
    name: 'order_id',
  })
  orderId: string;

  @ApiProperty({ description: '排版ID', example: 1, required: false })
  @Column({
    type: 'int',
    name: 'nesting_id',
    nullable: true,
  })
  nestingId?: number;

  @ApiProperty({ description: '指派人員員工編號', example: 'STAFF001', required: false })
  @Column({
    type: 'varchar',
    length: 10,
    name: 'assigned_staff_id',
    nullable: true,
  })
  assignedStaffId?: string;

  @ApiProperty({ description: '機台識別', example: 'LASER-01', required: false })
  @Column({
    type: 'varchar',
    length: 50,
    name: 'machine_id',
    nullable: true,
  })
  machineId?: string;

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

  @ApiProperty({ description: '狀態', enum: CuttingWorkOrderStatus, example: CuttingWorkOrderStatus.PENDING })
  @Column({
    type: 'varchar',
    length: 50,
    default: CuttingWorkOrderStatus.PENDING,
  })
  status: CuttingWorkOrderStatus;

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

  // 關聯到 Staff (指派人員)
  @ManyToOne(() => Staff, { nullable: true })
  @JoinColumn({ name: 'assigned_staff_id' })
  assignedStaff?: Staff;
}
