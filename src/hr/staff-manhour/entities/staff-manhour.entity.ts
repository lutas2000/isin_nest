import { Entity } from 'typeorm';
import { BaseManhour } from './base-manhour.entity';

@Entity('staff_manhour') // 表名為 staff_manhour
export class StaffManhour extends BaseManhour {}
