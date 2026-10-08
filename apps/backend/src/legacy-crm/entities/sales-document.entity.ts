import {
  Check,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  Unique,
} from 'typeorm';
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

/** 出貨登錄（sold.mdb 的 gtable／itable）。 */
@Entity({ schema: LEGACY_CRM_SCHEMA, name: 'sales_documents' })
@Check(`"sale_no" <> ''`)
@Index(['sale_date', 'sale_no'])
@Index(['customer_code', 'sale_date'])
export class LegacySalesDocument {
  @KeyColumn(10)
  sale_no: string;

  @RocDateColumn() sale_date: string | null;
  @RocDateRawColumn() sale_date_raw: string | null;
  @RocDateColumn() legacy_date_e: string | null;
  @RocDateRawColumn() legacy_date_e_raw: string | null;
  @TextColumn(10) customer_code: string;
  @TextColumn(10) customer_name: string;
  @TextColumn(10) actor_no: string;
  @TextColumn(10) actor_name: string;
  @TextColumn(10) linked_order_no: string;
  @TextColumn(10) payment_method: string;
  @TextColumn(10) delivery_method: string;
  @TextColumn(30) invoice_number: string;
  @TextColumn(60) shipping_address: string;
  @TextColumn(50) note: string;
  @UnitsColumn() amount_units: number;
  @TextColumn(10) tax_mode: string;
  @UnitsColumn() tax_units: number;
  @UnitsColumn() discount_units: number;
  @UnitsColumn() total_units: number;
  @UnitsColumn() received_units: number;
  @CreatedAtColumn() created_at: Date;
  @UpdatedAtColumn() updated_at: Date;

  @OneToMany(() => LegacySalesItem, (item) => item.document)
  items: LegacySalesItem[];
}

@Entity({ schema: LEGACY_CRM_SCHEMA, name: 'sales_items' })
@Check(`"line_no" BETWEEN 1 AND 99`)
@Unique(['sale_no', 'legacy_sn'])
@Index(['drawing_no', 'customer_model'])
export class LegacySalesItem {
  @KeyColumn(10)
  sale_no: string;

  @PrimaryColumn({ type: 'smallint' })
  line_no: number;

  @TextColumn(2) legacy_sn: string;
  @RocDateColumn() legacy_date_r: string | null;
  @RocDateRawColumn() legacy_date_r_raw: string | null;
  @TextColumn(10) legacy_factor_no: string;
  @TextColumn(10) legacy_factor: string;
  @TextColumn(10) drawing_no: string;
  @TextColumn(40) customer_model: string;
  @TextColumn(10) material: string;
  @TextColumn(6) thickness: string;
  @TextColumn(10) outsource: string;
  @UnitsColumn() quantity_units: number;
  @TextColumn(4) unit: string;
  @UnitsColumn() unit_price_units: number;
  @UnitsColumn() line_total_units: number;

  @ManyToOne(() => LegacySalesDocument, (document) => document.items, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'sale_no' })
  document: LegacySalesDocument;
}
