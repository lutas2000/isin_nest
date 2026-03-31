import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSubstituteToOrderItem1774100000000 implements MigrationInterface {
  name = 'AddSubstituteToOrderItem1774100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "order_item" ADD "substitute" character varying(3)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "order_item" DROP COLUMN "substitute"`,
    );
  }
}

