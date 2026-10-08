import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as fs from 'fs';
import { DataSource, Repository } from 'typeorm';
import {
  CreateFeedbackDto,
  FeedbackQueryDto,
  UpdateFeedbackDto,
} from './dto/feedback.dto';
import { FeedbackReport } from './entities/feedback-report.entity';
import { FeedbackNotifierService } from './feedback-notifier.service';
import { FeedbackScreenshotStore, isPng } from './feedback-screenshot.store';

/** 回報者與處理者：綁定員工的姓名，沒有就用帳號。 */
const USER_LABEL = `COALESCE(NULLIF(s.name, ''), u."userName")`;

export interface FeedbackActor {
  id: number;
  isAdmin: boolean;
}

export interface FeedbackScreenshotFile {
  originalname?: string;
  mimetype?: string;
  size?: number;
  buffer?: Buffer;
}

interface FeedbackRow {
  id: number;
  created_at: Date;
  updated_at: Date;
  user_id: number;
  reporter: string | null;
  kind: string;
  title: string;
  body: string;
  context: Record<string, unknown> | null;
  status: string;
  assignee_user_id: number | null;
  assignee: string | null;
  resolution: string | null;
  screenshot_path: string | null;
}

/**
 * 回報系統（LEGACY-CRM-REBUILD-PLAN.md 第 7 節）。任何登入者都能送出；處理需要 admin 或 `feedback` write；
 * 截圖只有 admin 能看，連回報者本人也看不到（送出前的預覽即為確認）。
 */
@Injectable()
export class FeedbackService {
  private readonly logger = new Logger(FeedbackService.name);

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(FeedbackReport)
    private readonly reports: Repository<FeedbackReport>,
    private readonly screenshots: FeedbackScreenshotStore,
    private readonly notifier: FeedbackNotifierService,
  ) {}

  async create(
    actor: FeedbackActor,
    dto: CreateFeedbackDto,
    screenshot?: FeedbackScreenshotFile,
  ) {
    const context = this.parseContext(dto.context);
    let screenshotName: string | null = null;
    if (screenshot) {
      const buffer = screenshot.buffer;
      if (!buffer || screenshot.mimetype !== 'image/png' || !isPng(buffer))
        throw new BadRequestException('截圖必須是 PNG 圖檔');
      screenshotName = await this.screenshots.save(buffer);
    }
    let report: FeedbackReport;
    try {
      report = await this.reports.save(
        this.reports.create({
          user_id: actor.id,
          kind: dto.kind,
          title: dto.title,
          body: dto.body,
          context,
          screenshot_path: screenshotName,
          status: 'open',
        }),
      );
    } catch (error) {
      if (screenshotName) await this.screenshots.remove(screenshotName);
      throw error;
    }
    const [row] = await this.rows('WHERE f.id = $1', [report.id]);
    // 通知不等待：Slack 慢或失敗都不影響回報本身。
    void this.notifier.notifyCreated(report, row?.reporter ?? `#${actor.id}`);
    return { item: this.present(row, actor) };
  }

  async list(actor: FeedbackActor, query: FeedbackQueryDto) {
    const where: string[] = [];
    const params: unknown[] = [];
    const add = (sql: string, value: unknown) => {
      params.push(value);
      where.push(sql.split('?').join(`$${params.length}`));
    };
    if (query.status) add('f.status = ?', query.status);
    if (query.kind) add('f.kind = ?', query.kind);
    if (query.assignee === 'none') where.push('f.assignee_user_id IS NULL');
    else if (query.assignee)
      add('f.assignee_user_id = ?', Number(query.assignee));
    if (query.q) {
      const like = `%${query.q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
      add('(f.title ILIKE ? OR f.body ILIKE ?)', like);
    }
    if (query.from)
      add(
        `f.created_at >= (?::date)::timestamp AT TIME ZONE 'Asia/Taipei'`,
        query.from,
      );
    if (query.to)
      add(
        `f.created_at < ((?::date) + 1)::timestamp AT TIME ZONE 'Asia/Taipei'`,
        query.to,
      );
    const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const page = query.page ?? 1;
    const pageSize = query.page_size ?? 50;
    const [{ total }] = await this.dataSource.query(
      `SELECT count(*)::int AS total FROM public.feedback_reports f ${clause}`,
      params,
    );
    const rows = await this.rows(
      `${clause} ORDER BY f.created_at DESC, f.id DESC LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`,
      params,
    );
    return {
      items: rows.map((row) => this.present(row, actor)),
      total,
      page,
      page_size: pageSize,
    };
  }

  async update(actor: FeedbackActor, id: number, dto: UpdateFeedbackDto) {
    const report = await this.reports.findOne({ where: { id } });
    if (!report) throw new NotFoundException('找不到回報');
    if (dto.assignee_user_id !== undefined && dto.assignee_user_id !== null) {
      const eligible = await this.assignees();
      if (!eligible.some((user) => user.id === dto.assignee_user_id))
        throw new BadRequestException(
          '處理者必須是管理員或有回報處理權限的使用者',
        );
    }
    if (dto.status !== undefined) report.status = dto.status;
    if (dto.assignee_user_id !== undefined)
      report.assignee_user_id = dto.assignee_user_id;
    if (dto.resolution !== undefined)
      report.resolution = dto.resolution ? dto.resolution : null;
    await this.reports.save(report);
    const [row] = await this.rows('WHERE f.id = $1', [id]);
    return { item: this.present(row, actor) };
  }

  /** 可指派的處理者：admin 與有 `feedback` write 的使用者。 */
  async assignees(): Promise<{ id: number; name: string }[]> {
    return this.dataSource.query(
      `SELECT u.id, ${USER_LABEL} AS name
         FROM public.users u
         LEFT JOIN public.staff s ON s."userId" = u.id
        WHERE u."isAdmin"
           OR EXISTS (
                SELECT 1 FROM public.user_features uf
                  JOIN public.features ft ON ft.id = uf."featureId"
                 WHERE uf."userId" = u.id AND ft.name = 'feedback' AND uf.permission = 'write')
        ORDER BY u.id`,
    );
  }

  /** 截圖的絕對路徑；沒有截圖或檔案不見都回 404。只給 admin（controller 掛 AdminGuard）。 */
  async screenshotPath(id: number): Promise<string> {
    const report = await this.reports.findOne({
      where: { id },
      select: ['id', 'screenshot_path'],
    });
    const file = report?.screenshot_path
      ? this.screenshots.resolve(report.screenshot_path)
      : null;
    if (!file) throw new NotFoundException('這筆回報沒有截圖');
    try {
      await fs.promises.access(file, fs.constants.R_OK);
    } catch {
      this.logger.warn(`feedback #${id} screenshot file is missing`);
      throw new NotFoundException('截圖檔案不存在');
    }
    return file;
  }

  private parseContext(raw?: string): Record<string, unknown> | null {
    if (!raw) return null;
    let value: unknown;
    try {
      value = JSON.parse(raw);
    } catch {
      throw new BadRequestException('回報內容資訊格式錯誤');
    }
    if (value === null) return null;
    if (typeof value !== 'object' || Array.isArray(value))
      throw new BadRequestException('回報內容資訊格式錯誤');
    return value as Record<string, unknown>;
  }

  private rows(tail: string, params: unknown[]): Promise<FeedbackRow[]> {
    return this.dataSource.query(
      `SELECT f.id, f.created_at, f.updated_at, f.user_id, f.kind, f.title, f.body, f.context,
              f.status, f.assignee_user_id, f.resolution, f.screenshot_path,
              (SELECT ${USER_LABEL} FROM public.users u LEFT JOIN public.staff s ON s."userId" = u.id
                WHERE u.id = f.user_id LIMIT 1) AS reporter,
              (SELECT ${USER_LABEL} FROM public.users u LEFT JOIN public.staff s ON s."userId" = u.id
                WHERE u.id = f.assignee_user_id LIMIT 1) AS assignee
         FROM public.feedback_reports f ${tail}`,
      params,
    );
  }

  /** 對外的形狀：不含檔名；`has_screenshot` 只給 admin。 */
  private present(row: FeedbackRow, actor: FeedbackActor) {
    const { screenshot_path, ...rest } = row;
    return actor.isAdmin
      ? { ...rest, has_screenshot: Boolean(screenshot_path) }
      : rest;
  }
}
