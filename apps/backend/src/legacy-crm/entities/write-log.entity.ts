import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { LEGACY_CRM_SCHEMA } from '../common/columns';

export type LegacyWriteAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'rename'
  | 'import';

/**
 * legacy CRM 每次新增、修改、刪除的紀錄，由 service 在同一個 transaction 內寫入。
 * user_id 不設外鍵：紀錄要比使用者帳號活得久。正式移轉的匯入只記一筆 action = 'import' 的批次摘要。
 */
@Entity({ schema: LEGACY_CRM_SCHEMA, name: 'write_log' })
@Check(`"action" IN ('create', 'update', 'delete', 'rename', 'import')`)
@Index(['entity_type', 'entity_key', 'occurred_at'])
@Index(['occurred_at'])
@Index(['user_id', 'occurred_at'])
export class LegacyWriteLog {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @CreateDateColumn({ type: 'timestamptz' })
  occurred_at: Date;

  /** users.id；匯入等系統作業為 null */
  @Column({ type: 'int', nullable: true })
  user_id: number | null;

  /** 使用者綁定的 staff.id */
  @Column({ type: 'varchar', length: 10, nullable: true })
  staff_id: string | null;

  /** order_document、sales_document、partner… */
  @Column({ type: 'varchar', length: 40 })
  entity_type: string;

  /** 單號或編號；partner 為 `kind:code` */
  @Column({ type: 'varchar', length: 60 })
  entity_key: string;

  @Column({ type: 'varchar', length: 10 })
  action: LegacyWriteAction;

  /** 修改／刪除前整筆（含明細） */
  @Column({ type: 'jsonb', nullable: true })
  before: unknown;

  /** 新增／修改後整筆 */
  @Column({ type: 'jsonb', nullable: true })
  after: unknown;

  /** 連帶回寫：訂單出貨數差額、客戶最近交易日、銷貨已收金額 */
  @Column({ type: 'jsonb', nullable: true })
  side_effects: unknown;

  @Column({ type: 'uuid', nullable: true })
  request_id: string | null;

  /** IP、user agent、前端版本 */
  @Column({ type: 'jsonb', nullable: true })
  client: unknown;
}
