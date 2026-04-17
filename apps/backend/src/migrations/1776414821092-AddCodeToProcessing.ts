import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCodeToProcessing1776414821092 implements MigrationInterface {
    name = 'AddCodeToProcessing1776414821092'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "order_item" DROP CONSTRAINT "FK_9a1082f87b5dc53109db2c9a238"`);
        await queryRunner.query(`ALTER TABLE "sales_voucher" DROP CONSTRAINT "FK_sales_voucher_customer"`);
        await queryRunner.query(`ALTER TABLE "sales_voucher" DROP CONSTRAINT "FK_sales_voucher_staff"`);
        await queryRunner.query(`ALTER TABLE "sales_voucher" DROP CONSTRAINT "FK_sales_voucher_order"`);
        await queryRunner.query(`ALTER TABLE "sales_voucher_item" DROP CONSTRAINT "FK_sales_voucher_item_voucher"`);
        await queryRunner.query(`ALTER TABLE "design_work_order" DROP CONSTRAINT "FK_dwo_parent_dwo"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_dwo_parent_design_work_order_id"`);
        await queryRunner.query(`ALTER TABLE "order_item" DROP COLUMN "is_nested"`);
        await queryRunner.query(`ALTER TABLE "order_item" DROP COLUMN "drawing_staff_id"`);
        await queryRunner.query(`ALTER TABLE "order_item" DROP COLUMN "unit"`);
        await queryRunner.query(`ALTER TABLE "design_work_order" DROP COLUMN "cad_file"`);
        await queryRunner.query(`ALTER TABLE "design_work_order" DROP COLUMN "cnc_file"`);
        await queryRunner.query(`ALTER TABLE "processing" ADD "code" character varying(50)`);
        await queryRunner.query(`ALTER TABLE "processing" ADD CONSTRAINT "UQ_818404b655c49d8f97f62049643" UNIQUE ("code")`);
        await queryRunner.query(`ALTER TABLE "quote_item" ALTER COLUMN "thickness" TYPE numeric`);
        await queryRunner.query(`ALTER TABLE "order_item" ALTER COLUMN "thickness" TYPE numeric`);
        await queryRunner.query(`ALTER TABLE "sales_voucher_item" ALTER COLUMN "thickness" TYPE numeric`);
        await queryRunner.query(`UPDATE "nesting" SET "thickness" = '0' WHERE "thickness" IS NULL`);
        await queryRunner.query(`ALTER TABLE "nesting" ALTER COLUMN "thickness" TYPE numeric USING "thickness"::numeric`);
        await queryRunner.query(`ALTER TABLE "nesting" ALTER COLUMN "thickness" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "cutting_work_order" DROP COLUMN "thickness"`);
        await queryRunner.query(`ALTER TABLE "cutting_work_order" ADD "thickness" numeric`);
        await queryRunner.query(`ALTER TABLE "sales_voucher" ADD CONSTRAINT "FK_32f53db8ecd75da791259915bc3" FOREIGN KEY ("staff_id") REFERENCES "staff"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "sales_voucher" ADD CONSTRAINT "FK_b07e1b4e50efcf273cf2a2e89d2" FOREIGN KEY ("customer_id") REFERENCES "customer"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "sales_voucher" ADD CONSTRAINT "FK_be947387551c3f3680c1b90acc4" FOREIGN KEY ("order_id") REFERENCES "order"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "sales_voucher_item" ADD CONSTRAINT "FK_ea019967d02f418fc844a70d282" FOREIGN KEY ("sales_voucher_id") REFERENCES "sales_voucher"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "design_work_order" ADD CONSTRAINT "FK_392d7867c735bc3be0a97e2e58d" FOREIGN KEY ("parent_design_work_order_id") REFERENCES "design_work_order"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "design_work_order" DROP CONSTRAINT "FK_392d7867c735bc3be0a97e2e58d"`);
        await queryRunner.query(`ALTER TABLE "sales_voucher_item" DROP CONSTRAINT "FK_ea019967d02f418fc844a70d282"`);
        await queryRunner.query(`ALTER TABLE "sales_voucher" DROP CONSTRAINT "FK_be947387551c3f3680c1b90acc4"`);
        await queryRunner.query(`ALTER TABLE "sales_voucher" DROP CONSTRAINT "FK_b07e1b4e50efcf273cf2a2e89d2"`);
        await queryRunner.query(`ALTER TABLE "sales_voucher" DROP CONSTRAINT "FK_32f53db8ecd75da791259915bc3"`);
        await queryRunner.query(`ALTER TABLE "cutting_work_order" DROP COLUMN "thickness"`);
        await queryRunner.query(`ALTER TABLE "cutting_work_order" ADD "thickness" character varying(50)`);
        await queryRunner.query(`ALTER TABLE "nesting" ALTER COLUMN "thickness" TYPE character varying(50) USING "thickness"::text`);
        await queryRunner.query(`ALTER TABLE "nesting" ALTER COLUMN "thickness" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "sales_voucher_item" ALTER COLUMN "thickness" TYPE numeric`);
        await queryRunner.query(`ALTER TABLE "order_item" ALTER COLUMN "thickness" TYPE numeric`);
        await queryRunner.query(`ALTER TABLE "quote_item" ALTER COLUMN "thickness" TYPE numeric`);
        await queryRunner.query(`ALTER TABLE "processing" DROP CONSTRAINT "UQ_818404b655c49d8f97f62049643"`);
        await queryRunner.query(`ALTER TABLE "processing" DROP COLUMN "code"`);
        await queryRunner.query(`ALTER TABLE "design_work_order" ADD "cnc_file" character varying(500)`);
        await queryRunner.query(`ALTER TABLE "design_work_order" ADD "cad_file" character varying(500)`);
        await queryRunner.query(`ALTER TABLE "order_item" ADD "unit" character varying(20)`);
        await queryRunner.query(`ALTER TABLE "order_item" ADD "drawing_staff_id" character varying(10)`);
        await queryRunner.query(`ALTER TABLE "order_item" ADD "is_nested" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`CREATE INDEX "IDX_dwo_parent_design_work_order_id" ON "design_work_order" ("parent_design_work_order_id") `);
        await queryRunner.query(`ALTER TABLE "design_work_order" ADD CONSTRAINT "FK_dwo_parent_dwo" FOREIGN KEY ("parent_design_work_order_id") REFERENCES "design_work_order"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "sales_voucher_item" ADD CONSTRAINT "FK_sales_voucher_item_voucher" FOREIGN KEY ("sales_voucher_id") REFERENCES "sales_voucher"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "sales_voucher" ADD CONSTRAINT "FK_sales_voucher_order" FOREIGN KEY ("order_id") REFERENCES "order"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "sales_voucher" ADD CONSTRAINT "FK_sales_voucher_staff" FOREIGN KEY ("staff_id") REFERENCES "staff"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "sales_voucher" ADD CONSTRAINT "FK_sales_voucher_customer" FOREIGN KEY ("customer_id") REFERENCES "customer"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "order_item" ADD CONSTRAINT "FK_9a1082f87b5dc53109db2c9a238" FOREIGN KEY ("drawing_staff_id") REFERENCES "staff"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
