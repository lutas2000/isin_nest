import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveSalesVoucherItemCuttingTimeAndStatus1776100000000
  implements MigrationInterface
{
  name = 'RemoveSalesVoucherItemCuttingTimeAndStatus1776100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "sales_voucher_item" DROP COLUMN "estimated_cutting_time"`,
    );
    await queryRunner.query(`ALTER TABLE "sales_voucher_item" DROP COLUMN "status"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "sales_voucher_item" ADD "estimated_cutting_time" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "sales_voucher_item" ADD "status" character varying(50) NOT NULL DEFAULT 'TODO'`,
    );
  }
}
