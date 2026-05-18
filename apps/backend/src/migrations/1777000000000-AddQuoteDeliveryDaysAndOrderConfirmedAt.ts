import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddQuoteDeliveryDaysAndOrderConfirmedAt1777000000000
  implements MigrationInterface
{
  name = 'AddQuoteDeliveryDaysAndOrderConfirmedAt1777000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "quote" ADD COLUMN IF NOT EXISTS "delivery_days" integer NOT NULL DEFAULT 7`,
    );
    await queryRunner.query(
      `ALTER TABLE "quote" ADD COLUMN IF NOT EXISTS "order_confirmed_at" timestamptz`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "quote" DROP COLUMN IF EXISTS "order_confirmed_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "quote" DROP COLUMN IF EXISTS "delivery_days"`,
    );
  }
}
