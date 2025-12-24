import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as bcrypt from 'bcrypt';
import { resolve } from 'path';

// 載入環境變數
const envPath = resolve(__dirname, '../apps/backend/.env');
dotenv.config({ path: envPath });

// 資料庫配置
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASS || process.env.DB_PASSWORD || '',
};

const SOURCE_DB = 'isin2';
const TARGET_DB = 'test_isin2';
const DEFAULT_PASSWORD = 'isinisin';

/**
 * 取得兩個資料表的共同欄位
 */
async function getCommonColumns(
  sourceDataSource: DataSource,
  targetDataSource: DataSource,
  tableName: string,
): Promise<string[]> {
  // 取得來源資料表欄位
  const sourceColumns = await sourceDataSource.query(
    `SELECT COLUMN_NAME 
     FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = '${SOURCE_DB}' AND TABLE_NAME = '${tableName}' 
     ORDER BY ORDINAL_POSITION`,
  );
  const sourceColumnNames = sourceColumns.map((row: any) => row.COLUMN_NAME);

  // 取得目標資料表欄位
  const targetColumns = await targetDataSource.query(
    `SELECT COLUMN_NAME 
     FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = '${TARGET_DB}' AND TABLE_NAME = '${tableName}' 
     ORDER BY ORDINAL_POSITION`,
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
      // 轉義 staffId 以防止 SQL 注入
      const escapedStaffId = staffId.replace(/'/g, "''");
      
      // 檢查是否已存在
      const existingUsers = await targetDataSource.query(
        `SELECT id FROM \`${TARGET_DB}\`.\`users\` WHERE userName = '${escapedStaffId}'`,
      );

      if (existingUsers.length > 0) {
        // 已存在，使用現有的 user id
        staffToUserIdMap.set(staffId, existingUsers[0].id);
        skippedCount++;
        console.log(`   ⏭️  跳過: ${staffId} (已存在 user id: ${existingUsers[0].id})`);
      } else {
        // 轉義密碼
        const escapedPassword = hashedPassword.replace(/'/g, "''");
        
        // 建立新的 user
        await targetDataSource.query(
          `INSERT INTO \`${TARGET_DB}\`.\`users\` (userName, password, isAdmin, createdAt, updatedAt) 
           VALUES ('${escapedStaffId}', '${escapedPassword}', 0, NOW(), NOW())`,
        );

        // 取得插入的 id
        const newUsers = await targetDataSource.query(
          `SELECT id FROM \`${TARGET_DB}\`.\`users\` WHERE userName = '${escapedStaffId}'`,
        );

        if (newUsers.length > 0 && newUsers[0].id) {
          staffToUserIdMap.set(staffId, newUsers[0].id);
          createdCount++;
          console.log(
            `   ✅ 建立: ${staffId} -> user id: ${newUsers[0].id}`,
          );
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

    // 從來源資料表讀取資料
    const columnsStr = commonColumns.map((col) => `\`${col}\``).join(', ');
    const rows = await sourceDataSource.query(
      `SELECT ${columnsStr} FROM \`${SOURCE_DB}\`.\`staff\``,
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
            return value ? '1' : '0';
          }
          if (typeof value === 'object') {
            // Buffer 類型（BLOB）
            if (Buffer.isBuffer(value)) {
              return `0x${value.toString('hex')}`;
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

      const insertSql = `INSERT INTO \`${TARGET_DB}\`.\`staff\` (${columnsStr}) VALUES ${values.join(', ')}`;
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
    console.log(`🔌 資料庫主機: ${dbConfig.host}:${dbConfig.port}`);

    // 連接來源資料庫
    console.log('\n🔌 正在連接來源資料庫...');
    console.log(`   主機: ${dbConfig.host}:${dbConfig.port}`);
    console.log(`   用戶: ${dbConfig.user}`);
    console.log(`   資料庫: ${SOURCE_DB}`);
    
    sourceDataSource = new DataSource({
      type: 'mysql',
      host: dbConfig.host,
      port: dbConfig.port,
      username: dbConfig.user,
      password: dbConfig.password,
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
    console.log(`   主機: ${dbConfig.host}:${dbConfig.port}`);
    console.log(`   用戶: ${dbConfig.user}`);
    console.log(`   資料庫: ${TARGET_DB}`);
    
    targetDataSource = new DataSource({
      type: 'mysql',
      host: dbConfig.host,
      port: dbConfig.port,
      username: dbConfig.user,
      password: dbConfig.password,
      database: TARGET_DB,
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
    console.error(`   DB_HOST=${dbConfig.host}`);
    console.error(`   DB_PORT=${dbConfig.port}`);
    console.error(`   DB_USER=${dbConfig.user}`);
    console.error(`   DB_PASS=${dbConfig.password ? '***' : '(未設定)'}`);
    
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
