import { MigrationInterface, QueryRunner } from 'typeorm';

export class CrmConfigCodeSingleChar1776900000000 implements MigrationInterface {
  name = 'CrmConfigCodeSingleChar1776900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "crm_config"
      SET "code" = CASE
        WHEN "category" = 'shipping_method' AND "code" = 'PICKUP' THEN 'P'
        WHEN "category" = 'shipping_method' AND "code" = 'EXPRESS' THEN 'E'
        WHEN "category" = 'shipping_method' AND "code" = 'FREIGHT' THEN 'F'
        WHEN "category" = 'payment_method' AND "code" = 'CASH' THEN 'C'
        WHEN "category" = 'payment_method' AND "code" = 'TRANSFER' THEN 'T'
        WHEN "category" = 'payment_method' AND "code" = 'MONTHLY' THEN 'M'
        WHEN "category" = 'source_type' AND "code" = 'NEW' THEN 'N'
        WHEN "category" = 'source_type' AND "code" = 'OLD' THEN 'O'
        WHEN "category" = 'source_type' AND "code" = 'MODIFIED' THEN 'D'
        WHEN "category" = 'source' AND "code" = 'ORDER_NEW' THEN 'N'
        WHEN "category" = 'substitute' AND "code" = 'SUBSTITUTE' THEN 'S'
        WHEN "category" = 'substitute' AND "code" = 'SUB_DISCOUNT' THEN 'D'
        WHEN "category" = 'vat_rate' AND "code" = 'default' THEN '5'
        ELSE UPPER(LEFT("code", 1))
      END
      WHERE LENGTH("code") > 1
    `);

    await queryRunner.query(`
      ALTER TABLE "crm_config"
      ALTER COLUMN "code" TYPE varchar(1)
      USING LEFT("code", 1)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "crm_config"
      ALTER COLUMN "code" TYPE varchar(50)
      USING "code"
    `);
  }
}
