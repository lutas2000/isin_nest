import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddQuoteDeadlineAndSupplyMaterialToQuote1775900000000 implements MigrationInterface {
  name = 'AddQuoteDeadlineAndSupplyMaterialToQuote1775900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "quote" ADD COLUMN IF NOT EXISTS "is_supply_material" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "quote" ADD COLUMN IF NOT EXISTS "quote_deadline" date`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "quote" DROP COLUMN IF EXISTS "quote_deadline"`);
    await queryRunner.query(`ALTER TABLE "quote" DROP COLUMN IF EXISTS "is_supply_material"`);
  }
}
