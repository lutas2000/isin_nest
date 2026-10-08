import {
  Entity,
  PrimaryColumn,
  Column,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../../auth/entities/user.entity';

@Entity('staff')
export class Staff {
  @ApiProperty({ description: '員工編號', example: 'STAFF001' })
  @PrimaryColumn({ type: 'varchar', length: 10 })
  id: string;

  @ApiProperty({ description: '關聯的用戶ID', required: false, example: 1 })
  @Column({ type: 'int', nullable: true })
  userId?: number;

  @ApiProperty({ description: '姓名', example: '張三' })
  @Column({ type: 'varchar', length: 6 })
  name: string;

  @ApiProperty({ description: '職稱', required: false, example: '工程師' })
  @Column({ type: 'varchar', length: 8, nullable: true })
  post?: string;

  @ApiProperty({ description: '工作群組', required: false, example: '現場' })
  @Column({ type: 'varchar', length: 4, nullable: true })
  work_group?: string;

  @ApiProperty({ description: '部門', required: false, example: '生產部' })
  @Column({ type: 'varchar', length: 4, nullable: true })
  department?: string;

  @ApiProperty({ description: '本薪', example: 50000 })
  @Column({ type: 'int' })
  wage: number;

  @ApiProperty({ description: '勤務津貼', example: 5000 })
  @Column({ type: 'int' })
  allowance: number;

  @ApiProperty({ description: '幹部加給', example: 3000 })
  @Column({ type: 'int' })
  organizer: number;

  @ApiProperty({ description: '勞保', example: 2000 })
  @Column({ type: 'int' })
  labor_insurance: number;

  @ApiProperty({ description: '健保', example: 1500 })
  @Column({ type: 'int' })
  health_insurance: number;

  @ApiProperty({ description: '退休提撥', example: 3000 })
  @Column({ type: 'int' })
  pension: number;

  @ApiProperty({ description: '是否為外勞', example: false })
  @Column({ type: 'boolean', default: false })
  is_foreign: boolean;

  @ApiProperty({ description: '是否參加福委會', example: true })
  @Column({ type: 'boolean', default: false })
  benifit: boolean;

  @ApiProperty({ description: '是否需要打卡', example: true })
  @Column({ type: 'boolean', default: true })
  need_check: boolean;

  @ApiProperty({ description: '到職日期', example: '2023-01-01' })
  @Column({ type: 'date' })
  begain_work: Date;

  @ApiProperty({ description: '離職日期', required: false, example: '2024-12-31' })
  @Column({ type: 'date', nullable: true })
  stop_work?: Date;

  @ApiProperty({ description: '是否需要外帳', example: false })
  @Column({ type: 'boolean', default: false })
  have_fake: boolean;

  @ApiProperty({
    description:
      '舊版銷管員工編號（單據上的業務、經手人編號）；沒有的員工不能在舊版銷管選用',
    required: false,
    example: 'A01',
  })
  @Column({ type: 'varchar', length: 10, nullable: true, unique: true })
  legacy_crm_code?: string;

  @OneToOne(() => User, (user) => user.staff, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user?: User;
}
