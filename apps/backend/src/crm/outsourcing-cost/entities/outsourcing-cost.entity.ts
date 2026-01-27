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
import { OutsourcingWorkOrder } from '../../outsourcing-work-order/entities/outsourcing-work-order.entity';
import { numericTransformer } from '../../../common/transformers/numeric.transformer';

@Entity('outsourcing_cost')
export class OutsourcingCost {
  @ApiProperty({ description: '委外成本ID', example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: '委外加工工作單ID', example: 1 })
  @Column({
    type: 'int',
    name: 'outsourcing_work_order_id',
  })
  outsourcingWorkOrderId: number;

  @ApiProperty({ description: '成本類型', example: '加工費' })
  @Column({
    type: 'varchar',
    length: 100,
    name: 'cost_type',
  })
  costType: string;

  @ApiProperty({ description: '金額', example: 1000 })
  @Column({
    type: 'numeric',
    precision: 15,
    scale: 2,
    default: 0,
    transformer: numericTransformer,
  })
  amount: number;

  @ApiProperty({ description: '說明', required: false })
  @Column({
    type: 'text',
    nullable: true,
  })
  description?: string;

  @ApiProperty({ description: '發票號碼', example: 'AB12345678', required: false })
  @Column({
    type: 'varchar',
    length: 50,
    name: 'invoice_number',
    nullable: true,
  })
  invoiceNumber?: string;

  @ApiProperty({ description: '發票日期', required: false })
  @Column({
    type: 'date',
    name: 'invoice_date',
    nullable: true,
  })
  invoiceDate?: Date;

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

  // 關聯到 OutsourcingWorkOrder
  @ManyToOne(() => OutsourcingWorkOrder, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'outsourcing_work_order_id' })
  outsourcingWorkOrder: OutsourcingWorkOrder;
}
