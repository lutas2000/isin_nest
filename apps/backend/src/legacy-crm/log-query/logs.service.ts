import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { PrintLogQueryDto, WriteLogQueryDto } from './logs.dto';

/** 使用者顯示：綁定員工的姓名，沒有就用帳號；帳號已刪除時為 null（紀錄沒有外鍵）。 */
const USER_NAME = `(SELECT COALESCE(NULLIF(s.name, ''), u."userName")
    FROM public.users u LEFT JOIN public.staff s ON s."userId" = u.id
   WHERE u.id = l.user_id LIMIT 1)`;

const escapeLike = (text: string) => text.replace(/[\\%_]/g, (c) => `\\${c}`);

/** 條件組合器：`?` 換成這個值的 $n。 */
class Where {
  readonly clauses: string[] = [];
  readonly params: unknown[] = [];

  param(value: unknown): string {
    this.params.push(value);
    return `$${this.params.length}`;
  }

  add(sql: string, value: unknown) {
    this.clauses.push(sql.split('?').join(this.param(value)));
  }

  get sql() {
    return this.clauses.length ? `WHERE ${this.clauses.join(' AND ')}` : '';
  }
}

/**
 * legacy_crm.write_log／print_log 的查詢畫面（LEGACY-CRM-REBUILD-PLAN.md 2.4、2.5），只給 admin。
 * 列表不含 before／after／side_effects（整筆單據可能很大），單筆另取。新的在前。
 */
@Injectable()
export class LegacyLogsService {
  constructor(private readonly dataSource: DataSource) {}

  private common(where: Where, query: WriteLogQueryDto | PrintLogQueryDto) {
    if (query.from)
      where.add(
        `l.occurred_at >= (?::date)::timestamp AT TIME ZONE 'Asia/Taipei'`,
        query.from,
      );
    if (query.to)
      where.add(
        `l.occurred_at < ((?::date) + 1)::timestamp AT TIME ZONE 'Asia/Taipei'`,
        query.to,
      );
    if (query.user) {
      const user = query.user;
      if (/^\d+$/.test(user)) where.add('l.user_id = ?', Number(user));
      else {
        const exact = where.param(user);
        const like = where.param(`%${escapeLike(user)}%`);
        where.clauses.push(
          `(l.staff_id = ${exact} OR l.user_id IN (
              SELECT u.id FROM public.users u LEFT JOIN public.staff s ON s."userId" = u.id
               WHERE u."userName" ILIKE ${like} OR s.name ILIKE ${like}))`,
        );
      }
    }
    if (query.entity_key)
      where.add('l.entity_key LIKE ?', `${escapeLike(query.entity_key)}%`);
  }

  private async page(
    table: 'write_log' | 'print_log',
    columns: string,
    where: Where,
    query: WriteLogQueryDto | PrintLogQueryDto,
  ) {
    const page = query.page ?? 1;
    const pageSize = query.page_size ?? 50;
    const [{ total }] = await this.dataSource.query(
      `SELECT count(*)::int AS total FROM legacy_crm.${table} l ${where.sql}`,
      where.params,
    );
    const items = await this.dataSource.query(
      `SELECT ${columns}, ${USER_NAME} AS user_name
         FROM legacy_crm.${table} l ${where.sql}
        ORDER BY l.occurred_at DESC, l.id DESC
        LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`,
      where.params,
    );
    return { items, total, page, page_size: pageSize };
  }

  writeLog(query: WriteLogQueryDto) {
    const where = new Where();
    this.common(where, query);
    if (query.entity_type) where.add('l.entity_type = ?', query.entity_type);
    if (query.action) where.add('l.action = ?', query.action);
    return this.page(
      'write_log',
      `l.id, l.occurred_at, l.user_id, l.staff_id, l.entity_type, l.entity_key, l.action, l.request_id, l.client`,
      where,
      query,
    );
  }

  async writeLogEntry(id: string) {
    const [item] = await this.dataSource.query(
      `SELECT l.*, ${USER_NAME} AS user_name FROM legacy_crm.write_log l WHERE l.id = $1`,
      [id],
    );
    if (!item) throw new NotFoundException('找不到這筆寫入紀錄');
    return { item };
  }

  printLog(query: PrintLogQueryDto) {
    const where = new Where();
    this.common(where, query);
    if (query.kind) where.add('l.kind = ?', query.kind);
    if (query.target) where.add('l.target = ?', query.target);
    return this.page(
      'print_log',
      `l.id, l.occurred_at, l.user_id, l.staff_id, l.kind, l.target, l.entity_key, l.criteria,
       l.row_count, l.page_count, l.request_id, l.client`,
      where,
      query,
    );
  }

  /** 篩選用的下拉選項：已出現過的資料種類與列印項目。 */
  async facets() {
    const entityTypes: { value: string }[] = await this.dataSource.query(
      'SELECT DISTINCT entity_type AS value FROM legacy_crm.write_log ORDER BY 1',
    );
    const targets: { value: string }[] = await this.dataSource.query(
      'SELECT DISTINCT target AS value FROM legacy_crm.print_log ORDER BY 1',
    );
    return {
      entity_types: entityTypes.map((row) => row.value),
      print_targets: targets.map((row) => row.value),
    };
  }
}
