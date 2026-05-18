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

  @ApiProperty({ description: '快捷鍵代碼（單一字元）', example: 'E' })
  @Column({ type: 'varchar', length: 1 })
  code: string;

  @ApiProperty({ description: '顯示名稱', example: '快遞' })
  @Column({
    type: 'varchar',
    length: 100,
  })
  label: string;

  @ApiProperty({ description: '排序', example: 1 })
  @Column({ type: 'int', name: 'display_order', default: 0 })
  displayOrder: number;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}







