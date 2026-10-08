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

/** 收款登錄（gotten.mdb 的 dcmy／check／dcrf）。 */
@Entity({ schema: LEGACY_CRM_SCHEMA, name: 'receipt_documents' })
@Check(`"receipt_no" <> ''`)
@Index(['receipt_date', 'receipt_no'])
@Index(['customer_code', 'receipt_date'])
export class LegacyReceiptDocument {
  @PrimaryColumn({ type: 'varchar', length: 10 })
  receipt_no: string;

  @RocDateColumn() receipt_date: string | null;
  @RocDateRawColumn() receipt_date_raw: string | null;
  @RocDateColumn() closing_date: string | null;
  @RocDateRawColumn() closing_date_raw: string | null;
  @TextColumn(10) customer_code: string;
  @TextColumn(10) customer_name: string;
  @TextColumn(10) actor_no: string;
  @TextColumn(10) actor_name: string;
  @UnitsColumn() current_received_units: number;
  @UnitsColumn() current_merchandise_units: number;
  @UnitsColumn() current_tax_units: number;
  @UnitsColumn() current_discount_units: number;
  @UnitsColumn() previous_advance_units: number;
  @UnitsColumn() previous_unpaid_units: number;
  @UnitsColumn() current_advance_units: number;
  @UnitsColumn() current_unpaid_units: number;
  @CreatedAtColumn() created_at: Date;
  @UpdatedAtColumn() updated_at: Date;

  @OneToMany(() => LegacyReceiptPaymentLine, (line) => line.document)
  payments: LegacyReceiptPaymentLine[];

  @OneToMany(() => LegacyReceiptAllocationLine, (line) => line.document)
  allocations: LegacyReceiptAllocationLine[];
}

@Entity({ schema: LEGACY_CRM_SCHEMA, name: 'receipt_payment_lines' })
@Check(`"line_no" BETWEEN 1 AND 99`)
export class LegacyReceiptPaymentLine {
  @PrimaryColumn({ type: 'varchar', length: 10 })
  receipt_no: string;

  @PrimaryColumn({ type: 'smallint' })
  line_no: number;

  @TextColumn(10) category: string;
  @UnitsColumn() amount_units: number;
  @TextColumn(30) check_number: string;
  @RocDateColumn() check_date: string | null;
  @RocDateRawColumn() check_date_raw: string | null;
  @TextColumn(30) bank_account: string;
  @TextColumn(20) collect_agent: string;
  @TextColumn(20) bank_short_name: string;
  @TextColumn(40) note: string;

  @ManyToOne(() => LegacyReceiptDocument, (document) => document.payments, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'receipt_no' })
  document: LegacyReceiptDocument;
}

/** 沖帳明細；舊版會列出客戶所有未收的出貨，一張收款最多 999 列。 */
@Entity({ schema: LEGACY_CRM_SCHEMA, name: 'receipt_allocation_lines' })
@Check(`"line_no" BETWEEN 1 AND 999`)
@Index(['sale_no'])
export class LegacyReceiptAllocationLine {
  @PrimaryColumn({ type: 'varchar', length: 10 })
  receipt_no: string;

  @PrimaryColumn({ type: 'smallint' })
  line_no: number;

  @TextColumn(10) sale_no: string;
  @UnitsColumn() merchandise_units: number;
  @UnitsColumn() tax_units: number;
  @UnitsColumn() discount_units: number;
  @UnitsColumn() receivable_units: number;
  @UnitsColumn() unpaid_units: number;
  @UnitsColumn() offset_units: number;
  @UnitsColumn() previously_offset_units: number;

  @ManyToOne(() => LegacyReceiptDocument, (document) => document.allocations, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'receipt_no' })
  document: LegacyReceiptDocument;
}
