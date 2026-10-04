import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 薪資 snapshot 三張表（規劃文件 3.2 節）。
 * payroll_run 一部門一筆，payroll_run_staff 每人一筆，payroll_run_day 每人每日一筆。
 * 只新增，不動既有 HR 表。
 */
export class AddPayrollRunSnapshot1777200000000 implements MigrationInterface {
  name = 'AddPayrollRunSnapshot1777200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "payroll_run" (
        "id" SERIAL NOT NULL,
        "period_start" date NOT NULL,
        "period_end" date NOT NULL,
        "variant" character varying(10) NOT NULL,
        "department" character varying(4) NOT NULL,
        "source" character varying(10) NOT NULL,
        "status" character varying(10) NOT NULL DEFAULT 'draft',
        "input_json" jsonb NOT NULL,
        "warnings_json" jsonb NOT NULL DEFAULT '[]',
        "file_path" character varying(255),
        "file_sha256" character varying(64),
        "created_by" integer,
        "finalized_by" integer,
        "finalized_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_payroll_run" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_payroll_run_period_variant_department" ON "payroll_run" ("period_start", "variant", "department")`,
    );

    await queryRunner.query(`
      CREATE TABLE "payroll_run_staff" (
        "id" SERIAL NOT NULL,
        "run_id" integer NOT NULL,
        "staff_id" character varying(10) NOT NULL,
        "name" character varying(6) NOT NULL,
        "is_foreign" boolean NOT NULL,
        "need_check" boolean NOT NULL,
        "wage_order" integer NOT NULL,
        "hour_order" integer,
        "work_hours" double precision NOT NULL,
        "overtime_hours" double precision NOT NULL,
        "leave_hours" double precision NOT NULL,
        "late_count" integer NOT NULL,
        "paid_holiday_worked_days" integer NOT NULL,
        "worked_days" integer NOT NULL,
        "overtime_json" jsonb NOT NULL,
        "leave_by_type_json" jsonb NOT NULL,
        "manual_json" jsonb NOT NULL DEFAULT '{}',
        "base_salary" integer NOT NULL,
        "allowance" integer NOT NULL,
        "overtime_pay" integer NOT NULL,
        "full_attendance" integer NOT NULL,
        "bonus" integer NOT NULL,
        "annual_leave_add" integer NOT NULL,
        "organizer" integer NOT NULL,
        "night_allowance" integer NOT NULL,
        "meal_allowance" integer NOT NULL,
        "addition_total" integer NOT NULL,
        "sick_leave" integer NOT NULL,
        "personal_leave" integer NOT NULL,
        "absenteeism" integer NOT NULL,
        "official_holiday" integer NOT NULL,
        "annual_leave_deduct" integer NOT NULL,
        "unpaid_leave" integer NOT NULL,
        "health_insurance" integer NOT NULL,
        "labor_insurance" integer NOT NULL,
        "welfare_fund" integer NOT NULL,
        "advance" integer NOT NULL,
        "tax_withheld" integer NOT NULL,
        "other_deduction" integer NOT NULL,
        "deduction_total" integer NOT NULL,
        "pension" integer NOT NULL,
        "net_pay" integer NOT NULL,
        CONSTRAINT "PK_payroll_run_staff" PRIMARY KEY ("id"),
        CONSTRAINT "FK_payroll_run_staff_run" FOREIGN KEY ("run_id")
          REFERENCES "payroll_run"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_payroll_run_staff_run_name" ON "payroll_run_staff" ("run_id", "name")`,
    );

    await queryRunner.query(`
      CREATE TABLE "payroll_run_day" (
        "id" SERIAL NOT NULL,
        "run_id" integer NOT NULL,
        "name" character varying(6) NOT NULL,
        "date" date NOT NULL,
        "vacation_type" character varying(6) NOT NULL,
        "segments_text" character varying(255) NOT NULL,
        "work" double precision NOT NULL,
        "overtime" double precision NOT NULL,
        "leave_type" character varying(6) NOT NULL,
        "leave_hours" double precision NOT NULL,
        "late" smallint NOT NULL,
        "weekday_flag" smallint NOT NULL,
        CONSTRAINT "PK_payroll_run_day" PRIMARY KEY ("id"),
        CONSTRAINT "FK_payroll_run_day_run" FOREIGN KEY ("run_id")
          REFERENCES "payroll_run"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_payroll_run_day_run_name_date" ON "payroll_run_day" ("run_id", "name", "date")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "payroll_run_day"`);
    await queryRunner.query(`DROP TABLE "payroll_run_staff"`);
    await queryRunner.query(`DROP TABLE "payroll_run"`);
  }
}
