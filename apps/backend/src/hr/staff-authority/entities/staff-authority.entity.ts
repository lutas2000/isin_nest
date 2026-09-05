import { Entity, PrimaryColumn, Column } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('staff_authority')
export class StaffAuthority {
  @ApiProperty({ description: '員工編號', example: 'STAFF001' })
  @PrimaryColumn({ type: 'varchar', length: 10 })
  id: string;

  @ApiProperty({ description: 'root 權限', example: 0 })
  @Column({ type: 'int' })
  root: number;

  @ApiProperty({ description: 'manage 權限', example: 0 })
  @Column({ type: 'int' })
  manage: number;

  @ApiProperty({ description: 'cut 權限', example: 0 })
  @Column({ type: 'int' })
  cut: number;

  @ApiProperty({ description: 'order 權限', example: 0 })
  @Column({ type: 'int' })
  order: number;

  @ApiProperty({ description: 'material 權限', example: 0 })
  @Column({ type: 'int' })
  material: number;

  @ApiProperty({ description: 'dwg 權限', example: 0 })
  @Column({ type: 'int' })
  dwg: number;

  @ApiProperty({ description: '群組', required: false, example: 'A' })
  @Column({ type: 'varchar', length: 5, nullable: true })
  group: string | null;
}
