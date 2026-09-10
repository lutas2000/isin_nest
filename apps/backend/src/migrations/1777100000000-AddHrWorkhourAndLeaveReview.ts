import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddHrWorkhourAndLeaveReview1777100000000
  implements MigrationInterface
{
  name = 'AddHrWorkhourAndLeaveReview1777100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "staff_leave" ADD COLUMN IF NOT EXISTS "status" varchar(20) NOT NULL DEFAULT 'pending'`,
    );
    await queryRunner.query(
      `ALTER TABLE "staff_leave" ADD COLUMN IF NOT EXISTS "verify_note" varchar(255)`,
    );
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "staff_workhour" (
        "id" serial NOT NULL,
        "staffId" varchar(10) NOT NULL,
        "date" date NOT NULL,
        "work_time" double precision NOT NULL DEFAULT 0,
        "leave_time" double precision NOT NULL DEFAULT 0,
        "overtime" double precision NOT NULL DEFAULT 0,
        "late" integer NOT NULL DEFAULT 0,
        CONSTRAINT "PK_staff_workhour" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_staff_workhour_staff_date" UNIQUE ("staffId", "date"),
        CONSTRAINT "FK_staff_workhour_staff" FOREIGN KEY ("staffId") REFERENCES "staff"("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "staff_workhour"`);
    await queryRunner.query(
      `ALTER TABLE "staff_leave" DROP COLUMN IF EXISTS "verify_note"`,
    );
    await queryRunner.query(
      `ALTER TABLE "staff_leave" DROP COLUMN IF EXISTS "status"`,
    );
  }
}
