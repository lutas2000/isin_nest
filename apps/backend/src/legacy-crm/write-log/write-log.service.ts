import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { LegacyRequestContext } from '../common/legacy-access';
import { LegacyWriteAction } from '../entities/write-log.entity';

export interface WriteLogEntry {
  entityType: string;
  entityKey: string;
  action: LegacyWriteAction;
  before?: unknown;
  after?: unknown;
  sideEffects?: unknown;
}

/**
 * legacy_crm.write_log：每次新增、修改、刪除都在同一個 transaction 內記一筆，
 * 含使用者、綁定的員工、前後整筆資料與連帶回寫。
 */
@Injectable()
export class LegacyWriteLogService {
  async record(
    manager: EntityManager,
    context: LegacyRequestContext,
    entry: WriteLogEntry,
  ): Promise<void> {
    const staff: { id: string }[] = context.userId
      ? await manager.query(
          'SELECT id FROM public.staff WHERE "userId" = $1 LIMIT 1',
          [context.userId],
        )
      : [];
    const json = (value: unknown) =>
      value === undefined || value === null ? null : JSON.stringify(value);
    const sideEffects =
      Array.isArray(entry.sideEffects) && entry.sideEffects.length === 0
        ? null
        : entry.sideEffects;
    await manager.query(
      `INSERT INTO legacy_crm.write_log
         (user_id, staff_id, entity_type, entity_key, action, before, after, side_effects, request_id, client)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        context.userId,
        staff[0]?.id ?? null,
        entry.entityType,
        entry.entityKey.slice(0, 60),
        entry.action,
        json(entry.before),
        json(entry.after),
        json(sideEffects),
        context.requestId,
        JSON.stringify(context.client),
      ],
    );
  }
}
