import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 回報系統（LEGACY-CRM-REBUILD-PLAN.md 第 7 節，第 5 階段）：
 *
 * public.feedback_reports：使用者回報的 bug／需求／問題與處理狀態。截圖只存 FEEDBACK_UPLOAD_DIR 底下的檔名。
 * 送出與處理回報都只需要登入，不建立功能權限。
 */
export class CreateFeedbackReports1791468000000 implements MigrationInterface {
  name = 'CreateFeedbackReports1791468000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "feedback_reports" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "user_id" integer NOT NULL, "kind" character varying(10) NOT NULL, "title" character varying(100) NOT NULL, "body" text NOT NULL, "context" jsonb, "screenshot_path" character varying(100), "status" character varying(12) NOT NULL DEFAULT 'open', "assignee_user_id" integer, "resolution" text, CONSTRAINT "CHK_01cc67f45c69ce8eb94bf1e589" CHECK ("status" IN ('open', 'triaged', 'in_progress', 'done', 'wont_fix')), CONSTRAINT "CHK_557a7ba154fa2c6f070ed072f4" CHECK ("kind" IN ('bug', 'feature', 'question')), CONSTRAINT "PK_49e87e2488fde3445543454ba05" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_04c487116db65fa60f327a0ecd" ON "feedback_reports" ("created_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f3d95f192fc0c9505f0a323246" ON "feedback_reports" ("status", "created_at") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 截圖檔案留在 FEEDBACK_UPLOAD_DIR，需要時手動清除。
    await queryRunner.query(
      `DROP INDEX "public"."IDX_f3d95f192fc0c9505f0a323246"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_04c487116db65fa60f327a0ecd"`,
    );
    await queryRunner.query(`DROP TABLE "feedback_reports"`);
  }
}
