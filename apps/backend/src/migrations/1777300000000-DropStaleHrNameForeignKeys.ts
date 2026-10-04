import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * AlignHrSchemaToLegacy 把 staffId/staff_id 欄位改名為 name（以及 verify_by_staff_id → verify），
 * 但舊的外鍵 `(name) REFERENCES staff(id)` 留了下來，之後任何以姓名寫入 staff_leave、
 * staff_manhour、staff_manhour2、staff_segment 都會違反外鍵。舊 MariaDB 這些表本來就沒有外鍵，
 * staff.name 也沒有唯一限制，所以這裡只移除錯誤的外鍵，不另建新的。
 */
export class DropStaleHrNameForeignKeys1777300000000 implements MigrationInterface {
  name = 'DropStaleHrNameForeignKeys1777300000000';

  private readonly tables = ['staff_leave', 'staff_manhour', 'staff_manhour2', 'staff_segment'];

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of this.tables) {
      const rows: Array<{ conname: string; def: string }> = await queryRunner.query(
        `SELECT conname, pg_get_constraintdef(oid) AS def
         FROM pg_constraint
         WHERE contype = 'f' AND conrelid = to_regclass($1)`,
        [`public.${table}`],
      );
      for (const row of rows) {
        if (/FOREIGN KEY \((name|verify)\) REFERENCES staff\(id\)/.test(row.def)) {
          await queryRunner.query(`ALTER TABLE "${table}" DROP CONSTRAINT "${row.conname}"`);
        }
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 還原成改名前遺留的狀態；只有在資料仍符合時才能成功。
    for (const table of this.tables) {
      await queryRunner.query(
        `ALTER TABLE "${table}" ADD CONSTRAINT "FK_${table}_name_staff_id" FOREIGN KEY ("name") REFERENCES "staff"("id")`,
      );
    }
    await queryRunner.query(
      `ALTER TABLE "staff_leave" ADD CONSTRAINT "FK_staff_leave_verify_staff_id" FOREIGN KEY ("verify") REFERENCES "staff"("id")`,
    );
  }
}
