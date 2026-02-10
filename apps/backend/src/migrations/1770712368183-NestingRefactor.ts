import { MigrationInterface, QueryRunner } from "typeorm";

export class NestingRefactor1770712368183 implements MigrationInterface {
    name = 'NestingRefactor1770712368183'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "processing" DROP CONSTRAINT "fk_processing_vendor"`);
        await queryRunner.query(`ALTER TABLE "processing_work_order" DROP CONSTRAINT "fk_pwo_vendor"`);
        await queryRunner.query(`ALTER TABLE "processing_work_order" DROP CONSTRAINT "fk_pwo_processing"`);
        await queryRunner.query(`ALTER TABLE "outsourcing_cost" DROP CONSTRAINT "fk_oc_processing_work_order"`);
        await queryRunner.query(`ALTER TABLE "nesting_item" DROP CONSTRAINT "FK_3b4c0df5443d9a3f551b9dc4637"`);
        await queryRunner.query(`DROP INDEX "public"."idx_processing_vendor"`);
        await queryRunner.query(`DROP INDEX "public"."idx_processing_active"`);
        await queryRunner.query(`DROP INDEX "public"."idx_pwo_processing"`);
        await queryRunner.query(`DROP INDEX "public"."idx_pwo_vendor"`);
        await queryRunner.query(`ALTER TABLE "processing" DROP COLUMN "is_active"`);
        await queryRunner.query(`ALTER TABLE "processing" DROP COLUMN "created_at"`);
        await queryRunner.query(`ALTER TABLE "processing" DROP COLUMN "updated_at"`);
        await queryRunner.query(`ALTER TABLE "processing" DROP COLUMN IF EXISTS "notes"`);
        await queryRunner.query(`ALTER TABLE "processing_work_order" DROP COLUMN "vendor_id"`);
        await queryRunner.query(`ALTER TABLE "nesting_item" DROP COLUMN "order_item_id"`);
        await queryRunner.query(`ALTER TABLE "nesting" DROP CONSTRAINT "UQ_6861ee433e745c346c403925773"`);
        await queryRunner.query(`ALTER TABLE "nesting" DROP COLUMN "nesting_number"`);
        await queryRunner.query(`ALTER TABLE "nesting" DROP COLUMN "status"`);
        await queryRunner.query(`ALTER TABLE "nesting" DROP COLUMN "notes"`);
        await queryRunner.query(`ALTER TABLE "nesting_item" ADD "processing_time_seconds" integer`);
        await queryRunner.query(`ALTER TABLE "nesting_item" ADD "x" numeric(10,2)`);
        await queryRunner.query(`ALTER TABLE "nesting_item" ADD "y" numeric(10,2)`);
        await queryRunner.query(`ALTER TABLE "nesting" ADD "x" numeric(10,2)`);
        await queryRunner.query(`ALTER TABLE "nesting" ADD "y" numeric(10,2)`);
        await queryRunner.query(`ALTER TABLE "nesting" ADD "cut_length" numeric(15,4)`);
        await queryRunner.query(`ALTER TABLE "nesting" ADD "line_length" numeric(15,4)`);
        await queryRunner.query(`ALTER TABLE "nesting" ADD "processing_time_seconds" integer`);
        await queryRunner.query(`ALTER TABLE "nesting" ADD "utilization" numeric(6,3)`);
        await queryRunner.query(`ALTER TABLE "nesting" ADD "weight" numeric(12,4)`);
        await queryRunner.query(`ALTER TABLE "nesting" ADD "scrap" numeric(6,3)`);
        await queryRunner.query(`ALTER TABLE "processing" ALTER COLUMN "display_order" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "processing_work_order" ALTER COLUMN "processing_id" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "outsourcing_cost" ALTER COLUMN "processing_work_order_id" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "nesting_item" DROP CONSTRAINT "FK_484306f24bab132352ef2192cc9"`);
        await queryRunner.query(`ALTER TABLE "nesting_item" DROP CONSTRAINT "PK_44711d127becf36ccdac2455982"`);
        await queryRunner.query(`ALTER TABLE "nesting_item" DROP COLUMN "id"`);
        await queryRunner.query(`ALTER TABLE "nesting_item" ADD "id" text NOT NULL`);
        await queryRunner.query(`ALTER TABLE "nesting_item" ADD CONSTRAINT "PK_44711d127becf36ccdac2455982" PRIMARY KEY ("id")`);
        await queryRunner.query(`ALTER TABLE "nesting_item" DROP COLUMN "nesting_id"`);
        await queryRunner.query(`ALTER TABLE "nesting_item" ADD "nesting_id" text`);
        await queryRunner.query(`ALTER TABLE "nesting" DROP CONSTRAINT "PK_71a49397e2e3b1f596f397fe705"`);
        await queryRunner.query(`ALTER TABLE "nesting" DROP COLUMN "id"`);
        await queryRunner.query(`ALTER TABLE "nesting" ADD "id" text NOT NULL`);
        await queryRunner.query(`ALTER TABLE "nesting" ADD CONSTRAINT "PK_71a49397e2e3b1f596f397fe705" PRIMARY KEY ("id")`);
        await queryRunner.query(`ALTER TABLE "processing" ADD CONSTRAINT "FK_e3dfa88c25747caaa0e20baf10f" FOREIGN KEY ("vendor_id") REFERENCES "vendor"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "processing_work_order" ADD CONSTRAINT "FK_0658a453d0ee2d7c15dbf8206ac" FOREIGN KEY ("processing_id") REFERENCES "processing"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "outsourcing_cost" ADD CONSTRAINT "FK_ef6b06e9743735333d150890d47" FOREIGN KEY ("processing_work_order_id") REFERENCES "processing_work_order"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "nesting_item" ADD CONSTRAINT "FK_484306f24bab132352ef2192cc9" FOREIGN KEY ("nesting_id") REFERENCES "nesting"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "nesting_item" DROP CONSTRAINT "FK_484306f24bab132352ef2192cc9"`);
        await queryRunner.query(`ALTER TABLE "outsourcing_cost" DROP CONSTRAINT "FK_ef6b06e9743735333d150890d47"`);
        await queryRunner.query(`ALTER TABLE "processing_work_order" DROP CONSTRAINT "FK_0658a453d0ee2d7c15dbf8206ac"`);
        await queryRunner.query(`ALTER TABLE "processing" DROP CONSTRAINT "FK_e3dfa88c25747caaa0e20baf10f"`);
        await queryRunner.query(`ALTER TABLE "nesting" DROP CONSTRAINT "PK_71a49397e2e3b1f596f397fe705"`);
        await queryRunner.query(`ALTER TABLE "nesting" DROP COLUMN "id"`);
        await queryRunner.query(`ALTER TABLE "nesting" ADD "id" SERIAL NOT NULL`);
        await queryRunner.query(`ALTER TABLE "nesting" ADD CONSTRAINT "PK_71a49397e2e3b1f596f397fe705" PRIMARY KEY ("id")`);
        await queryRunner.query(`ALTER TABLE "nesting_item" DROP COLUMN "nesting_id"`);
        await queryRunner.query(`ALTER TABLE "nesting_item" ADD "nesting_id" integer NOT NULL`);
        await queryRunner.query(`ALTER TABLE "nesting_item" DROP CONSTRAINT "PK_44711d127becf36ccdac2455982"`);
        await queryRunner.query(`ALTER TABLE "nesting_item" DROP COLUMN "id"`);
        await queryRunner.query(`ALTER TABLE "nesting_item" ADD "id" SERIAL NOT NULL`);
        await queryRunner.query(`ALTER TABLE "nesting_item" ADD CONSTRAINT "PK_44711d127becf36ccdac2455982" PRIMARY KEY ("id")`);
        await queryRunner.query(`ALTER TABLE "nesting_item" ADD CONSTRAINT "FK_484306f24bab132352ef2192cc9" FOREIGN KEY ("nesting_id") REFERENCES "nesting"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "outsourcing_cost" ALTER COLUMN "processing_work_order_id" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "processing_work_order" ALTER COLUMN "processing_id" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "processing" ALTER COLUMN "display_order" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "nesting" DROP COLUMN "scrap"`);
        await queryRunner.query(`ALTER TABLE "nesting" DROP COLUMN "weight"`);
        await queryRunner.query(`ALTER TABLE "nesting" DROP COLUMN "utilization"`);
        await queryRunner.query(`ALTER TABLE "nesting" DROP COLUMN "processing_time_seconds"`);
        await queryRunner.query(`ALTER TABLE "nesting" DROP COLUMN "line_length"`);
        await queryRunner.query(`ALTER TABLE "nesting" DROP COLUMN "cut_length"`);
        await queryRunner.query(`ALTER TABLE "nesting" DROP COLUMN "y"`);
        await queryRunner.query(`ALTER TABLE "nesting" DROP COLUMN "x"`);
        await queryRunner.query(`ALTER TABLE "nesting_item" DROP COLUMN "y"`);
        await queryRunner.query(`ALTER TABLE "nesting_item" DROP COLUMN "x"`);
        await queryRunner.query(`ALTER TABLE "nesting_item" DROP COLUMN "processing_time_seconds"`);
        await queryRunner.query(`ALTER TABLE "nesting" ADD "notes" text`);
        await queryRunner.query(`ALTER TABLE "nesting" ADD "status" character varying(50) NOT NULL DEFAULT 'draft'`);
        await queryRunner.query(`ALTER TABLE "nesting" ADD "nesting_number" character varying(100) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "nesting" ADD CONSTRAINT "UQ_6861ee433e745c346c403925773" UNIQUE ("nesting_number")`);
        await queryRunner.query(`ALTER TABLE "nesting_item" ADD "order_item_id" integer NOT NULL`);
        await queryRunner.query(`ALTER TABLE "processing_work_order" ADD "vendor_id" integer`);
        await queryRunner.query(`ALTER TABLE "processing" ADD "notes" text`);
        await queryRunner.query(`ALTER TABLE "processing" ADD "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "processing" ADD "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "processing" ADD "is_active" boolean DEFAULT true`);
        await queryRunner.query(`CREATE INDEX "idx_pwo_vendor" ON "processing_work_order" ("vendor_id") `);
        await queryRunner.query(`CREATE INDEX "idx_pwo_processing" ON "processing_work_order" ("processing_id") `);
        await queryRunner.query(`CREATE INDEX "idx_processing_active" ON "processing" ("is_active") `);
        await queryRunner.query(`CREATE INDEX "idx_processing_vendor" ON "processing" ("vendor_id") `);
        await queryRunner.query(`ALTER TABLE "nesting_item" ADD CONSTRAINT "FK_3b4c0df5443d9a3f551b9dc4637" FOREIGN KEY ("order_item_id") REFERENCES "order_item"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "outsourcing_cost" ADD CONSTRAINT "fk_oc_processing_work_order" FOREIGN KEY ("processing_work_order_id") REFERENCES "processing_work_order"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "processing_work_order" ADD CONSTRAINT "fk_pwo_processing" FOREIGN KEY ("processing_id") REFERENCES "processing"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "processing_work_order" ADD CONSTRAINT "fk_pwo_vendor" FOREIGN KEY ("vendor_id") REFERENCES "vendor"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "processing" ADD CONSTRAINT "fk_processing_vendor" FOREIGN KEY ("vendor_id") REFERENCES "vendor"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

}
