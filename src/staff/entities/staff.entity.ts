import { Entity, PrimaryColumn, Column, OneToOne } from 'typeorm';
import { User } from '../../auth/entities/user.entity';

@Entity('staff') // 表名為 staff
export class Staff {
  @PrimaryColumn({ type: 'varchar', length: 10 })
  id: string; // 員工編號

  @Column({ type: 'varchar', length: 6 })
  name: string; // 姓名

  @Column({ type: 'varchar', length: 8, nullable: true })
  post?: string; // 職稱（允許 NULL 值）

  @Column({ type: 'varchar', length: 4, nullable: true })
  work_group?: string; // 工作組別（允許 NULL 值）

  @Column({ type: 'varchar', length: 4, nullable: true })
  department?: string; // 部門（允許 NULL 值）

  @Column({ type: 'int', default: 0 })
  wage: number; // 本薪

  @Column({ type: 'int', default: 0 })
  allowance: number; // 勤務津貼

  @Column({ type: 'int', default: 0 })
  organizer: number; // 幹部加給

  @Column({ type: 'int', default: 0 })
  labor_insurance: number; // 勞保

  @Column({ type: 'int', default: 0 })
  health_insurance: number; // 健保

  @Column({ type: 'int', default: 0 })
  pension: number; // 退休提撥

  @Column({ type: 'tinyint', width: 1, default: 0 })
  is_foreign: boolean; // 是否為外勞（tinyint 1）

  @Column({ type: 'tinyint', width: 1, default: 0 })
  benifit: boolean; // 是否參加福利會（tinyint 1）

  @Column({ type: 'tinyint', width: 1, default: 1 })
  need_check: boolean; // 是否需要打卡（tinyint 1）

  @Column({ type: 'date', nullable: true })
  begain_work?: Date; // 到職日期（允許 NULL 值）

  @Column({ type: 'date', nullable: true })
  stop_work?: Date; // 離職日期（允許 NULL 值）

  @Column({ type: 'tinyint', width: 1, default: 0 })
  have_fake: boolean; // 是否需要外帳（tinyint 1）

  @OneToOne(() => User, user => user.staff)
  user?: User;
}
