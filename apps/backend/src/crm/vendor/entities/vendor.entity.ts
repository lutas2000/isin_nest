import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('vendor')
export class Vendor {
  @ApiProperty({ description: '廠商 ID', example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: '廠商名稱', example: '永順加工廠' })
  @Column({
    type: 'varchar',
    length: 200,
  })
  name: string;

  @ApiProperty({ description: '聯絡人', example: '王先生' })
  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    name: 'contact_name',
  })
  contactName?: string;

  @ApiProperty({ description: '電話', example: '02-1234-5678' })
  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  phone?: string;

  @ApiProperty({ description: '地址', example: '台北市中山區中山北路一段100號' })
  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  address?: string;

  @ApiProperty({ description: '備註', example: '專做電鍍加工' })
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
}
