import { EntityManager } from 'typeorm';
import { LegacyRequestContext } from '../common/legacy-access';
import { LegacyPrintKind } from '../entities/print-log.entity';

export interface PrintLogEntry {
  kind: LegacyPrintKind;
  /** 單據種類或報表代碼 */
  target: string;
  entityKey?: string | null;
  criteria?: unknown;
  rowCount?: number | null;
  pageCount?: number | null;
}

/**
 * legacy_crm.print_log：單據預覽／列印、報表查詢各記一筆（只存條件與筆數，不存內容）。
 * 員工以登入者綁定的 public.staff 對應。
 */
export async function recordPrintLog(
  manager: EntityManager,
  context: LegacyRequestContext,
  entry: PrintLogEntry,
): Promise<void> {
  const staff: { id: string }[] = context.userId
    ? await manager.query(
        'SELECT id FROM public.staff WHERE "userId" = $1 LIMIT 1',
        [context.userId],
      )
    : [];
  await manager.query(
    `INSERT INTO legacy_crm.print_log
       (user_id, staff_id, request_id, client, kind, target, entity_key, criteria, row_count, page_count)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      context.userId,
      staff[0]?.id ?? null,
      context.requestId,
      JSON.stringify(context.client),
      entry.kind,
      entry.target.slice(0, 40),
      entry.entityKey == null ? null : entry.entityKey.slice(0, 60),
      entry.criteria == null ? null : JSON.stringify(entry.criteria),
      entry.rowCount ?? null,
      entry.pageCount ?? null,
    ],
  );
}
