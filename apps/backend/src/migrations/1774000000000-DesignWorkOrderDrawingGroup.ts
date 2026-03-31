import { MigrationInterface, QueryRunner } from 'typeorm';

export class DesignWorkOrderDrawingGroup1774000000000 implements MigrationInterface {
  name = 'DesignWorkOrderDrawingGroup1774000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "design_work_order" ADD "is_drawing_group" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "design_work_order" ADD "parent_design_work_order_id" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "design_work_order" ADD CONSTRAINT "FK_dwo_parent_dwo" FOREIGN KEY ("parent_design_work_order_id") REFERENCES "design_work_order"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_dwo_parent_design_work_order_id" ON "design_work_order" ("parent_design_work_order_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_dwo_parent_design_work_order_id"`);
    await queryRunner.query(`ALTER TABLE "design_work_order" DROP CONSTRAINT "FK_dwo_parent_dwo"`);
    await queryRunner.query(`ALTER TABLE "design_work_order" DROP COLUMN "parent_design_work_order_id"`);
    await queryRunner.query(`ALTER TABLE "design_work_order" DROP COLUMN "is_drawing_group"`);
  }
}
