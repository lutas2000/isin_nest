import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('crm_config')
@Index(['category', 'code'], { unique: true })
export class CrmConfig {
  @ApiProperty({ description: '設定 ID', example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: '分類', example: 'shipping_method' })
  @Column({ type: 'varchar', length: 50 })
  category: string;

  @ApiProperty({ description: '代碼', example: 'EXPRESS' })
  @Column({ type: 'varchar', length: 50 })
  code: string;

  @ApiProperty({ description: '顯示名稱', example: '快遞' })
  @Column({
    type: 'varchar',
    length: 100,
    charset: 'utf8mb4',
    collation: 'utf8mb4_unicode_ci',
  })
  label: string;

  @ApiProperty({ description: '排序', example: 1 })
  @Column({ type: 'int', name: 'display_order', default: 0 })
  displayOrder: number;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime', name: 'updated_at' })
  updatedAt: Date;
}







