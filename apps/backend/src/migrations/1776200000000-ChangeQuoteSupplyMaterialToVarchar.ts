import { MigrationInterface, QueryRunner } from 'typeorm';

export class ChangeQuoteSupplyMaterialToVarchar1776200000000 implements MigrationInterface {
  name = 'ChangeQuoteSupplyMaterialToVarchar1776200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "quote"
      ALTER COLUMN "is_supply_material" DROP DEFAULT
    `);
    await queryRunner.query(`
      ALTER TABLE "quote"
      ALTER COLUMN "is_supply_material" TYPE varchar(100)
      USING CASE
        WHEN "is_supply_material" = true THEN '是'
        ELSE '否'
      END
    `);
    await queryRunner.query(`
      ALTER TABLE "quote"
      ALTER COLUMN "is_supply_material" DROP NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "quote"
      ALTER COLUMN "is_supply_material" TYPE boolean
      USING CASE
        WHEN "is_supply_material" = '是' THEN true
        ELSE false
      END
    `);
    await queryRunner.query(`
      ALTER TABLE "quote"
      ALTER COLUMN "is_supply_material" SET DEFAULT false
    `);
    await queryRunner.query(`
      ALTER TABLE "quote"
      ALTER COLUMN "is_supply_material" SET NOT NULL
    `);
  }
}
