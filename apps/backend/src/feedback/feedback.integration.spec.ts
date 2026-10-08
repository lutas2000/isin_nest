import { INestApplication, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AuthModule } from '../auth/auth.module';
import { LegacyCrmModule } from '../legacy-crm/legacy-crm.module';
import { CreateLegacyCrmSchema1791438513900 } from '../migrations/1791438513900-CreateLegacyCrmSchema';
import { PrepareLegacyCrmApi1791460000000 } from '../migrations/1791460000000-PrepareLegacyCrmApi';
import { CreateFeedbackReports1791468000000 } from '../migrations/1791468000000-CreateFeedbackReports';
import { SlackWebhookService } from '../slack/slack-webhook.service';
import { FeedbackModule } from './feedback.module';

/**
 * 回報系統與舊版銷管紀錄查詢的權限、上傳限制與截圖存取，對真的 PostgreSQL 跑整個 HTTP 流程
 * （admin、crm write、一般使用者、未登入）。每次執行會清空並重建測試資料庫的
 * users、features、user_features、staff、feedback_reports 與 legacy_crm，所以只對可拋棄的資料庫執行：
 *
 *   FEEDBACK_TEST_HOST=127.0.0.1 FEEDBACK_TEST_PORT=55432 FEEDBACK_TEST_DB=p5_spec \
 *   FEEDBACK_TEST_USER=test FEEDBACK_TEST_PASS=test npx jest -c apps/backend/jest.config.ts feedback.integration
 *
 * 資料庫名稱必須以 _spec 結尾、主機必須是 127.0.0.1，避免誤連正式資料庫。不要和 legacy-crm.integration
 * 共用同一個資料庫（兩邊都會重建 public.features、public.staff）。Slack 一律以 spy 攔截，不會真的送出。
 */
const enabled =
  process.env.FEEDBACK_TEST_HOST === '127.0.0.1' &&
  /_spec$/.test(process.env.FEEDBACK_TEST_DB ?? '');

// 1×1 PNG
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);
const JPEG = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1,
]);

const USERS = {
  admin: 1,
  plain: 2,
  handler: 3,
  crmWrite: 4,
} as const;

(enabled ? describe : describe.skip)(
  'feedback and legacy CRM logs (HTTP, PostgreSQL)',
  () => {
    let app: INestApplication;
    let dataSource: DataSource;
    let uploadDir: string;
    let slackSend: jest.SpyInstance;
    let fetchSpy: jest.SpyInstance;
    const tokens: Record<keyof typeof USERS, string> = {} as never;

    const query = (sql: string, params: unknown[] = []) =>
      dataSource.query(sql, params);
    const http = () =>
      request(app.getHttpServer() as Parameters<typeof request>[0]);
    const as = (user: keyof typeof USERS) => ({
      Authorization: `Bearer ${tokens[user]}`,
    });
    const submit = (
      user: keyof typeof USERS,
      fields: Record<string, string> = {},
    ) => {
      const req = http().post('/feedback').set(as(user));
      const values = {
        kind: 'bug',
        title: '存檔失敗',
        body: '出貨登錄按存檔後沒有反應',
        ...fields,
      };
      for (const [key, value] of Object.entries(values)) req.field(key, value);
      return req;
    };
    const storedFiles = () =>
      fs.existsSync(uploadDir) ? fs.readdirSync(uploadDir) : [];

    beforeAll(async () => {
      uploadDir = fs.mkdtempSync(path.join(os.tmpdir(), 'feedback-spec-'));
      process.env.JWT_SECRET = 'feedback-spec-secret';
      process.env.FEEDBACK_UPLOAD_DIR = uploadDir;
      process.env.FEEDBACK_SLACK_WEBHOOK_URL =
        'https://hooks.example.test/services/feedback';
      // 保險：任何真的對外連線都失敗。
      fetchSpy = jest
        .spyOn(global, 'fetch')
        .mockRejectedValue(new Error('network disabled in tests'));

      const options = {
        type: 'postgres' as const,
        host: process.env.FEEDBACK_TEST_HOST,
        port: Number(process.env.FEEDBACK_TEST_PORT) || 5432,
        username: process.env.FEEDBACK_TEST_USER,
        password: process.env.FEEDBACK_TEST_PASS,
        database: process.env.FEEDBACK_TEST_DB,
      };
      dataSource = new DataSource(options);
      await dataSource.initialize();
      await query('DROP SCHEMA IF EXISTS legacy_crm CASCADE');
      await query(
        'DROP TABLE IF EXISTS public.feedback_reports, public.user_features, public.features, public.staff, public.users CASCADE',
      );
      await query(`CREATE TABLE public.users (
      id serial PRIMARY KEY, "userName" varchar UNIQUE NOT NULL, password varchar NOT NULL,
      "isAdmin" boolean NOT NULL DEFAULT false,
      "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now())`);
      await query(`CREATE TABLE public.features (
      id serial PRIMARY KEY, name varchar UNIQUE NOT NULL, description varchar,
      "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now())`);
      await query(`CREATE TABLE public.user_features (
      id serial PRIMARY KEY, permission varchar NOT NULL, "userId" int, "featureId" int,
      "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now())`);
      await query(
        'CREATE TABLE public.staff (id varchar(10) PRIMARY KEY, "userId" int, name varchar(6) NOT NULL, stop_work date)',
      );
      const runner = dataSource.createQueryRunner();
      await new CreateLegacyCrmSchema1791438513900().up(runner);
      await new PrepareLegacyCrmApi1791460000000().up(runner);
      await new CreateFeedbackReports1791468000000().up(runner);
      await runner.release();

      for (const [name, id] of Object.entries(USERS))
        await query(
          `INSERT INTO public.users (id, "userName", password, "isAdmin") VALUES ($1, $2, 'x', $3)`,
          [id, name, name === 'admin'],
        );
      await query(`SELECT setval('public.users_id_seq', 100)`);
      const grant = (userId: number, feature: string, permission: string) =>
        query(
          `INSERT INTO public.user_features ("userId", "featureId", permission)
         SELECT $1, id, $3 FROM public.features WHERE name = $2`,
          [userId, feature, permission],
        );
      await grant(USERS.crmWrite, 'crm', 'write');
      await query(
        `INSERT INTO public.staff (id, "userId", name) VALUES ('S04', $1, '王處理')`,
        [USERS.handler],
      );

      @Module({
        imports: [
          ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
          TypeOrmModule.forRoot({
            ...options,
            autoLoadEntities: true,
            synchronize: false,
          }),
          AuthModule,
          LegacyCrmModule,
          FeedbackModule,
        ],
      })
      class TestAppModule {}

      const moduleRef = await Test.createTestingModule({
        imports: [TestAppModule],
      }).compile();
      app = moduleRef.createNestApplication({ logger: false });
      await app.init();
      slackSend = jest
        .spyOn(app.get(SlackWebhookService), 'send')
        .mockResolvedValue(undefined);
      const jwt = app.get(JwtService);
      for (const [name, id] of Object.entries(USERS))
        tokens[name as keyof typeof USERS] = jwt.sign({
          sub: id,
          userName: name,
        });
    });

    afterAll(async () => {
      await app?.close();
      await dataSource?.destroy();
      fetchSpy?.mockRestore();
      fs.rmSync(uploadDir, { recursive: true, force: true });
      delete process.env.FEEDBACK_UPLOAD_DIR;
      delete process.env.FEEDBACK_SLACK_WEBHOOK_URL;
    });

    beforeEach(async () => {
      await query('TRUNCATE public.feedback_reports RESTART IDENTITY');
      for (const file of storedFiles()) fs.rmSync(path.join(uploadDir, file));
      slackSend.mockClear();
    });

    describe('submitting', () => {
      it('rejects anonymous requests with 401', async () => {
        await http()
          .post('/feedback')
          .field('kind', 'bug')
          .field('title', 't')
          .field('body', 'b')
          .expect(401);
        await http().get('/feedback').expect(401);
        await http().get('/feedback/1/screenshot').expect(401);
      });

      it('lets any signed-in user report without crm, and notifies Slack without the body', async () => {
        const context = {
          route: '/legacy-crm',
          window: '出貨登錄',
          screen: '1920x1080',
        };
        const response = await submit('plain', {
          context: JSON.stringify(context),
        }).expect(201);
        expect(response.body.item).toMatchObject({
          id: 1,
          user_id: USERS.plain,
          reporter: 'plain',
          kind: 'bug',
          title: '存檔失敗',
          status: 'open',
          context,
        });
        expect(response.body.item).not.toHaveProperty('has_screenshot');
        expect(response.body.item).not.toHaveProperty('screenshot_path');
        expect(slackSend).toHaveBeenCalledTimes(1);
        const [text, setting] = slackSend.mock.calls[0];
        expect(setting).toBe('FEEDBACK_SLACK_WEBHOOK_URL');
        expect(text).toContain('#1');
        expect(text).toContain('存檔失敗');
        expect(text).toContain('出貨登錄 / /legacy-crm');
        expect(text).not.toContain('沒有反應');
        expect(fetchSpy).not.toHaveBeenCalled();
      });

      it('escapes Slack control characters from the title', async () => {
        await submit('plain', { title: '<!channel> & <http://x|y>' }).expect(
          201,
        );
        expect(slackSend.mock.calls[0][0]).toContain(
          '&lt;!channel&gt; &amp; &lt;http://x|y&gt;',
        );
      });

      it('stores a PNG screenshot under FEEDBACK_UPLOAD_DIR with a uuid name', async () => {
        await submit('plain')
          .attach('screenshot', PNG, {
            filename: 'screen.png',
            contentType: 'image/png',
          })
          .expect(201);
        const files = storedFiles();
        expect(files).toHaveLength(1);
        expect(files[0]).toMatch(/^[0-9a-f-]{36}\.png$/);
        const [row] = await query(
          'SELECT screenshot_path FROM public.feedback_reports',
        );
        expect(row.screenshot_path).toBe(files[0]);
        expect(
          fs.readFileSync(path.join(uploadDir, files[0])).equals(PNG),
        ).toBe(true);
        expect(slackSend.mock.calls[0][0]).toContain('附有截圖');
      });

      it('rejects screenshots that are not PNG, whatever the declared type', async () => {
        await submit('plain')
          .attach('screenshot', JPEG, {
            filename: 'a.png',
            contentType: 'image/png',
          })
          .expect(400);
        await submit('plain')
          .attach('screenshot', PNG, {
            filename: 'a.jpg',
            contentType: 'image/jpeg',
          })
          .expect(400);
        expect(storedFiles()).toHaveLength(0);
        expect(
          await query('SELECT id FROM public.feedback_reports'),
        ).toHaveLength(0);
      });

      it('rejects screenshots over 5 MB with 413', async () => {
        const big = Buffer.concat([
          PNG,
          Buffer.alloc(5 * 1024 * 1024 + 1 - PNG.length),
        ]);
        await submit('plain')
          .attach('screenshot', big, {
            filename: 'big.png',
            contentType: 'image/png',
          })
          .expect(413);
        expect(storedFiles()).toHaveLength(0);
        expect(
          await query('SELECT id FROM public.feedback_reports'),
        ).toHaveLength(0);
      });

      it('accepts a screenshot of exactly 5 MB', async () => {
        const max = Buffer.concat([
          PNG,
          Buffer.alloc(5 * 1024 * 1024 - PNG.length),
        ]);
        await submit('plain')
          .attach('screenshot', max, {
            filename: 'max.png',
            contentType: 'image/png',
          })
          .expect(201);
      });

      it('validates kind, title, body and context', async () => {
        await submit('plain', { kind: 'praise' }).expect(400);
        await submit('plain', { title: '   ' }).expect(400);
        await submit('plain', { title: 'x'.repeat(101) }).expect(400);
        await submit('plain', { body: '' }).expect(400);
        await submit('plain', { context: '{not json' }).expect(400);
        await submit('plain', { context: '[1,2]' }).expect(400);
        await submit('plain')
          .attach('other', PNG, { filename: 'a.png', contentType: 'image/png' })
          .expect(400);
        expect(
          await query('SELECT id FROM public.feedback_reports'),
        ).toHaveLength(0);
        expect(slackSend).not.toHaveBeenCalled();
      });
    });

    describe('handling', () => {
      beforeEach(async () => {
        await submit('plain', { kind: 'bug', title: '甲' })
          .attach('screenshot', PNG, {
            filename: 's.png',
            contentType: 'image/png',
          })
          .expect(201);
        await submit('crmWrite', {
          kind: 'feature',
          title: '乙',
          body: '希望報表可以匯出',
        }).expect(201);
      });

      it('lists for any signed-in user, without feature permissions', async () => {
        await http().get('/feedback').set(as('crmWrite')).expect(200);
        const writer = await http()
          .get('/feedback')
          .set(as('plain'))
          .expect(200);
        expect(writer.body).toMatchObject({ total: 2, page: 1, page_size: 50 });
        expect(
          writer.body.items.map((item: { title: string }) => item.title),
        ).toEqual(['乙', '甲']);
        for (const item of writer.body.items) {
          expect(item).not.toHaveProperty('has_screenshot');
          expect(item).not.toHaveProperty('screenshot_path');
        }
        const admin = await http()
          .get('/feedback')
          .set(as('admin'))
          .expect(200);
        expect(
          admin.body.items.map(
            (item: { has_screenshot: boolean }) => item.has_screenshot,
          ),
        ).toEqual([false, true]);
        expect(admin.body.items[0]).not.toHaveProperty('screenshot_path');
      });

      it('filters by status, kind, assignee, text and date', async () => {
        const get = async (params: Record<string, string>) =>
          (
            await http()
              .get('/feedback')
              .query(params)
              .set(as('admin'))
              .expect(200)
          ).body;
        await http()
          .patch('/feedback/1')
          .set(as('admin'))
          .send({ status: 'done', assignee_user_id: USERS.handler })
          .expect(200);
        expect(
          (await get({ status: 'done' })).items.map(
            (i: { id: number }) => i.id,
          ),
        ).toEqual([1]);
        expect(
          (await get({ kind: 'feature' })).items.map(
            (i: { id: number }) => i.id,
          ),
        ).toEqual([2]);
        expect(
          (await get({ assignee: 'none' })).items.map(
            (i: { id: number }) => i.id,
          ),
        ).toEqual([2]);
        expect(
          (await get({ assignee: String(USERS.handler) })).items.map(
            (i: { id: number }) => i.id,
          ),
        ).toEqual([1]);
        expect(
          (await get({ q: '匯出' })).items.map((i: { id: number }) => i.id),
        ).toEqual([2]);
        expect((await get({ q: '100%' })).total).toBe(0);
        expect(
          (await get({ from: '2000-01-01', to: '2000-01-31' })).total,
        ).toBe(0);
        const today = new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Asia/Taipei',
        }).format(new Date());
        expect((await get({ from: today, to: today })).total).toBe(2);
        expect(
          (await get({ page: '2', page_size: '1' })).items.map(
            (i: { id: number }) => i.id,
          ),
        ).toEqual([1]);
        await http()
          .get('/feedback')
          .query({ status: 'closed' })
          .set(as('admin'))
          .expect(400);
        await http()
          .get('/feedback')
          .query({ from: '2026/10/01' })
          .set(as('admin'))
          .expect(400);
        await http()
          .get('/feedback')
          .query({ page_size: '500' })
          .set(as('admin'))
          .expect(400);
      });

      it('updates status, assignee and resolution for any signed-in user', async () => {
        await http().patch('/feedback/1').send({ status: 'done' }).expect(401);
        const response = await http()
          .patch('/feedback/1')
          .set(as('plain'))
          .send({
            status: 'in_progress',
            assignee_user_id: USERS.handler,
            resolution: '  查看中  ',
          })
          .expect(200);
        expect(response.body.item).toMatchObject({
          status: 'in_progress',
          assignee_user_id: USERS.handler,
          assignee: '王處理',
          resolution: '查看中',
        });
        const cleared = await http()
          .patch('/feedback/1')
          .set(as('admin'))
          .send({ assignee_user_id: null, resolution: null })
          .expect(200);
        expect(cleared.body.item).toMatchObject({
          status: 'in_progress',
          assignee_user_id: null,
          resolution: null,
        });
        await http()
          .patch('/feedback/1')
          .set(as('admin'))
          .send({ status: 'closed' })
          .expect(400);
        await http()
          .patch('/feedback/1')
          .set(as('admin'))
          .send({ assignee_user_id: 999 })
          .expect(400);
        await http()
          .patch('/feedback/99')
          .set(as('admin'))
          .send({ status: 'done' })
          .expect(404);
      });

      it('lists every user as an assignee', async () => {
        await http().get('/feedback/assignees').expect(401);
        const response = await http()
          .get('/feedback/assignees')
          .set(as('plain'))
          .expect(200);
        expect(response.body).toEqual([
          { id: USERS.admin, name: 'admin' },
          { id: USERS.plain, name: 'plain' },
          { id: USERS.handler, name: '王處理' },
          { id: USERS.crmWrite, name: 'crmWrite' },
        ]);
      });

      it('serves the screenshot to admin only, not even to the reporter', async () => {
        await http().get('/feedback/1/screenshot').set(as('plain')).expect(403);
        await http()
          .get('/feedback/1/screenshot')
          .set(as('handler'))
          .expect(403);
        const response = await http()
          .get('/feedback/1/screenshot')
          .set(as('admin'))
          .buffer(true)
          .parse((res, done) => {
            const chunks: Buffer[] = [];
            res.on('data', (chunk: Buffer) => chunks.push(chunk));
            res.on('end', () => done(null, Buffer.concat(chunks)));
          })
          .expect(200);
        expect(response.headers['content-type']).toBe('image/png');
        expect(response.headers['cache-control']).toBe('private, no-store');
        expect((response.body as Buffer).equals(PNG)).toBe(true);
        await http().get('/feedback/2/screenshot').set(as('admin')).expect(404);
        await http()
          .get('/feedback/99/screenshot')
          .set(as('admin'))
          .expect(404);
      });

      it('returns 404 when the screenshot file has gone, and never follows a tampered path', async () => {
        await query(
          `UPDATE public.feedback_reports SET screenshot_path = '../../etc/passwd' WHERE id = 1`,
        );
        await http().get('/feedback/1/screenshot').set(as('admin')).expect(404);
        await query(
          `UPDATE public.feedback_reports SET screenshot_path = '00000000-0000-0000-0000-000000000000.png' WHERE id = 1`,
        );
        await http().get('/feedback/1/screenshot').set(as('admin')).expect(404);
      });
    });

    describe('legacy CRM write_log and print_log (admin only)', () => {
      beforeAll(async () => {
        await query(
          'TRUNCATE legacy_crm.write_log, legacy_crm.print_log RESTART IDENTITY',
        );
        await query(
          `INSERT INTO legacy_crm.write_log (occurred_at, user_id, staff_id, entity_type, entity_key, action, before, after)
         VALUES ('2026-10-01 10:00+08', $1, 'S04', 'partner', 'customer:C1', 'create', NULL, '{"code":"C1"}'),
                ('2026-10-02 23:30+08', $2, NULL, 'order_document', '1151002001', 'update', '{"a":1}', '{"a":2}'),
                ('2026-10-03 00:30+08', NULL, NULL, 'import', 'final', 'import', NULL, '{"rows":10}')`,
          [USERS.handler, USERS.crmWrite],
        );
        await query(
          `INSERT INTO legacy_crm.print_log (occurred_at, user_id, kind, target, entity_key, criteria, row_count)
         VALUES ('2026-10-02 09:00+08', $1, 'report_query', 'sales-journal', NULL, '{"from":"115.10.01"}', 12),
                ('2026-10-02 09:05+08', $1, 'document_print', 'order', '1151002001', NULL, NULL)`,
          [USERS.crmWrite],
        );
      });

      it('rejects everyone but admin', async () => {
        await http().get('/legacy-crm/logs/write').expect(401);
        for (const user of ['plain', 'crmWrite', 'handler'] as const) {
          await http().get('/legacy-crm/logs/write').set(as(user)).expect(403);
          await http().get('/legacy-crm/logs/print').set(as(user)).expect(403);
          await http()
            .get('/legacy-crm/logs/write/1')
            .set(as(user))
            .expect(403);
          await http().get('/legacy-crm/logs/facets').set(as(user)).expect(403);
        }
      });

      it('lists write_log without before/after, newest first, with filters', async () => {
        const get = async (params: Record<string, string> = {}) =>
          (
            await http()
              .get('/legacy-crm/logs/write')
              .query(params)
              .set(as('admin'))
              .expect(200)
          ).body;
        const all = await get();
        expect(all.total).toBe(3);
        expect(all.items.map((i: { id: string }) => i.id)).toEqual([
          '3',
          '2',
          '1',
        ]);
        expect(all.items[0]).not.toHaveProperty('before');
        expect(all.items[2]).toMatchObject({
          user_id: USERS.handler,
          user_name: '王處理',
          action: 'create',
        });
        const ids = async (params: Record<string, string>) =>
          (await get(params)).items.map((i: { id: string }) => i.id);
        expect(await ids({ action: 'update' })).toEqual(['2']);
        expect(await ids({ entity_type: 'partner' })).toEqual(['1']);
        expect(await ids({ entity_key: 'customer:' })).toEqual(['1']);
        expect(await ids({ entity_key: '1151002' })).toEqual(['2']);
        expect(await ids({ user: '王' })).toEqual(['1']);
        expect(await ids({ user: 'S04' })).toEqual(['1']);
        expect(await ids({ user: 'crmwrite' })).toEqual(['2']);
        expect(await ids({ user: String(USERS.crmWrite) })).toEqual(['2']);
        // 日期依台北時間：10/02 23:30 屬於 10/02，10/03 00:30 屬於 10/03。
        expect(await ids({ from: '2026-10-02', to: '2026-10-02' })).toEqual([
          '2',
        ]);
        expect(await ids({ from: '2026-10-03' })).toEqual(['3']);
        expect(
          (await get({ page: '2', page_size: '2' })).items.map(
            (i: { id: string }) => i.id,
          ),
        ).toEqual(['1']);
        await http()
          .get('/legacy-crm/logs/write')
          .query({ action: 'drop' })
          .set(as('admin'))
          .expect(400);
      });

      it('returns one write_log entry with before and after', async () => {
        const response = await http()
          .get('/legacy-crm/logs/write/2')
          .set(as('admin'))
          .expect(200);
        expect(response.body.item).toMatchObject({
          before: { a: 1 },
          after: { a: 2 },
          entity_key: '1151002001',
        });
        await http()
          .get('/legacy-crm/logs/write/99')
          .set(as('admin'))
          .expect(404);
        await http()
          .get('/legacy-crm/logs/write/abc')
          .set(as('admin'))
          .expect(400);
      });

      it('lists print_log with filters and facets', async () => {
        const response = await http()
          .get('/legacy-crm/logs/print')
          .query({ kind: 'report_query' })
          .set(as('admin'))
          .expect(200);
        expect(response.body.total).toBe(1);
        expect(response.body.items[0]).toMatchObject({
          target: 'sales-journal',
          criteria: { from: '115.10.01' },
          row_count: 12,
          user_name: 'crmWrite',
        });
        const byTarget = await http()
          .get('/legacy-crm/logs/print')
          .query({ target: 'order' })
          .set(as('admin'))
          .expect(200);
        expect(
          byTarget.body.items.map((i: { kind: string }) => i.kind),
        ).toEqual(['document_print']);
        const facets = await http()
          .get('/legacy-crm/logs/facets')
          .set(as('admin'))
          .expect(200);
        expect(facets.body).toEqual({
          entity_types: ['import', 'order_document', 'partner'],
          print_targets: ['order', 'sales-journal'],
        });
      });
    });
  },
);
