import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUnitToCrmLineItems1776800000000 implements MigrationInterface {
  name = 'AddUnitToCrmLineItems1776800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const tables = ['order_item', 'quote_item', 'sales_voucher_item'] as const;
    for (const table of tables) {
      await queryRunner.query(
        `ALTER TABLE "${table}" ADD "unit" character varying(20) NOT NULL DEFAULT '片'`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const tables = ['sales_voucher_item', 'quote_item', 'order_item'] as const;
    for (const table of tables) {
      await queryRunner.query(`ALTER TABLE "${table}" DROP COLUMN "unit"`);
    }
  }
}
