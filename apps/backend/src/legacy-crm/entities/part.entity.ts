import { Check, Entity } from 'typeorm';
import {
  CreatedAtColumn,
  KeyColumn,
  LEGACY_CRM_SCHEMA,
  RocDateColumn,
  RocDateRawColumn,
  TextColumn,
  UnitsColumn,
  UpdatedAtColumn,
} from '../common/columns';

/** 工件建檔（dcst.mdb 的 dcst 表）。 */
@Entity({ schema: LEGACY_CRM_SCHEMA, name: 'parts' })
@Check(`"drawing_no" <> ''`)
export class LegacyPart {
  @KeyColumn(10)
  drawing_no: string;

  @TextColumn(30) drawing_name: string;
  @TextColumn(40) drawing_ref: string;
  @TextColumn(10) customer_code: string;
  @TextColumn(40) customer_model: string;
  @TextColumn(10) material: string;
  @TextColumn(4) thickness: string;
  @TextColumn(2) unit: string;
  @UnitsColumn() price_ref_units: number;
  @UnitsColumn() price1_units: number;
  @UnitsColumn() price2_units: number;
  @UnitsColumn() price3_units: number;
  @UnitsColumn() price4_units: number;
  @UnitsColumn() price5_units: number;
  @TextColumn(6) actor_no: string;
  @TextColumn(8) actor: string;
  @RocDateColumn() drawing_date: string | null;
  @RocDateRawColumn() drawing_date_raw: string | null;
  @TextColumn(50) directory_path: string;
  @TextColumn(30) cnc1: string;
  @TextColumn(30) cnc2: string;
  @TextColumn(12) cnc3: string;
  @TextColumn(12) cnc4: string;
  @TextColumn(50) cnc5: string;
  @TextColumn(50) notes: string;
  @TextColumn(1) yy: string;
  @CreatedAtColumn() created_at: Date;
  @UpdatedAtColumn() updated_at: Date;
}
