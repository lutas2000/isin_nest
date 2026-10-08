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

/** 訂貨登錄（order.mdb 的 gtable／itable）。舊表明細重複存表頭的客戶與日期，照原樣保留在 legacy_* 欄。 */
@Entity({ schema: LEGACY_CRM_SCHEMA, name: 'order_documents' })
@Check(`"order_no" <> ''`)
@Index(['order_date', 'order_no'])
@Index(['customer_code', 'order_date'])
export class LegacyOrderDocument {
  @KeyColumn(10)
  order_no: string;

  @RocDateColumn() order_date: string | null;
  @RocDateRawColumn() order_date_raw: string | null;
  @RocDateColumn() delivery_date: string | null;
  @RocDateRawColumn() delivery_date_raw: string | null;
  @TextColumn(10) customer_code: string;
  @TextColumn(10) customer_name: string;
  @TextColumn(10) actor_no: string;
  @TextColumn(10) actor_name: string;
  @TextColumn(10) payment_method: string;
  @TextColumn(10) delivery_method: string;
  @TextColumn(20) note: string;
  @TextColumn(10) note2: string;
  @TextColumn(2) closed: string;
  @TextColumn(1) legacy_xx: string;
  @CreatedAtColumn() created_at: Date;
  @UpdatedAtColumn() updated_at: Date;

  @OneToMany(() => LegacyOrderItem, (item) => item.document)
  items: LegacyOrderItem[];
}

@Entity({ schema: LEGACY_CRM_SCHEMA, name: 'order_items' })
@Check(`"line_no" BETWEEN 1 AND 99`)
@Unique(['order_no', 'legacy_sn'])
@Index(['drawing_no', 'customer_model'])
export class LegacyOrderItem {
  @KeyColumn(10)
  order_no: string;

  @PrimaryColumn({ type: 'smallint' })
  line_no: number;

  @TextColumn(2) legacy_sn: string;
  @RocDateColumn() legacy_date_r: string | null;
  @RocDateRawColumn() legacy_date_r_raw: string | null;
  @RocDateColumn() legacy_date_e: string | null;
  @RocDateRawColumn() legacy_date_e_raw: string | null;
  @TextColumn(10) legacy_factor_no: string;
  @TextColumn(10) legacy_factor: string;
  @TextColumn(10) legacy_d_dwgok: string;
  @TextColumn(10) drawing_no: string;
  @TextColumn(40) customer_model: string;
  @TextColumn(10) material: string;
  @TextColumn(4) thickness: string;
  @TextColumn(10) outsource: string;
  @TextColumn(4) source: string;
  @TextColumn(50) post_process: string;
  @UnitsColumn() quantity_units: number;
  @TextColumn(4) unit: string;
  @UnitsColumn() shipped_quantity_units: number;

  @ManyToOne(() => LegacyOrderDocument, (document) => document.items, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'order_no' })
  document: LegacyOrderDocument;
}
