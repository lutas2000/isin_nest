import { Check, Column, Entity, Index, PrimaryColumn } from 'typeorm';
import {
  CreatedAtColumn,
  LEGACY_CRM_SCHEMA,
  TextColumn,
  UnitsColumn,
  UpdatedAtColumn,
} from '../common/columns';

/** 銀行建檔（bank.mdb 的 BANK 表），含支票列印位置設定。 */
@Entity({ schema: LEGACY_CRM_SCHEMA, name: 'banks' })
@Check(`"code" <> ''`)
@Index(['full_name', 'code'])
export class LegacyBank {
  @PrimaryColumn({ type: 'varchar', length: 10 })
  code: string;

  @TextColumn(10) short_name: string;
  @TextColumn(30) full_name: string;
  @TextColumn(20) contact: string;
  @TextColumn(20) phone1: string;
  @TextColumn(20) phone2: string;
  @TextColumn(60) address: string;
  @TextColumn(30) legacy_bono: string;
  @TextColumn(20) legacy_boname: string;
  @TextColumn(8) account_no: string;
  @TextColumn(30) account_name: string;
  @UnitsColumn() balance_units: number;
  @TextColumn(40) notes: string;

  /** 支票列印位置：{ corrections: {x, y}, fields: { <欄位>: { layout1: {x, y}, layout2: {x, y} } } } */
  @Column({ type: 'jsonb', default: () => "'{}'" })
  check_layout: Record<string, unknown>;

  @CreatedAtColumn() created_at: Date;
  @UpdatedAtColumn() updated_at: Date;
}
