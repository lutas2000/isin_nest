import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlignHrSchemaToLegacy1777100000000 implements MigrationInterface {
  name = 'AlignHrSchemaToLegacy1777100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // --- staff: column length alignment ---
    await queryRunner.query(
      `ALTER TABLE "staff" ALTER COLUMN "name" TYPE character varying(6)`,
    );
    await queryRunner.query(
      `ALTER TABLE "staff" ALTER COLUMN "post" TYPE character varying(8)`,
    );
    await queryRunner.query(
      `ALTER TABLE "staff" ALTER COLUMN "work_group" TYPE character varying(4)`,
    );
    await queryRunner.query(
      `ALTER TABLE "staff" ALTER COLUMN "department" TYPE character varying(4)`,
    );
    await queryRunner.query(
      `UPDATE "staff" SET "begain_work" = CURRENT_DATE WHERE "begain_work" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "staff" ALTER COLUMN "begain_work" SET NOT NULL`,
    );

    // --- staff_manhour: staffId -> name ---
    const manhourHasStaffId = await queryRunner.query(
      `SELECT 1 FROM information_schema.columns
       WHERE table_name='staff_manhour' AND column_name='staffId'`,
    );
    if (manhourHasStaffId.length > 0) {
      await queryRunner.query(
        `ALTER TABLE "staff_manhour" RENAME COLUMN "staffId" TO "name"`,
      );
      await queryRunner.query(
        `ALTER TABLE "staff_manhour" ALTER COLUMN "name" TYPE character varying(6)`,
      );
    }

    // --- staff_manhour2 ---
    const manhour2HasStaffId = await queryRunner.query(
      `SELECT 1 FROM information_schema.columns
       WHERE table_name='staff_manhour2' AND column_name='staffId'`,
    );
    if (manhour2HasStaffId.length > 0) {
      await queryRunner.query(
        `ALTER TABLE "staff_manhour2" RENAME COLUMN "staffId" TO "name"`,
      );
      await queryRunner.query(
        `ALTER TABLE "staff_manhour2" ALTER COLUMN "name" TYPE character varying(5)`,
      );
    } else {
      const manhour2Exists = await queryRunner.query(
        `SELECT 1 FROM information_schema.tables WHERE table_name='staff_manhour2'`,
      );
      if (manhour2Exists.length === 0) {
        await queryRunner.query(`
          CREATE TABLE "staff_manhour2" (
            "id" SERIAL NOT NULL,
            "name" character varying(5) NOT NULL,
            "start_time" TIMESTAMP WITH TIME ZONE,
            "end_time" TIMESTAMP WITH TIME ZONE,
            "work_time" double precision NOT NULL DEFAULT 0,
            CONSTRAINT "PK_staff_manhour2" PRIMARY KEY ("id")
          )
        `);
      }
    }

    // --- staff_leave: staff_id -> name, verify_by_staff_id -> verify ---
    const leaveHasStaffId = await queryRunner.query(
      `SELECT 1 FROM information_schema.columns
       WHERE table_name='staff_leave' AND column_name='staff_id'`,
    );
    if (leaveHasStaffId.length > 0) {
      await queryRunner.query(
        `ALTER TABLE "staff_leave" RENAME COLUMN "staff_id" TO "name"`,
      );
      await queryRunner.query(
        `ALTER TABLE "staff_leave" ALTER COLUMN "name" TYPE character varying(6)`,
      );
    }
    const leaveHasVerifyBy = await queryRunner.query(
      `SELECT 1 FROM information_schema.columns
       WHERE table_name='staff_leave' AND column_name='verify_by_staff_id'`,
    );
    if (leaveHasVerifyBy.length > 0) {
      await queryRunner.query(
        `ALTER TABLE "staff_leave" RENAME COLUMN "verify_by_staff_id" TO "verify"`,
      );
      await queryRunner.query(
        `ALTER TABLE "staff_leave" ALTER COLUMN "verify" TYPE character varying(6)`,
      );
      await queryRunner.query(
        `ALTER TABLE "staff_leave" ALTER COLUMN "verify" SET NOT NULL`,
      );
    }
    await queryRunner.query(
      `ALTER TABLE "staff_leave" ALTER COLUMN "type" TYPE character varying(4)`,
    );

    // --- staff_segment: staffId -> name, booleans -> int ---
    const segmentHasStaffId = await queryRunner.query(
      `SELECT 1 FROM information_schema.columns
       WHERE table_name='staff_segment' AND column_name='staffId'`,
    );
    if (segmentHasStaffId.length > 0) {
      await queryRunner.query(
        `ALTER TABLE "staff_segment" RENAME COLUMN "staffId" TO "name"`,
      );
      await queryRunner.query(
        `ALTER TABLE "staff_segment" ALTER COLUMN "name" TYPE character varying(6)`,
      );
    }
    for (const col of ['cross_day', 'duty', 'night_work']) {
      const colInfo = await queryRunner.query(
        `SELECT data_type FROM information_schema.columns
         WHERE table_name='staff_segment' AND column_name='${col}'`,
      );
      if (colInfo[0]?.data_type === 'boolean') {
        await queryRunner.query(
          `ALTER TABLE "staff_segment" ALTER COLUMN "${col}" DROP DEFAULT`,
        );
        await queryRunner.query(`
          ALTER TABLE "staff_segment"
          ALTER COLUMN "${col}" TYPE integer
          USING CASE WHEN "${col}" = true THEN 1 ELSE 0 END
        `);
      }
    }

    // --- staff_vacation: pay boolean -> int, remove type ---
    const vacationPayType = await queryRunner.query(
      `SELECT data_type FROM information_schema.columns
       WHERE table_name='staff_vacation' AND column_name='pay'`,
    );
    if (vacationPayType[0]?.data_type === 'boolean') {
      await queryRunner.query(`
        ALTER TABLE "staff_vacation"
        ALTER COLUMN "pay" DROP DEFAULT
      `);
      await queryRunner.query(`
        ALTER TABLE "staff_vacation"
        ALTER COLUMN "pay" TYPE integer
        USING CASE WHEN "pay" = true THEN 1 ELSE 0 END
      `);
    }
    await queryRunner.query(
      `ALTER TABLE "staff_vacation" DROP COLUMN IF EXISTS "type"`,
    );

    // --- attend_record: int PK -> varchar(32) PK ---
    const attendIdType = await queryRunner.query(
      `SELECT data_type FROM information_schema.columns
       WHERE table_name='attend_record' AND column_name='id'`,
    );
    if (attendIdType[0]?.data_type !== 'character varying') {
      await queryRunner.query(`
        CREATE TABLE "attend_record_new" (
          "id" character varying(32) NOT NULL,
          "staff_id" character varying(10) NOT NULL,
          "staff_name" character varying(6),
          "create_time" TIMESTAMP WITH TIME ZONE NOT NULL,
          "input_type" character varying(10),
          "attend_type" integer NOT NULL DEFAULT 0,
          CONSTRAINT "PK_attend_record" PRIMARY KEY ("id")
        )
      `);
      await queryRunner.query(`
        INSERT INTO "attend_record_new" ("id", "staff_id", "staff_name", "create_time", "input_type", "attend_type")
        SELECT
          COALESCE(
            NULLIF(TRUNC(EXTRACT(EPOCH FROM "create_time"))::text || COALESCE("staff_name", ''), ''),
            "id"::text
          ),
          "staff_id",
          "staff_name",
          "create_time",
          "input_type",
          "attend_type"
        FROM "attend_record"
      `);
      await queryRunner.query(`DROP TABLE "attend_record"`);
      await queryRunner.query(
        `ALTER TABLE "attend_record_new" RENAME TO "attend_record"`,
      );
    } else {
      await queryRunner.query(
        `ALTER TABLE "attend_record" ALTER COLUMN "input_type" TYPE character varying(10)`,
      );
    }

    // --- staff_workhour (new table) ---
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "staff_workhour" (
        "id" SERIAL NOT NULL,
        "name" character varying(6) NOT NULL,
        "date" date NOT NULL,
        "work_time" double precision NOT NULL,
        "leave_time" double precision NOT NULL,
        "overtime" double precision NOT NULL,
        "late" integer NOT NULL,
        CONSTRAINT "PK_staff_workhour" PRIMARY KEY ("id")
      )
    `);

    // --- staff_authority (new table) ---
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "staff_authority" (
        "id" character varying(10) NOT NULL,
        "root" integer NOT NULL,
        "manage" integer NOT NULL,
        "cut" integer NOT NULL,
        "order" integer NOT NULL,
        "material" integer NOT NULL,
        "dwg" integer NOT NULL,
        "group" character varying(5),
        CONSTRAINT "PK_staff_authority" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "staff_authority"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "staff_workhour"`);
    // Reverting attend_record PK change is destructive; skip in down migration.
  }
}
