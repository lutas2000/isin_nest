import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCncFileNameToCuttingWorkOrder1773619200000 implements MigrationInterface {
    name = 'AddCncFileNameToCuttingWorkOrder1773619200000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "cutting_work_order" ADD "cnc_file_name" character varying(255)`);
        await queryRunner.query(`ALTER TABLE "cutting_work_order" ALTER COLUMN "nesting_id" TYPE character varying(100) USING nesting_id::character varying(100)`);
        await queryRunner.query(`ALTER TABLE "order_item" ALTER COLUMN "thickness" TYPE numeric USING thickness::numeric`);
        await queryRunner.query(`ALTER TABLE "quote_item" ALTER COLUMN "thickness" TYPE numeric USING thickness::numeric`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "quote_item" ALTER COLUMN "thickness" TYPE character varying(50) USING thickness::character varying(50)`);
        await queryRunner.query(`ALTER TABLE "order_item" ALTER COLUMN "thickness" TYPE character varying(50) USING thickness::character varying(50)`);
        await queryRunner.query(`ALTER TABLE "cutting_work_order" ALTER COLUMN "nesting_id" TYPE integer USING nesting_id::integer`);
        await queryRunner.query(`ALTER TABLE "cutting_work_order" DROP COLUMN "cnc_file_name"`);
    }

}
