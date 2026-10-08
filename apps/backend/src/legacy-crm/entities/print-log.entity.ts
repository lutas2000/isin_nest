import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { LEGACY_CRM_SCHEMA } from '../common/columns';

export type LegacyPrintKind =
  | 'document_preview'
  | 'document_print'
  | 'report_query'
  | 'report_print'
  | 'statement_print';

/**
 * 列印與報表查詢紀錄：單據開啟預覽、按「印出」各記一次；報表在後端回傳結果時記錄。
 * 只存條件與筆數，不存報表內容。
 */
@Entity({ schema: LEGACY_CRM_SCHEMA, name: 'print_log' })
@Check(
  `"kind" IN ('document_preview', 'document_print', 'report_query', 'report_print', 'statement_print')`,
)
@Index(['occurred_at'])
@Index(['kind', 'target', 'occurred_at'])
@Index(['user_id', 'occurred_at'])
export class LegacyPrintLog {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @CreateDateColumn({ type: 'timestamptz' })
  occurred_at: Date;

  @Column({ type: 'int', nullable: true })
  user_id: number | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  staff_id: string | null;

  @Column({ type: 'uuid', nullable: true })
  request_id: string | null;

  @Column({ type: 'jsonb', nullable: true })
  client: unknown;

  @Column({ type: 'varchar', length: 20 })
  kind: LegacyPrintKind;

  /** 單據種類（訂貨單、出貨單、工作單、估價單、標籤、信封）或報表名稱 */
  @Column({ type: 'varchar', length: 40 })
  target: string;

  /** 單號 */
  @Column({ type: 'varchar', length: 60, nullable: true })
  entity_key: string | null;

  /** 報表條件：日期起迄、客戶起迄、品號起迄 */
  @Column({ type: 'jsonb', nullable: true })
  criteria: unknown;

  @Column({ type: 'int', nullable: true })
  row_count: number | null;

  @Column({ type: 'int', nullable: true })
  page_count: number | null;
}
