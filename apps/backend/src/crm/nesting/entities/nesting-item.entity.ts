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
import { Nesting } from './nesting.entity';
import { OrderItem } from '../../order-item/entities/order-item.entity';

@Entity('nesting_item')
export class NestingItem {
  @ApiProperty({ description: '排版工件ID', example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: '排版ID', example: 1 })
  @Column({
    type: 'int',
    name: 'nesting_id',
  })
  nestingId: number;

  @ApiProperty({ description: '訂貨單工件ID', example: 1 })
  @Column({
    type: 'int',
    name: 'order_item_id',
  })
  orderItemId: number;

  @ApiProperty({ description: '此排版中的數量', example: 5 })
  @Column({
    type: 'int',
    default: 1,
  })
  quantity: number;

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

  // 關聯到 Nesting
  @ManyToOne(() => Nesting, (nesting) => nesting.nestingItems, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'nesting_id' })
  nesting: Nesting;

  // 關聯到 OrderItem
  @ManyToOne(() => OrderItem, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_item_id' })
  orderItem: OrderItem;
}
