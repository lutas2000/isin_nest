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
import { Nesting } from './nesting.entity';

@Entity('nesting_item')
export class NestingItem {
  @ApiProperty({ description: '排版工件ID（文字）', example: 'NSTI-20260206-001' })
  @PrimaryColumn({
    type: 'text',
  })
  id: string;

  @ApiProperty({ description: '此排版中的數量', example: 5 })
  @Column({
    type: 'int',
    default: 1,
  })
  quantity: number;

  @ApiProperty({
    description: '單一工件加工時間（秒）',
    example: 122,
    required: false,
  })
  @Column({
    type: 'int',
    nullable: true,
    name: 'processing_time_seconds',
  })
  processingTime?: number;

  @ApiProperty({ description: '工件 X 尺寸', example: 470, required: false })
  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  x?: number;

  @ApiProperty({ description: '工件 Y 尺寸', example: 495, required: false })
  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  y?: number;

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
}
