import {
  Check,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
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

/** 報價登錄（quote.mdb 的 gtable／itable／jtable）。 */
@Entity({ schema: LEGACY_CRM_SCHEMA, name: 'quote_documents' })
@Check(`"quote_no" <> ''`)
@Index(['quote_date', 'quote_no'])
@Index(['customer_code', 'quote_date'])
export class LegacyQuoteDocument {
  @KeyColumn(10)
  quote_no: string;

  @RocDateColumn() quote_date: string | null;
  @RocDateRawColumn() quote_date_raw: string | null;
  @TextColumn(10) customer_code: string;
  @TextColumn(10) customer_name: string;
  @TextColumn(10) actor_no: string;
  @TextColumn(10) actor_name: string;
  @TextColumn(40) attention: string;
  @TextColumn(1) legacy_xx: string;
  @UnitsColumn() total_units: number;
  @CreatedAtColumn() created_at: Date;
  @UpdatedAtColumn() updated_at: Date;

  @OneToMany(() => LegacyQuoteItem, (item) => item.document)
  items: LegacyQuoteItem[];

  @OneToMany(() => LegacyQuoteNoteLine, (line) => line.document)
  notes: LegacyQuoteNoteLine[];
}

@Entity({ schema: LEGACY_CRM_SCHEMA, name: 'quote_items' })
@Check(`"line_no" BETWEEN 1 AND 99`)
export class LegacyQuoteItem {
  @KeyColumn(10)
  quote_no: string;

  @PrimaryColumn({ type: 'smallint' })
  line_no: number;

  @TextColumn(40) customer_model: string;
  @TextColumn(10) material: string;
  @TextColumn(6) thickness: string;
  @TextColumn(250) summary: string;
  @UnitsColumn() quantity_units: number;
  @UnitsColumn() unit_price_units: number;
  @UnitsColumn() line_total_units: number;

  @ManyToOne(() => LegacyQuoteDocument, (document) => document.items, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'quote_no' })
  document: LegacyQuoteDocument;
}

@Entity({ schema: LEGACY_CRM_SCHEMA, name: 'quote_note_lines' })
@Check(`"line_no" BETWEEN 1 AND 99`)
export class LegacyQuoteNoteLine {
  @KeyColumn(10)
  quote_no: string;

  @PrimaryColumn({ type: 'smallint' })
  line_no: number;

  @TextColumn(250) note: string;

  @ManyToOne(() => LegacyQuoteDocument, (document) => document.notes, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'quote_no' })
  document: LegacyQuoteDocument;
}
