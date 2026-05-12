import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDeliveryDeadlineToOrder1776700000000 implements MigrationInterface {
  name = 'AddDeliveryDeadlineToOrder1776700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "order" ADD COLUMN IF NOT EXISTS "delivery_deadline" date`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "order" DROP COLUMN IF EXISTS "delivery_deadline"`);
  }
}
