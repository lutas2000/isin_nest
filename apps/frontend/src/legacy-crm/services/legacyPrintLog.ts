import { legacySend } from './legacyApi';

/**
 * 列印紀錄（LEGACY-CRM-REBUILD-PLAN.md 2.5，`POST /legacy-crm/print-log`）。
 * 單據開啟列印預覽時記 `document_preview`、按「印出 O」時記 `document_print`；
 * 報表按「印出 O」時記 `report_print`，請款單記 `statement_print`。報表預覽
 * （`report_query`）由後端自己記。紀錄失敗不擋列印。
 */
export type LegacyPrintKind =
  | 'document_preview'
  | 'document_print'
  | 'report_print'
  | 'statement_print';

export interface LegacyPrintLogEntry {
  kind: LegacyPrintKind;
  /** 單據種類或報表名稱，最多 40 字。 */
  target: string;
  entity_key?: string | null;
  criteria?: Record<string, unknown> | null;
  row_count?: number | null;
  page_count?: number | null;
}

export function logLegacyPrint(entry: LegacyPrintLogEntry): void {
  legacySend('/print-log', 'POST', entry).catch(() => {
    // 紀錄失敗不影響列印。
  });
}
