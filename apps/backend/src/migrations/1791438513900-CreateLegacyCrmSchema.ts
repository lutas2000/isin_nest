import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 舊版銷管（isin_vb6）遷入的資料層：建立 legacy_crm schema 與全部表、
 * staff.legacy_crm_code（舊版員工編號）。規劃見 docs/LEGACY-CRM-REBUILD-PLAN.md 第 2 節。
 *
 * 由 migration:generate 對正式 DB 結構產生後，只保留 legacy_crm 相關語句；
 * TypeORM 不會自動建 schema，CREATE SCHEMA 為手動補上。
 */
export class CreateLegacyCrmSchema1791438513900 implements MigrationInterface {
  name = 'CreateLegacyCrmSchema1791438513900';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "legacy_crm"`);
    await queryRunner.query(
      `CREATE TABLE "legacy_crm"."write_log" ("id" BIGSERIAL NOT NULL, "occurred_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "user_id" integer, "staff_id" character varying(10), "entity_type" character varying(40) NOT NULL, "entity_key" character varying(60) NOT NULL, "action" character varying(10) NOT NULL, "before" jsonb, "after" jsonb, "side_effects" jsonb, "request_id" uuid, "client" jsonb, CONSTRAINT "CHK_9784079a6ba0d00a485e000fb6" CHECK ("action" IN ('create', 'update', 'delete', 'rename', 'import')), CONSTRAINT "PK_9c555673aba6b95c396dab52713" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_1571372a874dc064061d612f7b" ON "legacy_crm"."write_log" ("user_id", "occurred_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_da13184dc95bff40ab9c3eb545" ON "legacy_crm"."write_log" ("occurred_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3477feea411cb6a7ceb2eaf809" ON "legacy_crm"."write_log" ("entity_type", "entity_key", "occurred_at") `,
    );
    await queryRunner.query(
      `CREATE TABLE "legacy_crm"."work_documents" ("work_no" character varying(10) NOT NULL, "transfer_date" date, "transfer_date_raw" character varying(20), "customer_code" character varying(10) NOT NULL DEFAULT '', "customer_name" character varying(10) NOT NULL DEFAULT '', "actor_no" character varying(10) NOT NULL DEFAULT '', "actor_name" character varying(10) NOT NULL DEFAULT '', "order_no" character varying(10) NOT NULL DEFAULT '', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "CHK_60e468e8e2b3eaa534b9c9cf0a" CHECK ("work_no" <> ''), CONSTRAINT "PK_99a216454553a833522c9d203aa" PRIMARY KEY ("work_no"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3bebbfe3966a092294715f8abc" ON "legacy_crm"."work_documents" ("customer_code", "transfer_date") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ac2ae488e91fbd415071018930" ON "legacy_crm"."work_documents" ("transfer_date", "work_no") `,
    );
    await queryRunner.query(
      `CREATE TABLE "legacy_crm"."work_items" ("work_no" character varying(10) NOT NULL, "line_no" smallint NOT NULL, "drawing_no" character varying(10) NOT NULL DEFAULT '', "material" character varying(10) NOT NULL DEFAULT '', "thickness" character varying(6) NOT NULL DEFAULT '', "outsource" character varying(10) NOT NULL DEFAULT '', "order_quantity_units" bigint NOT NULL DEFAULT '0', "completed_quantity_units" bigint NOT NULL DEFAULT '0', "cnc_ok" character varying(10) NOT NULL DEFAULT '', "plating_work" character varying(20) NOT NULL DEFAULT '', "post_process" character varying(50) NOT NULL DEFAULT '', "order_no" character varying(10) NOT NULL DEFAULT '', CONSTRAINT "CHK_f3a4661b06f0f8e645b61542fb" CHECK ("line_no" BETWEEN 1 AND 99), CONSTRAINT "PK_09fa3a85e8ee9c98b2a83f63ea3" PRIMARY KEY ("work_no", "line_no"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9b9a573fd56f06a10a69b91e96" ON "legacy_crm"."work_items" ("drawing_no", "material", "thickness") `,
    );
    await queryRunner.query(
      `CREATE TABLE "legacy_crm"."sales_documents" ("sale_no" character varying(10) NOT NULL, "sale_date" date, "sale_date_raw" character varying(20), "legacy_date_e" date, "legacy_date_e_raw" character varying(20), "customer_code" character varying(10) NOT NULL DEFAULT '', "customer_name" character varying(10) NOT NULL DEFAULT '', "actor_no" character varying(10) NOT NULL DEFAULT '', "actor_name" character varying(10) NOT NULL DEFAULT '', "linked_order_no" character varying(10) NOT NULL DEFAULT '', "payment_method" character varying(10) NOT NULL DEFAULT '', "delivery_method" character varying(10) NOT NULL DEFAULT '', "invoice_number" character varying(30) NOT NULL DEFAULT '', "shipping_address" character varying(60) NOT NULL DEFAULT '', "note" character varying(50) NOT NULL DEFAULT '', "amount_units" bigint NOT NULL DEFAULT '0', "tax_mode" character varying(10) NOT NULL DEFAULT '', "tax_units" bigint NOT NULL DEFAULT '0', "discount_units" bigint NOT NULL DEFAULT '0', "total_units" bigint NOT NULL DEFAULT '0', "received_units" bigint NOT NULL DEFAULT '0', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "CHK_934cf62b6e5f65516c536d1a5e" CHECK ("sale_no" <> ''), CONSTRAINT "PK_a86aecaebf648d42c99edc22398" PRIMARY KEY ("sale_no"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_cc6520845a40e998b3c69c1772" ON "legacy_crm"."sales_documents" ("customer_code", "sale_date") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_d0a2777b6c977dee7d682376c1" ON "legacy_crm"."sales_documents" ("sale_date", "sale_no") `,
    );
    await queryRunner.query(
      `CREATE TABLE "legacy_crm"."sales_items" ("sale_no" character varying(10) NOT NULL, "line_no" smallint NOT NULL, "legacy_sn" character varying(2) NOT NULL DEFAULT '', "legacy_date_r" date, "legacy_date_r_raw" character varying(20), "legacy_factor_no" character varying(10) NOT NULL DEFAULT '', "legacy_factor" character varying(10) NOT NULL DEFAULT '', "drawing_no" character varying(10) NOT NULL DEFAULT '', "customer_model" character varying(40) NOT NULL DEFAULT '', "material" character varying(10) NOT NULL DEFAULT '', "thickness" character varying(6) NOT NULL DEFAULT '', "outsource" character varying(10) NOT NULL DEFAULT '', "quantity_units" bigint NOT NULL DEFAULT '0', "unit" character varying(4) NOT NULL DEFAULT '', "unit_price_units" bigint NOT NULL DEFAULT '0', "line_total_units" bigint NOT NULL DEFAULT '0', CONSTRAINT "UQ_c982f3099cb7d9e9c1c5d82c72f" UNIQUE ("sale_no", "legacy_sn"), CONSTRAINT "CHK_f2c47d78273bcbb45440a7577b" CHECK ("line_no" BETWEEN 1 AND 99), CONSTRAINT "PK_b70fe6e2bb3d8aef70c806276c9" PRIMARY KEY ("sale_no", "line_no"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_eaad24357316b88856ae9a6d77" ON "legacy_crm"."sales_items" ("drawing_no", "customer_model") `,
    );
    await queryRunner.query(
      `CREATE TABLE "legacy_crm"."receipt_documents" ("receipt_no" character varying(10) NOT NULL, "receipt_date" date, "receipt_date_raw" character varying(20), "closing_date" date, "closing_date_raw" character varying(20), "customer_code" character varying(10) NOT NULL DEFAULT '', "customer_name" character varying(10) NOT NULL DEFAULT '', "actor_no" character varying(10) NOT NULL DEFAULT '', "actor_name" character varying(10) NOT NULL DEFAULT '', "current_received_units" bigint NOT NULL DEFAULT '0', "current_merchandise_units" bigint NOT NULL DEFAULT '0', "current_tax_units" bigint NOT NULL DEFAULT '0', "current_discount_units" bigint NOT NULL DEFAULT '0', "previous_advance_units" bigint NOT NULL DEFAULT '0', "previous_unpaid_units" bigint NOT NULL DEFAULT '0', "current_advance_units" bigint NOT NULL DEFAULT '0', "current_unpaid_units" bigint NOT NULL DEFAULT '0', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "CHK_20b895152344794e0b6d490840" CHECK ("receipt_no" <> ''), CONSTRAINT "PK_d6c71e97b8fda8c390ba553007f" PRIMARY KEY ("receipt_no"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e753da4786b1a6db49cab4ac2d" ON "legacy_crm"."receipt_documents" ("customer_code", "receipt_date") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_73bb5ca9320ee62987b016a173" ON "legacy_crm"."receipt_documents" ("receipt_date", "receipt_no") `,
    );
    await queryRunner.query(
      `CREATE TABLE "legacy_crm"."receipt_payment_lines" ("receipt_no" character varying(10) NOT NULL, "line_no" smallint NOT NULL, "category" character varying(10) NOT NULL DEFAULT '', "amount_units" bigint NOT NULL DEFAULT '0', "check_number" character varying(30) NOT NULL DEFAULT '', "check_date" date, "check_date_raw" character varying(20), "bank_account" character varying(30) NOT NULL DEFAULT '', "collect_agent" character varying(20) NOT NULL DEFAULT '', "bank_short_name" character varying(20) NOT NULL DEFAULT '', "note" character varying(40) NOT NULL DEFAULT '', CONSTRAINT "CHK_832ac43e0928c2cea86f5bd050" CHECK ("line_no" BETWEEN 1 AND 99), CONSTRAINT "PK_6741491741bb16bbf40e8b65e4a" PRIMARY KEY ("receipt_no", "line_no"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "legacy_crm"."receipt_allocation_lines" ("receipt_no" character varying(10) NOT NULL, "line_no" smallint NOT NULL, "sale_no" character varying(10) NOT NULL DEFAULT '', "merchandise_units" bigint NOT NULL DEFAULT '0', "tax_units" bigint NOT NULL DEFAULT '0', "discount_units" bigint NOT NULL DEFAULT '0', "receivable_units" bigint NOT NULL DEFAULT '0', "unpaid_units" bigint NOT NULL DEFAULT '0', "offset_units" bigint NOT NULL DEFAULT '0', "previously_offset_units" bigint NOT NULL DEFAULT '0', CONSTRAINT "CHK_adaedeb90101c9899c2c0eca61" CHECK ("line_no" BETWEEN 1 AND 999), CONSTRAINT "PK_d05c5e2c207c08f5601974ce647" PRIMARY KEY ("receipt_no", "line_no"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8c825210311666e28b231bbd98" ON "legacy_crm"."receipt_allocation_lines" ("sale_no") `,
    );
    await queryRunner.query(
      `CREATE TABLE "legacy_crm"."quote_documents" ("quote_no" character varying(10) NOT NULL, "quote_date" date, "quote_date_raw" character varying(20), "customer_code" character varying(10) NOT NULL DEFAULT '', "customer_name" character varying(10) NOT NULL DEFAULT '', "actor_no" character varying(10) NOT NULL DEFAULT '', "actor_name" character varying(10) NOT NULL DEFAULT '', "attention" character varying(40) NOT NULL DEFAULT '', "legacy_xx" character varying(1) NOT NULL DEFAULT '', "total_units" bigint NOT NULL DEFAULT '0', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "CHK_02ddd39c2620421ed20d25a77c" CHECK ("quote_no" <> ''), CONSTRAINT "PK_3875f1210f567abe30c93c7fed1" PRIMARY KEY ("quote_no"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_58d9e4cf73fcde5a19cd68ff8b" ON "legacy_crm"."quote_documents" ("customer_code", "quote_date") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_67021c4c99469a12c394bf5135" ON "legacy_crm"."quote_documents" ("quote_date", "quote_no") `,
    );
    await queryRunner.query(
      `CREATE TABLE "legacy_crm"."quote_items" ("quote_no" character varying(10) NOT NULL, "line_no" smallint NOT NULL, "customer_model" character varying(40) NOT NULL DEFAULT '', "material" character varying(10) NOT NULL DEFAULT '', "thickness" character varying(6) NOT NULL DEFAULT '', "summary" character varying(250) NOT NULL DEFAULT '', "quantity_units" bigint NOT NULL DEFAULT '0', "unit_price_units" bigint NOT NULL DEFAULT '0', "line_total_units" bigint NOT NULL DEFAULT '0', CONSTRAINT "CHK_95f77d5e0e94aec6e8bc7544ce" CHECK ("line_no" BETWEEN 1 AND 99), CONSTRAINT "PK_e14c04449bdb2587cbac39d0c9a" PRIMARY KEY ("quote_no", "line_no"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "legacy_crm"."quote_note_lines" ("quote_no" character varying(10) NOT NULL, "line_no" smallint NOT NULL, "note" character varying(250) NOT NULL DEFAULT '', CONSTRAINT "CHK_4a0294a919a3949179f3e50696" CHECK ("line_no" BETWEEN 1 AND 99), CONSTRAINT "PK_6880535c655fe4d32c5d5807945" PRIMARY KEY ("quote_no", "line_no"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "legacy_crm"."print_log" ("id" BIGSERIAL NOT NULL, "occurred_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "user_id" integer, "staff_id" character varying(10), "request_id" uuid, "client" jsonb, "kind" character varying(20) NOT NULL, "target" character varying(40) NOT NULL, "entity_key" character varying(60), "criteria" jsonb, "row_count" integer, "page_count" integer, CONSTRAINT "CHK_eea6bb46a39be8277b0e7682cf" CHECK ("kind" IN ('document_preview', 'document_print', 'report_query', 'report_print', 'statement_print')), CONSTRAINT "PK_fda037c70b9b7b6c16ee085ed25" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b42fa823669e0a95a78e3b41dd" ON "legacy_crm"."print_log" ("user_id", "occurred_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3c98cb3db4bb682ef41af9f081" ON "legacy_crm"."print_log" ("kind", "target", "occurred_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8128e7ec804b4a47e6da70aca1" ON "legacy_crm"."print_log" ("occurred_at") `,
    );
    await queryRunner.query(
      `CREATE TABLE "legacy_crm"."postal_codes" ("postal_code" character varying(10) NOT NULL, "region_name" character varying(100) NOT NULL DEFAULT '', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "CHK_a622930a42e33eb6456a5588e6" CHECK ("postal_code" <> ''), CONSTRAINT "PK_5e91e7e6cd5261bd8e3f5e56678" PRIMARY KEY ("postal_code"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "legacy_crm"."phrases" ("phrase_no" character varying(10) NOT NULL, "content" character varying(250) NOT NULL DEFAULT '', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "CHK_c8038f9c5a2f3ff4bfb95c1d40" CHECK ("phrase_no" <> ''), CONSTRAINT "PK_df9403a6d833032a2e08a656540" PRIMARY KEY ("phrase_no"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "legacy_crm"."partners" ("kind" character varying(8) NOT NULL, "code" character varying(10) NOT NULL, "full_name" character varying(100) NOT NULL DEFAULT '', "short_name" character varying(50) NOT NULL DEFAULT '', "responsible" character varying(50) NOT NULL DEFAULT '', "phone1" character varying(40) NOT NULL DEFAULT '', "phone2" character varying(40) NOT NULL DEFAULT '', "fax" character varying(40) NOT NULL DEFAULT '', "tax_id" character varying(30) NOT NULL DEFAULT '', "postal_code" character varying(20) NOT NULL DEFAULT '', "address" character varying(250) NOT NULL DEFAULT '', "shipping_address" character varying(250) NOT NULL DEFAULT '', "invoice_title" character varying(100) NOT NULL DEFAULT '', "invoice_tax_id" character varying(30) NOT NULL DEFAULT '', "bank_name" character varying(100) NOT NULL DEFAULT '', "bank_account" character varying(100) NOT NULL DEFAULT '', "contact1" character varying(50) NOT NULL DEFAULT '', "contact2" character varying(50) NOT NULL DEFAULT '', "contact3" character varying(50) NOT NULL DEFAULT '', "start_date" date, "start_date_raw" character varying(20), "latest_transaction_date" date, "latest_transaction_date_raw" character varying(20), "credit_limit_units" bigint NOT NULL DEFAULT '0', "balance_units" bigint NOT NULL DEFAULT '0', "email" character varying(150) NOT NULL DEFAULT '', "dxf_path" character varying(250) NOT NULL DEFAULT '', "main_product" character varying(100) NOT NULL DEFAULT '', "notes" character varying(2000) NOT NULL DEFAULT '', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "CHK_51fa95b4f6adf0cbf0c7549ba2" CHECK ("code" <> ''), CONSTRAINT "CHK_7b3c282b38b70efafa10039e10" CHECK ("kind" IN ('customer', 'supplier')), CONSTRAINT "PK_e92586ebcb54a56628bceac629a" PRIMARY KEY ("kind", "code"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_0acd4d7d2d3e6d2c4f5a1d3581" ON "legacy_crm"."partners" ("kind", "full_name") `,
    );
    await queryRunner.query(
      `CREATE TABLE "legacy_crm"."parts" ("drawing_no" character varying(10) NOT NULL, "drawing_name" character varying(30) NOT NULL DEFAULT '', "drawing_ref" character varying(40) NOT NULL DEFAULT '', "customer_code" character varying(10) NOT NULL DEFAULT '', "customer_model" character varying(40) NOT NULL DEFAULT '', "material" character varying(10) NOT NULL DEFAULT '', "thickness" character varying(4) NOT NULL DEFAULT '', "unit" character varying(2) NOT NULL DEFAULT '', "price_ref_units" bigint NOT NULL DEFAULT '0', "price1_units" bigint NOT NULL DEFAULT '0', "price2_units" bigint NOT NULL DEFAULT '0', "price3_units" bigint NOT NULL DEFAULT '0', "price4_units" bigint NOT NULL DEFAULT '0', "price5_units" bigint NOT NULL DEFAULT '0', "actor_no" character varying(6) NOT NULL DEFAULT '', "actor" character varying(8) NOT NULL DEFAULT '', "drawing_date" date, "drawing_date_raw" character varying(20), "directory_path" character varying(50) NOT NULL DEFAULT '', "cnc1" character varying(30) NOT NULL DEFAULT '', "cnc2" character varying(30) NOT NULL DEFAULT '', "cnc3" character varying(12) NOT NULL DEFAULT '', "cnc4" character varying(12) NOT NULL DEFAULT '', "cnc5" character varying(50) NOT NULL DEFAULT '', "notes" character varying(50) NOT NULL DEFAULT '', "yy" character varying(1) NOT NULL DEFAULT '', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "CHK_4a33ba053fb72166cdd622dcc5" CHECK ("drawing_no" <> ''), CONSTRAINT "PK_341099f65ecc6b980d99b40141c" PRIMARY KEY ("drawing_no"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "legacy_crm"."order_documents" ("order_no" character varying(10) NOT NULL, "order_date" date, "order_date_raw" character varying(20), "delivery_date" date, "delivery_date_raw" character varying(20), "customer_code" character varying(10) NOT NULL DEFAULT '', "customer_name" character varying(10) NOT NULL DEFAULT '', "actor_no" character varying(10) NOT NULL DEFAULT '', "actor_name" character varying(10) NOT NULL DEFAULT '', "payment_method" character varying(10) NOT NULL DEFAULT '', "delivery_method" character varying(10) NOT NULL DEFAULT '', "note" character varying(20) NOT NULL DEFAULT '', "note2" character varying(10) NOT NULL DEFAULT '', "closed" character varying(2) NOT NULL DEFAULT '', "legacy_xx" character varying(1) NOT NULL DEFAULT '', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "CHK_d5dd925e656bb0553bf758546d" CHECK ("order_no" <> ''), CONSTRAINT "PK_c0444dff4c5a44bb930f470512f" PRIMARY KEY ("order_no"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_af37c4f929aced1c73066279a9" ON "legacy_crm"."order_documents" ("customer_code", "order_date") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ae4ab1ac11fd6eafced14bbe95" ON "legacy_crm"."order_documents" ("order_date", "order_no") `,
    );
    await queryRunner.query(
      `CREATE TABLE "legacy_crm"."order_items" ("order_no" character varying(10) NOT NULL, "line_no" smallint NOT NULL, "legacy_sn" character varying(2) NOT NULL DEFAULT '', "legacy_date_r" date, "legacy_date_r_raw" character varying(20), "legacy_date_e" date, "legacy_date_e_raw" character varying(20), "legacy_factor_no" character varying(10) NOT NULL DEFAULT '', "legacy_factor" character varying(10) NOT NULL DEFAULT '', "legacy_d_dwgok" character varying(10) NOT NULL DEFAULT '', "drawing_no" character varying(10) NOT NULL DEFAULT '', "customer_model" character varying(40) NOT NULL DEFAULT '', "material" character varying(10) NOT NULL DEFAULT '', "thickness" character varying(4) NOT NULL DEFAULT '', "outsource" character varying(10) NOT NULL DEFAULT '', "source" character varying(4) NOT NULL DEFAULT '', "post_process" character varying(50) NOT NULL DEFAULT '', "quantity_units" bigint NOT NULL DEFAULT '0', "unit" character varying(4) NOT NULL DEFAULT '', "shipped_quantity_units" bigint NOT NULL DEFAULT '0', CONSTRAINT "UQ_9bfda9d7f0f5ae5a07061110940" UNIQUE ("order_no", "legacy_sn"), CONSTRAINT "CHK_742a4397b0f0ee9d6b351eab97" CHECK ("line_no" BETWEEN 1 AND 99), CONSTRAINT "PK_dc2b0e8a7752af208b4cd10e2de" PRIMARY KEY ("order_no", "line_no"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_5f3f82c445bddca63df0127faa" ON "legacy_crm"."order_items" ("drawing_no", "customer_model") `,
    );
    await queryRunner.query(
      `CREATE TABLE "legacy_crm"."materials" ("id" SERIAL NOT NULL, "material" character varying(50) NOT NULL DEFAULT '', "thickness" character varying(30) NOT NULL DEFAULT '', "product_name" character varying(100) NOT NULL DEFAULT '', "category" character varying(50) NOT NULL DEFAULT '', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_2fd1a93ecb222a28bef28663fa0" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2b5d4ad4a9a9a9d75fe6b05776" ON "legacy_crm"."materials" ("material", "thickness") `,
    );
    await queryRunner.query(
      `CREATE TABLE "legacy_crm"."drawing_groups" ("group_no" character varying(10) NOT NULL, "created_date" date, "created_date_raw" character varying(20), "customer_code" character varying(10) NOT NULL DEFAULT '', "customer_name" character varying(10) NOT NULL DEFAULT '', "customer_drawing_no" character varying(40) NOT NULL DEFAULT '', "notes" character varying(20) NOT NULL DEFAULT '', "legacy_xx" character varying(1) NOT NULL DEFAULT '', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "CHK_779912b07ba6231fe21662ec63" CHECK ("group_no" <> ''), CONSTRAINT "PK_1f907390ed6768021204cefc605" PRIMARY KEY ("group_no"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "legacy_crm"."drawing_group_items" ("group_no" character varying(10) NOT NULL, "line_no" smallint NOT NULL, "customer_code" character varying(10) NOT NULL DEFAULT '', "drawing_no" character varying(10) NOT NULL DEFAULT '', "customer_drawing_no" character varying(40) NOT NULL DEFAULT '', "material" character varying(10) NOT NULL DEFAULT '', "thickness" character varying(6) NOT NULL DEFAULT '', "quantity_units" bigint NOT NULL DEFAULT '0', "is_laser" character varying(2) NOT NULL DEFAULT '', CONSTRAINT "CHK_c866f98d55bda74158a090dd70" CHECK ("line_no" BETWEEN 1 AND 99), CONSTRAINT "PK_3e56364dfb96360c6ad370c2132" PRIMARY KEY ("group_no", "line_no"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_bbcffd79d1dcd4f9800323a060" ON "legacy_crm"."drawing_group_items" ("drawing_no", "customer_drawing_no") `,
    );
    await queryRunner.query(
      `CREATE TABLE "legacy_crm"."banks" ("code" character varying(10) NOT NULL, "short_name" character varying(10) NOT NULL DEFAULT '', "full_name" character varying(30) NOT NULL DEFAULT '', "contact" character varying(20) NOT NULL DEFAULT '', "phone1" character varying(20) NOT NULL DEFAULT '', "phone2" character varying(20) NOT NULL DEFAULT '', "address" character varying(60) NOT NULL DEFAULT '', "legacy_bono" character varying(30) NOT NULL DEFAULT '', "legacy_boname" character varying(20) NOT NULL DEFAULT '', "account_no" character varying(8) NOT NULL DEFAULT '', "account_name" character varying(30) NOT NULL DEFAULT '', "balance_units" bigint NOT NULL DEFAULT '0', "notes" character varying(40) NOT NULL DEFAULT '', "check_layout" jsonb NOT NULL DEFAULT '{}', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "CHK_ba360bd7210f9855cd48d41631" CHECK ("code" <> ''), CONSTRAINT "PK_337dd3f2308d7c154612e14196a" PRIMARY KEY ("code"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_99c9a25d85d46f2ad631401704" ON "legacy_crm"."banks" ("full_name", "code") `,
    );
    await queryRunner.query(
      `ALTER TABLE "staff" ADD "legacy_crm_code" character varying(10)`,
    );
    await queryRunner.query(
      `ALTER TABLE "staff" ADD CONSTRAINT "UQ_b988309489c03ebdaab9a7467cc" UNIQUE ("legacy_crm_code")`,
    );
    await queryRunner.query(
      `ALTER TABLE "legacy_crm"."work_items" ADD CONSTRAINT "FK_7b3b53dbcdf895c839dd1e7162a" FOREIGN KEY ("work_no") REFERENCES "legacy_crm"."work_documents"("work_no") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "legacy_crm"."sales_items" ADD CONSTRAINT "FK_f2c594f98524f75cb538e96ca81" FOREIGN KEY ("sale_no") REFERENCES "legacy_crm"."sales_documents"("sale_no") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "legacy_crm"."receipt_payment_lines" ADD CONSTRAINT "FK_1b1d6bcce5e16ff6b27d0d4fc8b" FOREIGN KEY ("receipt_no") REFERENCES "legacy_crm"."receipt_documents"("receipt_no") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "legacy_crm"."receipt_allocation_lines" ADD CONSTRAINT "FK_e712a643f5459a03212abdc1530" FOREIGN KEY ("receipt_no") REFERENCES "legacy_crm"."receipt_documents"("receipt_no") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "legacy_crm"."quote_items" ADD CONSTRAINT "FK_0aa816327cc0bb74c09d375fa2f" FOREIGN KEY ("quote_no") REFERENCES "legacy_crm"."quote_documents"("quote_no") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "legacy_crm"."quote_note_lines" ADD CONSTRAINT "FK_7a50fcfcceed865cbffea522316" FOREIGN KEY ("quote_no") REFERENCES "legacy_crm"."quote_documents"("quote_no") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "legacy_crm"."order_items" ADD CONSTRAINT "FK_da2e379697d4e6db48f4761f304" FOREIGN KEY ("order_no") REFERENCES "legacy_crm"."order_documents"("order_no") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "legacy_crm"."drawing_group_items" ADD CONSTRAINT "FK_5e40b0a63634623cdb29fad0ea7" FOREIGN KEY ("group_no") REFERENCES "legacy_crm"."drawing_groups"("group_no") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "legacy_crm"."drawing_group_items" DROP CONSTRAINT "FK_5e40b0a63634623cdb29fad0ea7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "legacy_crm"."order_items" DROP CONSTRAINT "FK_da2e379697d4e6db48f4761f304"`,
    );
    await queryRunner.query(
      `ALTER TABLE "legacy_crm"."quote_note_lines" DROP CONSTRAINT "FK_7a50fcfcceed865cbffea522316"`,
    );
    await queryRunner.query(
      `ALTER TABLE "legacy_crm"."quote_items" DROP CONSTRAINT "FK_0aa816327cc0bb74c09d375fa2f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "legacy_crm"."receipt_allocation_lines" DROP CONSTRAINT "FK_e712a643f5459a03212abdc1530"`,
    );
    await queryRunner.query(
      `ALTER TABLE "legacy_crm"."receipt_payment_lines" DROP CONSTRAINT "FK_1b1d6bcce5e16ff6b27d0d4fc8b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "legacy_crm"."sales_items" DROP CONSTRAINT "FK_f2c594f98524f75cb538e96ca81"`,
    );
    await queryRunner.query(
      `ALTER TABLE "legacy_crm"."work_items" DROP CONSTRAINT "FK_7b3b53dbcdf895c839dd1e7162a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "staff" DROP COLUMN "legacy_crm_code"`,
    );
    await queryRunner.query(
      `DROP INDEX "legacy_crm"."IDX_99c9a25d85d46f2ad631401704"`,
    );
    await queryRunner.query(`DROP TABLE "legacy_crm"."banks"`);
    await queryRunner.query(
      `DROP INDEX "legacy_crm"."IDX_bbcffd79d1dcd4f9800323a060"`,
    );
    await queryRunner.query(`DROP TABLE "legacy_crm"."drawing_group_items"`);
    await queryRunner.query(`DROP TABLE "legacy_crm"."drawing_groups"`);
    await queryRunner.query(
      `DROP INDEX "legacy_crm"."IDX_2b5d4ad4a9a9a9d75fe6b05776"`,
    );
    await queryRunner.query(`DROP TABLE "legacy_crm"."materials"`);
    await queryRunner.query(
      `DROP INDEX "legacy_crm"."IDX_5f3f82c445bddca63df0127faa"`,
    );
    await queryRunner.query(`DROP TABLE "legacy_crm"."order_items"`);
    await queryRunner.query(
      `DROP INDEX "legacy_crm"."IDX_ae4ab1ac11fd6eafced14bbe95"`,
    );
    await queryRunner.query(
      `DROP INDEX "legacy_crm"."IDX_af37c4f929aced1c73066279a9"`,
    );
    await queryRunner.query(`DROP TABLE "legacy_crm"."order_documents"`);
    await queryRunner.query(`DROP TABLE "legacy_crm"."parts"`);
    await queryRunner.query(
      `DROP INDEX "legacy_crm"."IDX_0acd4d7d2d3e6d2c4f5a1d3581"`,
    );
    await queryRunner.query(`DROP TABLE "legacy_crm"."partners"`);
    await queryRunner.query(`DROP TABLE "legacy_crm"."phrases"`);
    await queryRunner.query(`DROP TABLE "legacy_crm"."postal_codes"`);
    await queryRunner.query(
      `DROP INDEX "legacy_crm"."IDX_8128e7ec804b4a47e6da70aca1"`,
    );
    await queryRunner.query(
      `DROP INDEX "legacy_crm"."IDX_3c98cb3db4bb682ef41af9f081"`,
    );
    await queryRunner.query(
      `DROP INDEX "legacy_crm"."IDX_b42fa823669e0a95a78e3b41dd"`,
    );
    await queryRunner.query(`DROP TABLE "legacy_crm"."print_log"`);
    await queryRunner.query(`DROP TABLE "legacy_crm"."quote_note_lines"`);
    await queryRunner.query(`DROP TABLE "legacy_crm"."quote_items"`);
    await queryRunner.query(
      `DROP INDEX "legacy_crm"."IDX_67021c4c99469a12c394bf5135"`,
    );
    await queryRunner.query(
      `DROP INDEX "legacy_crm"."IDX_58d9e4cf73fcde5a19cd68ff8b"`,
    );
    await queryRunner.query(`DROP TABLE "legacy_crm"."quote_documents"`);
    await queryRunner.query(
      `DROP INDEX "legacy_crm"."IDX_8c825210311666e28b231bbd98"`,
    );
    await queryRunner.query(
      `DROP TABLE "legacy_crm"."receipt_allocation_lines"`,
    );
    await queryRunner.query(`DROP TABLE "legacy_crm"."receipt_payment_lines"`);
    await queryRunner.query(
      `DROP INDEX "legacy_crm"."IDX_73bb5ca9320ee62987b016a173"`,
    );
    await queryRunner.query(
      `DROP INDEX "legacy_crm"."IDX_e753da4786b1a6db49cab4ac2d"`,
    );
    await queryRunner.query(`DROP TABLE "legacy_crm"."receipt_documents"`);
    await queryRunner.query(
      `DROP INDEX "legacy_crm"."IDX_eaad24357316b88856ae9a6d77"`,
    );
    await queryRunner.query(`DROP TABLE "legacy_crm"."sales_items"`);
    await queryRunner.query(
      `DROP INDEX "legacy_crm"."IDX_d0a2777b6c977dee7d682376c1"`,
    );
    await queryRunner.query(
      `DROP INDEX "legacy_crm"."IDX_cc6520845a40e998b3c69c1772"`,
    );
    await queryRunner.query(`DROP TABLE "legacy_crm"."sales_documents"`);
    await queryRunner.query(
      `DROP INDEX "legacy_crm"."IDX_9b9a573fd56f06a10a69b91e96"`,
    );
    await queryRunner.query(`DROP TABLE "legacy_crm"."work_items"`);
    await queryRunner.query(
      `DROP INDEX "legacy_crm"."IDX_ac2ae488e91fbd415071018930"`,
    );
    await queryRunner.query(
      `DROP INDEX "legacy_crm"."IDX_3bebbfe3966a092294715f8abc"`,
    );
    await queryRunner.query(`DROP TABLE "legacy_crm"."work_documents"`);
    await queryRunner.query(
      `DROP INDEX "legacy_crm"."IDX_3477feea411cb6a7ceb2eaf809"`,
    );
    await queryRunner.query(
      `DROP INDEX "legacy_crm"."IDX_da13184dc95bff40ab9c3eb545"`,
    );
    await queryRunner.query(
      `DROP INDEX "legacy_crm"."IDX_1571372a874dc064061d612f7b"`,
    );
    await queryRunner.query(`DROP TABLE "legacy_crm"."write_log"`);
    // 只在 schema 已清空時才刪；裡面若有其他物件會失敗而不是一併刪除。
    await queryRunner.query(`DROP SCHEMA "legacy_crm"`);
  }
}
