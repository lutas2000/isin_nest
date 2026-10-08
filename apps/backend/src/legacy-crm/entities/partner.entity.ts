import { Check, Entity, Index, PrimaryColumn } from 'typeorm';
import {
  CreatedAtColumn,
  LEGACY_CRM_SCHEMA,
  RocDateColumn,
  RocDateRawColumn,
  TextColumn,
  UnitsColumn,
  UpdatedAtColumn,
} from '../common/columns';

export type PartnerKind = 'customer' | 'supplier';

/** 客戶與廠商建檔（cust.mdb、supp.mdb 的 cust 表）。 */
@Entity({ schema: LEGACY_CRM_SCHEMA, name: 'partners' })
@Check(`"kind" IN ('customer', 'supplier')`)
@Check(`"code" <> ''`)
@Index(['kind', 'full_name'])
export class LegacyPartner {
  @PrimaryColumn({ type: 'varchar', length: 8 })
  kind: PartnerKind;

  @PrimaryColumn({ type: 'varchar', length: 10 })
  code: string;

  @TextColumn(100) full_name: string;
  @TextColumn(50) short_name: string;
  @TextColumn(50) responsible: string;
  @TextColumn(40) phone1: string;
  @TextColumn(40) phone2: string;
  @TextColumn(40) fax: string;
  @TextColumn(30) tax_id: string;
  @TextColumn(20) postal_code: string;
  @TextColumn(250) address: string;
  @TextColumn(250) shipping_address: string;
  @TextColumn(100) invoice_title: string;
  @TextColumn(30) invoice_tax_id: string;
  @TextColumn(100) bank_name: string;
  @TextColumn(100) bank_account: string;
  @TextColumn(50) contact1: string;
  @TextColumn(50) contact2: string;
  @TextColumn(50) contact3: string;
  @RocDateColumn() start_date: string | null;
  @RocDateRawColumn() start_date_raw: string | null;
  @RocDateColumn() latest_transaction_date: string | null;
  @RocDateRawColumn() latest_transaction_date_raw: string | null;
  @UnitsColumn() credit_limit_units: number;
  @UnitsColumn() balance_units: number;
  @TextColumn(150) email: string;
  @TextColumn(250) dxf_path: string;
  @TextColumn(100) main_product: string;
  @TextColumn(2000) notes: string;
  @CreatedAtColumn() created_at: Date;
  @UpdatedAtColumn() updated_at: Date;
}
