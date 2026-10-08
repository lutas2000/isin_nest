import { Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import {
  CreatedAtColumn,
  LEGACY_CRM_SCHEMA,
  TextColumn,
  UpdatedAtColumn,
} from '../common/columns';

/**
 * 材質建檔（master.mdb 的 kind 表）。isin_vb6 的 code、density、notes 欄從未有值，不搬；
 * 舊 `name` 欄改名為 product_name（畫面上的「品名」）。
 */
@Entity({ schema: LEGACY_CRM_SCHEMA, name: 'materials' })
@Index(['material', 'thickness'])
export class LegacyMaterial {
  @PrimaryGeneratedColumn()
  id: number;

  @TextColumn(50) material: string;
  @TextColumn(30) thickness: string;
  @TextColumn(100) product_name: string;
  @TextColumn(50) category: string;
  @CreatedAtColumn() created_at: Date;
  @UpdatedAtColumn() updated_at: Date;
}
