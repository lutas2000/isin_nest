import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveProcessingNotes1738764100000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasNotesColumn = await queryRunner.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'processing' AND column_name = 'notes'
    `);

    if (hasNotesColumn.length > 0) {
      await queryRunner.query(`ALTER TABLE processing DROP COLUMN notes`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE processing ADD COLUMN notes TEXT
    `);
  }
}
