import { Entity } from 'typeorm';
import { BaseManhour } from './base-manhour.entity';

@Entity('staff_manhour2') // 表名為 staff_manhour2 (內帳使用)
export class StaffManhour2 extends BaseManhour {}
