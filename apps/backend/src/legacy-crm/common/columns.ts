import { Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { bigintNumberTransformer } from './units';

/**
 * legacy_crm 各表共用的欄位型別。文字欄沿用 isin_vb6：NOT NULL DEFAULT ''，長度上限同舊版。
 * PostgreSQL 的 varchar(n) 以字元計長度，與 isin_vb6 的 length() 檢查一致。
 */
export const LEGACY_CRM_SCHEMA = 'legacy_crm';

export function TextColumn(length: number): PropertyDecorator {
  return Column({ type: 'varchar', length, default: '' });
}

/** 金額或數量 × 10,000 的整數。 */
export function UnitsColumn(): PropertyDecorator {
  return Column({
    type: 'bigint',
    default: 0,
    transformer: bigintNumberTransformer,
  });
}

/** 正式日期欄；搭配同名 `*_raw` 欄（見 roc-date.ts）。 */
export function RocDateColumn(): PropertyDecorator {
  return Column({ type: 'date', nullable: true });
}

/** 無法由 `date` 還原的原民國字串。 */
export function RocDateRawColumn(): PropertyDecorator {
  return Column({ type: 'varchar', length: 20, nullable: true });
}

export function CreatedAtColumn(): PropertyDecorator {
  return CreateDateColumn({ type: 'timestamptz' });
}

export function UpdatedAtColumn(): PropertyDecorator {
  return UpdateDateColumn({ type: 'timestamptz' });
}
