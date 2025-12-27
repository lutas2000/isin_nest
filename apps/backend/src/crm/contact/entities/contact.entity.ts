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
import { Customer } from '../../customer/entities/customer.entity';

@Entity('contact')
export class Contact {
  @ApiProperty({ description: '聯絡人ID', example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: '姓名', example: '王大明' })
  @Column({
    type: 'varchar',
    length: 50,
    charset: 'utf8mb4',
    collation: 'utf8mb4_unicode_ci',
  })
  name: string;

  @ApiProperty({ description: '電話（多個）', example: ['02-1234-5678', '0912-345-678'] })
  @Column('json', { nullable: true })
  phones?: string[];

  @ApiProperty({ description: 'Email', example: 'contact@company.com' })
  @Column({
    type: 'varchar',
    length: 200,
    nullable: true,
  })
  email?: string;

  @ApiProperty({ description: '客戶ID', example: 'CUST001' })
  @Column({ type: 'varchar', length: 50, name: 'customer_id' })
  customerId: string;

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

  // 關聯到 Customer（多對一）
  @ApiProperty({ description: '關聯的客戶資料', type: () => Customer })
  @ManyToOne(() => Customer, (customer) => customer.contacts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;
}

