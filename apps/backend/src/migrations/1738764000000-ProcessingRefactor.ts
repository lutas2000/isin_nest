import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProcessingRefactor1738764000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ============================================================
    // 步驟 1: 備份舊 processing 表資料（如果存在）
    // ============================================================
    const oldProcessingExists = await queryRunner.hasTable('processing');
    let hasOldData = false;
    
    if (oldProcessingExists) {
      const count = await queryRunner.query(`SELECT COUNT(*) FROM processing`);
      hasOldData = parseInt(count[0].count) > 0;
      
      if (hasOldData) {
        // 備份舊資料到臨時表
        await queryRunner.query(`
          CREATE TABLE processing_backup AS 
          SELECT * FROM processing
        `);
      }
      
      // 刪除舊表
      await queryRunner.query(`DROP TABLE IF EXISTS processing CASCADE`);
    }

    // ============================================================
    // 步驟 2: 建立新的 processing 主檔表
    // ============================================================
    await queryRunner.query(`
      CREATE TABLE processing (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        vendor_id INT,
        notes TEXT,
        display_order INT DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT fk_processing_vendor FOREIGN KEY (vendor_id) REFERENCES vendor(id) ON DELETE SET NULL
      )
    `);

    // 建立索引
    await queryRunner.query(`CREATE INDEX idx_processing_vendor ON processing(vendor_id)`);
    await queryRunner.query(`CREATE INDEX idx_processing_active ON processing(is_active)`);

    // ============================================================
    // 步驟 3: 插入預設加工類型（如果表是空的）
    // ============================================================
    await queryRunner.query(`
      INSERT INTO processing (name, display_order, is_active) VALUES
        ('雷射切割', 0, true),
        ('折彎', 1, true),
        ('焊接', 2, true),
        ('研磨', 3, true),
        ('烤漆', 4, true),
        ('電鍍', 5, true),
        ('攻牙', 6, true),
        ('鑽孔', 7, true),
        ('組裝', 8, true),
        ('其他', 99, true)
    `);

    // ============================================================
    // 步驟 4: 更新 quote_item 表
    // ============================================================
    const quoteItemHasProcessing = await queryRunner.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'quote_item' AND column_name = 'processing'
    `);

    if (quoteItemHasProcessing.length > 0) {
      // 添加新欄位
      await queryRunner.query(`
        ALTER TABLE quote_item 
        ADD COLUMN IF NOT EXISTS processing_ids JSONB
      `);

      // 刪除舊欄位
      await queryRunner.query(`
        ALTER TABLE quote_item 
        DROP COLUMN IF EXISTS processing
      `);
    } else {
      // 確保新欄位存在
      await queryRunner.query(`
        ALTER TABLE quote_item 
        ADD COLUMN IF NOT EXISTS processing_ids JSONB
      `);
    }

    // ============================================================
    // 步驟 5: 更新 order_item 表
    // ============================================================
    const orderItemHasProcessing = await queryRunner.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'order_item' AND column_name = 'processing'
    `);

    if (orderItemHasProcessing.length > 0) {
      // 添加新欄位
      await queryRunner.query(`
        ALTER TABLE order_item 
        ADD COLUMN IF NOT EXISTS processing_ids JSONB
      `);

      // 刪除舊欄位
      await queryRunner.query(`
        ALTER TABLE order_item 
        DROP COLUMN IF EXISTS processing
      `);
    } else {
      // 確保新欄位存在
      await queryRunner.query(`
        ALTER TABLE order_item 
        ADD COLUMN IF NOT EXISTS processing_ids JSONB
      `);
    }

    // ============================================================
    // 步驟 6: 更新 quote 表
    // ============================================================
    const quoteHasPostProcessing = await queryRunner.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'quote' AND column_name = 'post_processing'
    `);

    if (quoteHasPostProcessing.length > 0) {
      // 添加新欄位
      await queryRunner.query(`
        ALTER TABLE quote 
        ADD COLUMN IF NOT EXISTS processing_ids JSONB
      `);

      // 刪除舊欄位
      await queryRunner.query(`
        ALTER TABLE quote 
        DROP COLUMN IF EXISTS post_processing
      `);
    } else {
      // 確保新欄位存在
      await queryRunner.query(`
        ALTER TABLE quote 
        ADD COLUMN IF NOT EXISTS processing_ids JSONB
      `);
    }

    // ============================================================
    // 步驟 7: 更新 processing_work_order 表
    // ============================================================
    const processingWorkOrderExists = await queryRunner.hasTable('processing_work_order');
    
    if (processingWorkOrderExists) {
      // 添加新欄位
      await queryRunner.query(`
        ALTER TABLE processing_work_order 
        ADD COLUMN IF NOT EXISTS processing_id INT,
        ADD COLUMN IF NOT EXISTS vendor_id INT,
        ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS returned_at TIMESTAMPTZ
      `);

      // 添加外鍵約束（PostgreSQL 不支援 ADD CONSTRAINT IF NOT EXISTS，改用 DO $$ 檢查）
      await queryRunner.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = 'fk_pwo_processing'
          ) THEN
            ALTER TABLE processing_work_order
            ADD CONSTRAINT fk_pwo_processing
            FOREIGN KEY (processing_id) REFERENCES processing(id) ON DELETE SET NULL;
          END IF;
        END$$;
      `);

      await queryRunner.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = 'fk_pwo_vendor'
          ) THEN
            ALTER TABLE processing_work_order
            ADD CONSTRAINT fk_pwo_vendor
            FOREIGN KEY (vendor_id) REFERENCES vendor(id) ON DELETE SET NULL;
          END IF;
        END$$;
      `);

      // 嘗試從 processing_type 映射到 processing_id
      await queryRunner.query(`
        UPDATE processing_work_order pwo
        SET processing_id = (
          SELECT p.id FROM processing p 
          WHERE p.name = pwo.processing_type 
          LIMIT 1
        )
        WHERE pwo.processing_id IS NULL 
        AND pwo.processing_type IS NOT NULL
      `).catch(() => {
        // 可能沒有 processing_type 欄位
      });

      // 刪除舊欄位（如果存在）
      await queryRunner.query(`
        ALTER TABLE processing_work_order 
        DROP COLUMN IF EXISTS processing_type
      `);

      // 建立索引
      await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_pwo_processing ON processing_work_order(processing_id)`);
      await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_pwo_vendor ON processing_work_order(vendor_id)`);
    }

    // ============================================================
    // 步驟 8: 更新 outsourcing_cost 表
    // ============================================================
    const outsourcingCostExists = await queryRunner.hasTable('outsourcing_cost');
    
    if (outsourcingCostExists) {
      const hasOldColumn = await queryRunner.query(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'outsourcing_cost' AND column_name = 'outsourcing_work_order_id'
      `);

      if (hasOldColumn.length > 0) {
        // 添加新欄位
        await queryRunner.query(`
          ALTER TABLE outsourcing_cost 
          ADD COLUMN IF NOT EXISTS processing_work_order_id INT
        `);

        // 遷移資料（嘗試，可能沒有對應）
        await queryRunner.query(`
          UPDATE outsourcing_cost 
          SET processing_work_order_id = outsourcing_work_order_id
          WHERE processing_work_order_id IS NULL
        `).catch(() => {});

        // 刪除舊欄位和約束
        await queryRunner.query(`
          ALTER TABLE outsourcing_cost 
          DROP CONSTRAINT IF EXISTS outsourcing_cost_outsourcing_work_order_id_fkey
        `);
        
        await queryRunner.query(`
          ALTER TABLE outsourcing_cost 
          DROP COLUMN IF EXISTS outsourcing_work_order_id
        `);

        // 添加新的外鍵約束
        await queryRunner.query(`
          ALTER TABLE outsourcing_cost 
          ADD CONSTRAINT fk_oc_processing_work_order 
          FOREIGN KEY (processing_work_order_id) REFERENCES processing_work_order(id) ON DELETE CASCADE
        `).catch(() => {});
      }
    }

    // ============================================================
    // 步驟 9: 刪除 outsourcing_work_order 表
    // ============================================================
    await queryRunner.query(`DROP TABLE IF EXISTS outsourcing_work_order CASCADE`);

    // ============================================================
    // 步驟 10: 清理備份表
    // ============================================================
    await queryRunner.query(`DROP TABLE IF EXISTS processing_backup`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 警告：回滾會導致資料遺失
    console.warn('警告：回滾此遷移會導致部分資料遺失');

    // 恢復 quote_item.processing
    await queryRunner.query(`
      ALTER TABLE quote_item 
      ADD COLUMN IF NOT EXISTS processing VARCHAR(500),
      DROP COLUMN IF EXISTS processing_ids
    `);

    // 恢復 order_item.processing
    await queryRunner.query(`
      ALTER TABLE order_item 
      ADD COLUMN IF NOT EXISTS processing VARCHAR(500),
      DROP COLUMN IF EXISTS processing_ids
    `);

    // 恢復 quote.post_processing
    await queryRunner.query(`
      ALTER TABLE quote 
      ADD COLUMN IF NOT EXISTS post_processing TEXT[],
      DROP COLUMN IF EXISTS processing_ids
    `);

    // 恢復 processing_work_order.processing_type
    await queryRunner.query(`
      ALTER TABLE processing_work_order 
      ADD COLUMN IF NOT EXISTS processing_type VARCHAR(100),
      DROP COLUMN IF EXISTS processing_id,
      DROP COLUMN IF EXISTS vendor_id,
      DROP COLUMN IF EXISTS shipped_at,
      DROP COLUMN IF EXISTS returned_at
    `);

    // 恢復 outsourcing_cost.outsourcing_work_order_id
    await queryRunner.query(`
      ALTER TABLE outsourcing_cost 
      ADD COLUMN IF NOT EXISTS outsourcing_work_order_id INT,
      DROP COLUMN IF EXISTS processing_work_order_id
    `);

    // 重建 outsourcing_work_order 表（空表）
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS outsourcing_work_order (
        id SERIAL PRIMARY KEY,
        order_id VARCHAR(50) NOT NULL,
        order_item_id INT NOT NULL,
        vendor_id INT NOT NULL,
        processing_type VARCHAR(100) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        shipped_at TIMESTAMPTZ,
        returned_at TIMESTAMPTZ,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // 刪除新的 processing 表，恢復舊結構
    await queryRunner.query(`DROP TABLE IF EXISTS processing CASCADE`);
    
    // 重建舊的 processing 表結構
    await queryRunner.query(`
      CREATE TABLE processing (
        id SERIAL PRIMARY KEY,
        work_order_item_id INT NOT NULL,
        processing_code VARCHAR(50) NOT NULL,
        is_outsourced BOOLEAN DEFAULT false,
        status VARCHAR(20) DEFAULT 'pending',
        vendor_id INT,
        started_at TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
  }
}
