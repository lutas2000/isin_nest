import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveSalesVoucherItemNestingId1776110000000
  implements MigrationInterface
{
  name = 'RemoveSalesVoucherItemNestingId1776110000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "sales_voucher_item" DROP COLUMN "nesting_id"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "sales_voucher_item" ADD "nesting_id" integer`,
    );
  }
}
