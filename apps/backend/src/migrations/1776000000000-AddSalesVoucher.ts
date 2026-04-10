import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSalesVoucher1776000000000 implements MigrationInterface {
  name = 'AddSalesVoucher1776000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "sales_voucher" (
        "id" character varying(50) NOT NULL,
        "order_id" character varying(50),
        "staff_id" character varying(10) NOT NULL,
        "customer_id" character varying(50) NOT NULL,
        "shipping_method" character varying(50) NOT NULL,
        "payment_method" character varying(50) NOT NULL,
        "notes" text,
        "amount" numeric(15,2) NOT NULL DEFAULT 0,
        "tax" numeric(15,2) NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_sales_voucher" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "sales_voucher"
      ADD CONSTRAINT "FK_sales_voucher_order"
      FOREIGN KEY ("order_id") REFERENCES "order"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "sales_voucher"
      ADD CONSTRAINT "FK_sales_voucher_staff"
      FOREIGN KEY ("staff_id") REFERENCES "staff"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "sales_voucher"
      ADD CONSTRAINT "FK_sales_voucher_customer"
      FOREIGN KEY ("customer_id") REFERENCES "customer"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      CREATE TABLE "sales_voucher_item" (
        "id" SERIAL NOT NULL,
        "sales_voucher_id" character varying(50) NOT NULL,
        "cad_file" character varying(500),
        "customer_file" character varying(500),
        "material" character varying(100),
        "thickness" numeric,
        "quantity" integer NOT NULL DEFAULT 0,
        "substitute" character varying(3),
        "source" character varying(50) NOT NULL,
        "processing_ids" jsonb,
        "unit_price" numeric(15,2) NOT NULL DEFAULT 0,
        "estimated_cutting_time" integer,
        "drawing_number" character varying(100),
        "nesting_id" integer,
        "status" character varying(50) NOT NULL DEFAULT 'TODO',
        "notes" text,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_sales_voucher_item" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "sales_voucher_item"
      ADD CONSTRAINT "FK_sales_voucher_item_voucher"
      FOREIGN KEY ("sales_voucher_id") REFERENCES "sales_voucher"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "sales_voucher_item" DROP CONSTRAINT "FK_sales_voucher_item_voucher"`,
    );
    await queryRunner.query(`DROP TABLE "sales_voucher_item"`);
    await queryRunner.query(
      `ALTER TABLE "sales_voucher" DROP CONSTRAINT "FK_sales_voucher_customer"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sales_voucher" DROP CONSTRAINT "FK_sales_voucher_staff"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sales_voucher" DROP CONSTRAINT "FK_sales_voucher_order"`,
    );
    await queryRunner.query(`DROP TABLE "sales_voucher"`);
  }
}
