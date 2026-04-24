import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixMissingDesignWorkOrderColumns1776600000000 implements MigrationInterface {
  name = 'FixMissingDesignWorkOrderColumns1776600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "design_work_order" ADD COLUMN IF NOT EXISTS "is_drawing_group" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "design_work_order" ADD COLUMN IF NOT EXISTS "parent_design_work_order_id" integer`,
    );
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_dwo_parent_dwo'
        ) THEN
          ALTER TABLE "design_work_order"
            ADD CONSTRAINT "FK_dwo_parent_dwo"
            FOREIGN KEY ("parent_design_work_order_id")
            REFERENCES "design_work_order"("id")
            ON DELETE CASCADE ON UPDATE NO ACTION;
        END IF;
      END $$
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes
          WHERE indexname = 'IDX_dwo_parent_design_work_order_id'
        ) THEN
          CREATE INDEX "IDX_dwo_parent_design_work_order_id"
            ON "design_work_order" ("parent_design_work_order_id");
        END IF;
      END $$
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_dwo_parent_design_work_order_id"`);
    await queryRunner.query(`ALTER TABLE "design_work_order" DROP CONSTRAINT IF EXISTS "FK_dwo_parent_dwo"`);
    await queryRunner.query(`ALTER TABLE "design_work_order" DROP COLUMN IF EXISTS "parent_design_work_order_id"`);
    await queryRunner.query(`ALTER TABLE "design_work_order" DROP COLUMN IF EXISTS "is_drawing_group"`);
  }
}
