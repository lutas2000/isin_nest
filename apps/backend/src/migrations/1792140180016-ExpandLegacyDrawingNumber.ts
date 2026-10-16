import { MigrationInterface, QueryRunner } from 'typeorm';

/** 擴充電腦圖號，保留既有值、索引、主鍵與 C collation。 */
export class ExpandLegacyDrawingNumber1792140180016
  implements MigrationInterface
{
  name = 'ExpandLegacyDrawingNumber1792140180016';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of [
      'parts',
      'order_items',
      'sales_items',
      'work_items',
      'drawing_group_items',
    ]) {
      await queryRunner.query(
        `ALTER TABLE "legacy_crm"."${table}" ALTER COLUMN "drawing_no" TYPE character varying(12) COLLATE "C"`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 不使用 USING/cast，讓 PostgreSQL 在仍有 11–12 碼資料時拒絕縮欄，避免截斷。
    for (const table of [
      'parts',
      'order_items',
      'sales_items',
      'work_items',
      'drawing_group_items',
    ]) {
      await queryRunner.query(
        `ALTER TABLE "legacy_crm"."${table}" ALTER COLUMN "drawing_no" TYPE character varying(10) COLLATE "C"`,
      );
    }
  }
}
