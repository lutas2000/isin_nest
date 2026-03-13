import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCncFileNameToCuttingWorkOrder1773619200000 implements MigrationInterface {
    name = 'AddCncFileNameToCuttingWorkOrder1773619200000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "cutting_work_order" ADD "cnc_file_name" character varying(255)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "cutting_work_order" DROP COLUMN "cnc_file_name"`);
    }

}
