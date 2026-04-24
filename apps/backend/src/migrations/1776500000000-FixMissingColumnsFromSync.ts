import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixMissingColumnsFromSync1776500000000 implements MigrationInterface {
  name = 'FixMissingColumnsFromSync1776500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // quote_deadline: 可能已由手動 ALTER 加入，使用 IF NOT EXISTS 保護
    await queryRunner.query(
      `ALTER TABLE "quote" ADD COLUMN IF NOT EXISTS "quote_deadline" date`,
    );

    // is_supply_material: boolean → varchar(100)
    const result = await queryRunner.query(
      `SELECT data_type FROM information_schema.columns
       WHERE table_name='quote' AND column_name='is_supply_material'`,
    );
    if (result[0]?.data_type === 'boolean') {
      await queryRunner.query(`ALTER TABLE "quote" ALTER COLUMN "is_supply_material" DROP DEFAULT`);
      await queryRunner.query(`
        ALTER TABLE "quote"
        ALTER COLUMN "is_supply_material" TYPE varchar(100)
        USING CASE WHEN "is_supply_material" = true THEN '是' ELSE '否' END
      `);
      await queryRunner.query(`ALTER TABLE "quote" ALTER COLUMN "is_supply_material" DROP NOT NULL`);
    }

    // processing.code: 新欄位
    await queryRunner.query(
      `ALTER TABLE "processing" ADD COLUMN IF NOT EXISTS "code" character varying(50)`,
    );
    // UNIQUE constraint（IF NOT EXISTS 沒有原生語法，用 DO block 保護）
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'UQ_818404b655c49d8f97f62049643'
        ) THEN
          ALTER TABLE "processing" ADD CONSTRAINT "UQ_818404b655c49d8f97f62049643" UNIQUE ("code");
        END IF;
      END $$
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "processing" DROP CONSTRAINT IF EXISTS "UQ_818404b655c49d8f97f62049643"`);
    await queryRunner.query(`ALTER TABLE "processing" DROP COLUMN IF EXISTS "code"`);

    const result = await queryRunner.query(
      `SELECT data_type FROM information_schema.columns
       WHERE table_name='quote' AND column_name='is_supply_material'`,
    );
    if (result[0]?.data_type !== 'boolean') {
      await queryRunner.query(`
        ALTER TABLE "quote"
        ALTER COLUMN "is_supply_material" TYPE boolean
        USING CASE WHEN "is_supply_material" = '是' THEN true ELSE false END
      `);
      await queryRunner.query(`ALTER TABLE "quote" ALTER COLUMN "is_supply_material" SET DEFAULT false`);
      await queryRunner.query(`ALTER TABLE "quote" ALTER COLUMN "is_supply_material" SET NOT NULL`);
    }

    await queryRunner.query(`ALTER TABLE "quote" DROP COLUMN IF EXISTS "quote_deadline"`);
  }
}
