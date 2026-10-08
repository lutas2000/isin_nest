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
  LEGACY_CRM_SCHEMA,
  RocDateColumn,
  RocDateRawColumn,
  TextColumn,
  UnitsColumn,
  UpdatedAtColumn,
} from '../common/columns';

/** 工作登錄（workplan.mdb 的 gtable／itable）。 */
@Entity({ schema: LEGACY_CRM_SCHEMA, name: 'work_documents' })
@Check(`"work_no" <> ''`)
@Index(['transfer_date', 'work_no'])
@Index(['customer_code', 'transfer_date'])
export class LegacyWorkDocument {
  @PrimaryColumn({ type: 'varchar', length: 10 })
  work_no: string;

  @RocDateColumn() transfer_date: string | null;
  @RocDateRawColumn() transfer_date_raw: string | null;
  @TextColumn(10) customer_code: string;
  @TextColumn(10) customer_name: string;
  @TextColumn(10) actor_no: string;
  @TextColumn(10) actor_name: string;
  @TextColumn(10) order_no: string;
  @CreatedAtColumn() created_at: Date;
  @UpdatedAtColumn() updated_at: Date;

  @OneToMany(() => LegacyWorkItem, (item) => item.document)
  items: LegacyWorkItem[];
}

@Entity({ schema: LEGACY_CRM_SCHEMA, name: 'work_items' })
@Check(`"line_no" BETWEEN 1 AND 99`)
@Index(['drawing_no', 'material', 'thickness'])
export class LegacyWorkItem {
  @PrimaryColumn({ type: 'varchar', length: 10 })
  work_no: string;

  @PrimaryColumn({ type: 'smallint' })
  line_no: number;

  @TextColumn(10) drawing_no: string;
  @TextColumn(10) material: string;
  @TextColumn(6) thickness: string;
  @TextColumn(10) outsource: string;
  @UnitsColumn() order_quantity_units: number;
  @UnitsColumn() completed_quantity_units: number;
  @TextColumn(10) cnc_ok: string;
  @TextColumn(20) plating_work: string;
  @TextColumn(50) post_process: string;
  /** 該列來自的訂單（workplan.itable.RESERV）；一張工作單可由多張訂單轉入。 */
  @TextColumn(10) order_no: string;

  @ManyToOne(() => LegacyWorkDocument, (document) => document.items, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'work_no' })
  document: LegacyWorkDocument;
}
