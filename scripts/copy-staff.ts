import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as bcrypt from 'bcrypt';
import { resolve } from 'path';

// 載入環境變數（專案根目錄 .env）
const envPath = resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

// 來源（舊）MySQL 資料庫配置
const SOURCE_DB =
  process.env.SOURCE_DB_NAME ||
  process.env.SOURCE_DB_DATABASE ||
  'isin2';

const sourceDbConfig = {
  host: process.env.SOURCE_DB_HOST || process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.SOURCE_DB_PORT || '3306', 10),
  user:
    process.env.SOURCE_DB_USER ||
    process.env.SOURCE_DB_USERNAME ||
    process.env.DB_USER ||
    process.env.DB_USERNAME ||
    'root',
  password:
    process.env.SOURCE_DB_PASS ||
    process.env.SOURCE_DB_PASSWORD ||
    process.env.DB_PASS ||
    process.env.DB_PASSWORD ||
    '',
};

// 目標（新）PostgreSQL 資料庫配置
const TARGET_DB =
  process.env.DB_NAME || process.env.DB_DATABASE || 'isin_db';

const targetDbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER || process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASS || process.env.DB_PASSWORD || '',
};

const DEFAULT_PASSWORD = 'isinisin';

/**
 * 取得兩個資料表的共同欄位
 */
async function getCommonColumns(
  sourceDataSource: DataSource,
  targetDataSource: DataSource,
  tableName: string,
): Promise<string[]> {
  // 取得來源（MySQL）資料表欄位
  const sourceColumns = await sourceDataSource.query(
    `SELECT COLUMN_NAME 
     FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = '${SOURCE_DB}' AND TABLE_NAME = '${tableName}' 
     ORDER BY ORDINAL_POSITION`,
  );
  const sourceColumnNames = sourceColumns.map((row: any) => row.COLUMN_NAME);

  // 取得目標（PostgreSQL）資料表欄位
  const targetColumns = await targetDataSource.query(
    `SELECT column_name AS "COLUMN_NAME"
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = '${tableName}'
     ORDER BY ordinal_position`,
  );
  const targetColumnNames = targetColumns.map((row: any) => row.COLUMN_NAME);

  // 找出共同欄位
  return sourceColumnNames.filter((col: string) =>
    targetColumnNames.includes(col),
  );
}

/**
 * 為 staff 建立對應的 user
 */
async function createUsersForStaff(
  targetDataSource: DataSource,
  staffIds: string[],
): Promise<Map<string, number>> {
  console.log('\n👤 正在為 staff 建立對應的 users...');
  console.log(`   需要建立 ${staffIds.length} 個 users`);

  const staffToUserIdMap = new Map<string, number>();
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, saltRounds);

  let createdCount = 0;
  let skippedCount = 0;

  for (const staffId of staffIds) {
    try {
      // 檢查 PostgreSQL 中 users 是否已存在對應帳號
      const existingUsers = await targetDataSource.query(
        `SELECT id FROM "users" WHERE "userName" = $1`,
        [staffId],
      );

      if (existingUsers.length > 0) {
        // 已存在，使用現有的 user id
        staffToUserIdMap.set(staffId, existingUsers[0].id);
        skippedCount++;
        console.log(`   ⏭️  跳過: ${staffId} (已存在 user id: ${existingUsers[0].id})`);
      } else {
        // 建立新的 user（PostgreSQL）
        const newUsers = await targetDataSource.query(
          `INSERT INTO "users" ("userName", "password", "isAdmin", "createdAt", "updatedAt") 
           VALUES ($1, $2, $3, NOW(), NOW())
           RETURNING id`,
          [staffId, hashedPassword, 0],
        );

        const newUser = newUsers[0];
        if (newUser && newUser.id) {
          staffToUserIdMap.set(staffId, newUser.id);
          createdCount++;
          console.log(`   ✅ 建立: ${staffId} -> user id: ${newUser.id}`);
        } else {
          console.warn(`   ⚠️ 建立 user 成功但無法取得 id (${staffId})`);
        }
      }
    } catch (error) {
      console.error(`   ❌ 建立 user 失敗 (${staffId}):`, error);
    }
  }

  console.log(`\n   📊 統計: 建立 ${createdCount} 個，跳過 ${skippedCount} 個`);
  return staffToUserIdMap;
}

/**
 * 複製 staff 資料表
 */
async function copyStaffTable(
  sourceDataSource: DataSource,
  targetDataSource: DataSource,
  staffToUserIdMap: Map<string, number>,
): Promise<number> {
  console.log('\n📋 開始複製 staff 資料表...');

  try {
    // 取得共同欄位
    const commonColumns = await getCommonColumns(
      sourceDataSource,
      targetDataSource,
      'staff',
    );

    if (commonColumns.length === 0) {
      console.log('❌ 錯誤: 資料表 staff 沒有共同欄位，無法複製');
      return 0;
    }

    console.log(`✅ 找到 ${commonColumns.length} 個共同欄位`);

    // 先清空目標資料表
    // 因為可能有外鍵約束，先暫時禁用外鍵檢查，然後使用 DELETE
    // console.log('\n🗑️  正在清空目標資料表 staff...');
    // try {
    //   await targetDataSource.query(`SET FOREIGN_KEY_CHECKS = 0`);
    //   await targetDataSource.query(`DELETE FROM \`${TARGET_DB}\`.\`staff\``);
    //   await targetDataSource.query(`SET FOREIGN_KEY_CHECKS = 1`);
    //   console.log('✅ 已清空目標資料表 staff');
    // } catch (error) {
    //   // 如果禁用外鍵檢查失敗，嘗試直接使用 DELETE
    //   await targetDataSource.query(`SET FOREIGN_KEY_CHECKS = 1`);
    //   await targetDataSource.query(`DELETE FROM \`${TARGET_DB}\`.\`staff\``);
    //   console.log('✅ 已清空目標資料表 staff (使用 DELETE)');
    // }

    // 從來源（MySQL）資料表讀取資料
    const mysqlColumnsStr = commonColumns.map((col) => `\`${col}\``).join(', ');
    const rows = await sourceDataSource.query(
      `SELECT ${mysqlColumnsStr} FROM \`${SOURCE_DB}\`.\`staff\``,
    );

    if (rows.length === 0) {
      console.log('ℹ️  來源資料表為空，跳過');
      return 0;
    }

    console.log(`\n📥 從來源資料表讀取到 ${rows.length} 筆資料`);

    // 批次插入資料
    const batchSize = 1000;
    let insertedCount = 0;

    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const values = batch.map((row: any) => {
        const rowValues = commonColumns.map((col) => {
          let value = row[col];

          // 特殊處理：如果是 id 欄位對應的 userId，使用對應的 user id
          if (col === 'userId' && row.id) {
            const userId = staffToUserIdMap.get(row.id);
            if (userId !== undefined) {
              value = userId;
            } else {
              value = null; // 如果找不到對應的 user，設為 null
            }
          }

          // 特殊處理：PostgreSQL 中的布林欄位（來源 MySQL 以 0/1 儲存）
          if (
            ['is_foreign', 'benifit', 'need_check', 'have_fake'].includes(col)
          ) {
            if (value === null || value === undefined) {
              return 'NULL';
            }

            // 盡量用數字 0 / 1 判斷，否則退回 truthy / falsy
            const num = typeof value === 'number' ? value : Number(value);
            const boolValue = Number.isNaN(num) ? !!value : num === 1;
            return boolValue ? 'TRUE' : 'FALSE';
          }

          if (value === null || value === undefined) {
            return 'NULL';
          }

          // 處理特殊類型
          if (value instanceof Date) {
            return `'${value.toISOString().slice(0, 19).replace('T', ' ')}'`;
          }
          if (typeof value === 'string') {
            // 轉義單引號和反斜線
            return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "''")}'`;
          }
          if (typeof value === 'boolean') {
            // PostgreSQL 布林常數
            return value ? 'TRUE' : 'FALSE';
          }
          if (typeof value === 'object') {
            // Buffer 類型（BLOB）
            if (Buffer.isBuffer(value)) {
              // 以十六進位字串形式存入（PostgreSQL 可視需要再轉為 bytea）
              return `'\\x${value.toString('hex')}'`;
            }
            // JSON 欄位
            return `'${JSON.stringify(value).replace(/\\/g, '\\\\').replace(/'/g, "''")}'`;
          }
          if (typeof value === 'number') {
            // 數字類型直接返回，不需要引號
            return String(value);
          }
          return String(value);
        });
        return `(${rowValues.join(', ')})`;
      });

      // 對目標（PostgreSQL）使用雙引號包住欄位名稱
      const pgColumnsStr = commonColumns.map((col) => `"${col}"`).join(', ');
      const insertSql = `INSERT INTO "staff" (${pgColumnsStr}) VALUES ${values.join(', ')}`;
      await targetDataSource.query(insertSql);
      insertedCount += batch.length;
      console.log(`   ✅ 已插入 ${insertedCount}/${rows.length} 筆資料`);
    }

    console.log(`\n✅ 成功複製 ${insertedCount} 筆 staff 資料`);
    return insertedCount;
  } catch (error) {
    console.error('❌ 複製 staff 資料表時發生錯誤:', error);
    throw error;
  }
}

/**
 * 主函數
 */
async function copyStaffTableData() {
  let sourceDataSource: DataSource | null = null;
  let targetDataSource: DataSource | null = null;

  try {
    console.log('🚀 開始複製 staff 資料表...');
    console.log(`📊 來源資料庫: ${SOURCE_DB}`);
    console.log(`📊 目標資料庫: ${TARGET_DB}`);
    console.log(
      `🔌 來源資料庫主機: ${sourceDbConfig.host}:${sourceDbConfig.port}`,
    );
    console.log(
      `🔌 目標資料庫主機: ${targetDbConfig.host}:${targetDbConfig.port}`,
    );

    // 連接來源資料庫
    console.log('\n🔌 正在連接來源資料庫...');
    console.log(`   主機: ${sourceDbConfig.host}:${sourceDbConfig.port}`);
    console.log(`   用戶: ${sourceDbConfig.user}`);
    console.log(`   資料庫: ${SOURCE_DB}`);
    
    sourceDataSource = new DataSource({
      type: 'mysql',
      host: sourceDbConfig.host,
      port: sourceDbConfig.port,
      username: sourceDbConfig.user,
      password: sourceDbConfig.password,
      database: SOURCE_DB,
      synchronize: false,
      charset: 'utf8mb4',
      extra: {
        charset: 'utf8mb4',
        collation: 'utf8mb4_unicode_ci',
        connectionLimit: 10,
        acquireTimeout: 60000,
        timeout: 60000,
        reconnect: true,
        reconnectTries: 3,
        reconnectInterval: 1000,
      },
    });
    
    try {
      await sourceDataSource.initialize();
      console.log('✅ 來源資料庫連接成功');
    } catch (error) {
      console.error('❌ 來源資料庫連接失敗');
      console.error('   請檢查：');
      console.error('   1. 資料庫服務是否正在運行');
      console.error('   2. 連接資訊是否正確（主機、端口、用戶名、密碼）');
      console.error('   3. 資料庫 ' + SOURCE_DB + ' 是否存在');
      throw error;
    }

    // 連接目標資料庫
    console.log('\n🔌 正在連接目標資料庫...');
    console.log(`   主機: ${targetDbConfig.host}:${targetDbConfig.port}`);
    console.log(`   用戶: ${targetDbConfig.user}`);
    console.log(`   資料庫: ${TARGET_DB}`);
    
    targetDataSource = new DataSource({
      type: 'postgres',
      host: targetDbConfig.host,
      port: targetDbConfig.port,
      username: targetDbConfig.user,
      password: targetDbConfig.password,
      database: TARGET_DB,
      synchronize: false,
      extra: {
        max: 10,
        connectionTimeoutMillis: 60000,
        idleTimeoutMillis: 30000,
      },
    });
    
    try {
      await targetDataSource.initialize();
      console.log('✅ 目標資料庫連接成功');
    } catch (error) {
      console.error('❌ 目標資料庫連接失敗');
      console.error('   請檢查：');
      console.error('   1. 資料庫服務是否正在運行');
      console.error('   2. 連接資訊是否正確（主機、端口、用戶名、密碼）');
      console.error('   3. 資料庫 ' + TARGET_DB + ' 是否存在');
      throw error;
    }

    // 取得所有 staff.id
    console.log('\n📋 取得所有 staff.id...');
    const staffRows = await sourceDataSource.query(
      `SELECT id FROM \`${SOURCE_DB}\`.\`staff\``,
    );
    const staffIds = staffRows.map((row: any) => row.id);
    console.log(`✅ 找到 ${staffIds.length} 個 staff 記錄`);

    // 為每個 staff.id 建立對應的 user
    console.log(`\n👤 為 staff 建立對應的 users (預設密碼: ${DEFAULT_PASSWORD})...`);
    const staffToUserIdMap = await createUsersForStaff(
      targetDataSource,
      staffIds,
    );

    // 複製 staff 資料

    const copiedRows = await copyStaffTable(
      sourceDataSource,
      targetDataSource,
      staffToUserIdMap,
    );

    // 完成
    console.log('\n' + '='.repeat(80));
    console.log('✅ 複製完成！');
    console.log('='.repeat(80));
    console.log(`📊 總共處理了 ${staffIds.length} 個 staff`);
    console.log(`📊 建立了 ${staffToUserIdMap.size} 個 users`);
    console.log(`📊 複製了 ${copiedRows} 筆 staff 資料`);
    console.log('='.repeat(80));
  } catch (error) {
    console.error('\n❌ 發生錯誤：');
    
    // 處理 AggregateError（通常包含多個連接錯誤）
    if (error && typeof error === 'object' && 'errors' in error) {
      const aggregateError = error as { errors: Error[]; message: string };
      console.error('   錯誤類型: 連接失敗 (AggregateError)');
      console.error('   可能的原因:');
      console.error('   1. 資料庫服務未啟動');
      console.error('   2. 連接資訊不正確（主機、端口、用戶名、密碼）');
      console.error('   3. 防火牆或網路問題');
      console.error('   4. 資料庫不存在');
      
      if (aggregateError.errors && aggregateError.errors.length > 0) {
        console.error('\n   詳細錯誤:');
        aggregateError.errors.forEach((err, index) => {
          console.error(`   ${index + 1}. ${err.message}`);
        });
      }
    } else if (error instanceof Error) {
      console.error('   錯誤訊息:', error.message);
      if (error.stack) {
        console.error('\n   堆疊追蹤:');
        const stackLines = error.stack.split('\n').slice(0, 10);
        stackLines.forEach((line) => console.error('   ' + line));
      }
    } else {
      console.error('   錯誤:', error);
    }
    
    console.error('\n   請檢查 .env 檔案中的資料庫配置：');
    console.error(`   SOURCE_DB_HOST=${sourceDbConfig.host}`);
    console.error(`   SOURCE_DB_PORT=${sourceDbConfig.port}`);
    console.error(`   SOURCE_DB_USER=${sourceDbConfig.user}`);
    console.error(
      `   SOURCE_DB_PASS=${
        sourceDbConfig.password ? '***' : '(未設定)'
      }`,
    );
    console.error(`   DB_HOST=${targetDbConfig.host}`);
    console.error(`   DB_PORT=${targetDbConfig.port}`);
    console.error(`   DB_USER=${targetDbConfig.user}`);
    console.error(
      `   DB_PASS=${targetDbConfig.password ? '***' : '(未設定)'}`,
    );
    
    process.exit(1);
  } finally {
    // 關閉資料庫連接
    if (sourceDataSource && sourceDataSource.isInitialized) {
      await sourceDataSource.destroy();
      console.log('\n🔌 來源資料庫連接已關閉');
    }
    if (targetDataSource && targetDataSource.isInitialized) {
      await targetDataSource.destroy();
      console.log('🔌 目標資料庫連接已關閉');
    }
  }
}

// 執行腳本
copyStaffTableData().catch((error) => {
  console.error('❌ 未預期的錯誤：', error);
  process.exit(1);
});
