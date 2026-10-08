import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export const FEEDBACK_KINDS = ['bug', 'feature', 'question'] as const;
export type FeedbackKind = (typeof FEEDBACK_KINDS)[number];

export const FEEDBACK_STATUSES = [
  'open',
  'triaged',
  'in_progress',
  'done',
  'wont_fix',
] as const;
export type FeedbackStatus = (typeof FEEDBACK_STATUSES)[number];

/**
 * 使用者回報的 bug／需求／問題（LEGACY-CRM-REBUILD-PLAN.md 7.1）。新系統共用，觸發按鈕目前只在舊版銷管選單列。
 * user_id、assignee_user_id 不設外鍵：回報要比帳號活得久（與 legacy_crm.write_log 相同）。
 * 截圖只存 FEEDBACK_UPLOAD_DIR 底下的檔名（uuid.png），檔案不進資料庫，只有 admin 能讀。
 */
@Entity({ name: 'feedback_reports' })
@Check(`"kind" IN ('bug', 'feature', 'question')`)
@Check(`"status" IN ('open', 'triaged', 'in_progress', 'done', 'wont_fix')`)
@Index(['status', 'created_at'])
@Index(['created_at'])
export class FeedbackReport {
  @PrimaryGeneratedColumn()
  id: number;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  /** 回報者 users.id */
  @Column({ type: 'int' })
  user_id: number;

  @Column({ type: 'varchar', length: 10 })
  kind: FeedbackKind;

  @Column({ type: 'varchar', length: 100 })
  title: string;

  @Column({ type: 'text' })
  body: string;

  /** route、MDI 目前視窗、前端版本、瀏覽器、螢幕尺寸 */
  @Column({ type: 'jsonb', nullable: true })
  context: Record<string, unknown> | null;

  /** FEEDBACK_UPLOAD_DIR 底下的檔名（uuid.png）；沒有截圖為 null */
  @Column({ type: 'varchar', length: 100, nullable: true })
  screenshot_path: string | null;

  @Column({ type: 'varchar', length: 12, default: 'open' })
  status: FeedbackStatus;

  @Column({ type: 'int', nullable: true })
  assignee_user_id: number | null;

  @Column({ type: 'text', nullable: true })
  resolution: string | null;
}
