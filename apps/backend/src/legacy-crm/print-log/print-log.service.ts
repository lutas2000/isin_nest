import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { LegacyRequestContext } from '../common/legacy-access';
import { LegacyValidationError } from '../common/legacy-validation.error';
import { LegacyPrintKind } from '../entities/print-log.entity';
import { PrintLogEntry, recordPrintLog } from './record-print-log';

/** 前端可回報的種類；report_query 由後端在報表查詢時自己記。 */
const CLIENT_KINDS: LegacyPrintKind[] = [
  'document_preview',
  'document_print',
  'report_print',
  'statement_print',
];

/** legacy_crm.print_log：單據預覽與印出、報表查詢與印出、請款單。只記條件與筆數，不存內容。 */
@Injectable()
export class LegacyPrintLogService {
  constructor(private readonly dataSource: DataSource) {}

  record(
    context: LegacyRequestContext,
    entry: PrintLogEntry,
    manager: EntityManager = this.dataSource.manager,
  ) {
    return recordPrintLog(manager, context, entry);
  }

  /** 前端回報的列印；驗證後記錄。 */
  async recordFromClient(
    context: LegacyRequestContext,
    body: Record<string, unknown>,
  ) {
    const kind = body?.kind as LegacyPrintKind;
    if (!CLIENT_KINDS.includes(kind))
      throw new LegacyValidationError('列印種類無效');
    const target = String(body.target ?? '').trim();
    if (!target || target.length > 40)
      throw new LegacyValidationError('列印項目無效');
    const entityKey =
      body.entity_key == null ? null : String(body.entity_key).trim();
    if (entityKey && entityKey.length > 60)
      throw new LegacyValidationError('單號無效');
    const count = (value: unknown, label: string) => {
      if (value == null || value === '') return null;
      const number = Number(value);
      if (!Number.isInteger(number) || number < 0 || number > 1_000_000)
        throw new LegacyValidationError(`${label}無效`);
      return number;
    };
    const criteria = body.criteria;
    if (
      criteria != null &&
      (typeof criteria !== 'object' || JSON.stringify(criteria).length > 2000)
    ) {
      throw new LegacyValidationError('列印條件無效');
    }
    await this.record(context, {
      kind,
      target,
      entityKey: entityKey || null,
      criteria,
      rowCount: count(body.row_count, '筆數'),
      pageCount: count(body.page_count, '頁數'),
    });
  }
}
