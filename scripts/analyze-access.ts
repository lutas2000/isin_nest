import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import MDBReader from 'mdb-reader';
import iconv from 'iconv-lite';

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

// 從命令列參數或環境變數取得 Access 檔案路徑
const ACCESS_FILE_PATH =
  process.argv[2] || process.env.ACCESS_FILE_PATH || '';
const TARGET_DB = process.env.DB_NAME || process.env.DB_DATABASE || 'isin_db';
// Access 資料庫密碼
const ACCESS_DB_PASSWORD = process.env.ACCESS_DB_PASSWORD || '';

// 要分析的 MySQL 資料表名稱（可選，如果提供則會進行對比分析）
const MYSQL_TABLE_NAME = process.argv[3] || process.env.MYSQL_TABLE_NAME || '';

/**
 * 將 Big5 編碼的字串轉換為 UTF-8
 * 當 Node.js 讀取 Big5 編碼的字串時，會將其錯誤地解釋為 UTF-8
 * 我們需要將字串轉回 Buffer（使用 latin1 以保留原始字節），然後用 Big5 解碼
 */
function convertBig5ToUtf8(value: any): any {
  if (typeof value === 'string' && value.length > 0) {
    try {
      // 將字串轉為 Buffer（使用 latin1 編碼以保留原始字節）
      // 這樣可以將被錯誤解釋為 UTF-8 的 Big5 字串轉回原始字節
      const buffer = Buffer.from(value, 'latin1');
      // 使用 Big5 解碼 Buffer
      return iconv.decode(buffer, 'big5');
    } catch (error) {
      // 如果轉換失敗（可能已經是 UTF-8），返回原始值
      return value;
    }
  }
  return value;
}

/**
 * 遞迴轉換物件中的所有字串值
 */
function convertObjectBig5ToUtf8(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return convertBig5ToUtf8(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => convertObjectBig5ToUtf8(item));
  }

  if (typeof obj === 'object') {
    const converted: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        converted[key] = convertObjectBig5ToUtf8(obj[key]);
      }
    }
    return converted;
  }

  return obj;
}

/**
 * 分析 Access 資料表結構
 */
function analyzeAccessTable(reader: MDBReader, tableName: string) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📋 分析 Access 資料表: ${tableName}`);
  console.log('='.repeat(80));

  try {
    const table = reader.getTable(tableName);
    const columns = table.getColumns();

    console.log(`\n📊 欄位資訊 (共 ${columns.length} 個欄位):`);
    console.log('-'.repeat(80));

    columns.forEach((col, index) => {
      const colName = convertBig5ToUtf8(col.name);
      console.log(`\n${index + 1}. ${colName}`);
      console.log(`   類型: ${col.type}`);
      if (col.size) {
        console.log(`   大小: ${col.size}`);
      }
      console.log(`   可為空: ${col.nullable ? '是' : '否'}`);
      if (col.fixedLength) {
        console.log(`   固定長度: 是`);
      }
      if (col.autoLong) {
        console.log(`   自動遞增: 是`);
      }
      if (col.precision !== undefined) {
        console.log(`   精度: ${col.precision}`);
      }
      if (col.scale !== undefined) {
        console.log(`   小數位數: ${col.scale}`);
      }
    });

    // 讀取樣本資料
    const sampleRows = table.getData({ rowLimit: 5 });
    console.log(`\n📝 樣本資料 (前 5 筆):`);
    console.log('-'.repeat(80));

    if (sampleRows.length === 0) {
      console.log('   (無資料)');
    } else {
      sampleRows.forEach((row, index) => {
        console.log(`\n   記錄 ${index + 1}:`);
        // 轉換整個 row 物件中的 Big5 編碼字串
        const convertedRow = convertObjectBig5ToUtf8(row);
        Object.entries(convertedRow).forEach(([key, value]) => {
          const valueStr =
            value === null || value === undefined
              ? 'NULL'
              : typeof value === 'object'
                ? JSON.stringify(value)
                : String(value);
          const truncatedValue =
            valueStr.length > 50 ? valueStr.substring(0, 50) + '...' : valueStr;
          console.log(`     ${key}: ${truncatedValue}`);
        });
      });
    }

    // 取得總筆數
    const allRows = table.getData();
    console.log(`\n📊 總筆數: ${allRows.length}`);

    return {
      columns,
      sampleRows,
      totalRows: allRows.length,
    };
  } catch (error) {
    console.error(`   ❌ 分析失敗:`, error);
    return null;
  }
}

/**
 * 取得 MySQL 資料表結構
 */
async function getMySQLTableStructure(
  dataSource: DataSource,
  tableName: string,
) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📋 分析 MySQL 資料表: ${tableName}`);
  console.log('='.repeat(80));

  try {
    const columns = await dataSource.query(
      `SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        CHARACTER_MAXIMUM_LENGTH,
        IS_NULLABLE,
        COLUMN_DEFAULT,
        COLUMN_KEY,
        EXTRA
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = '${TARGET_DB}' AND TABLE_NAME = '${tableName}' 
      ORDER BY ORDINAL_POSITION`,
    );

    if (columns.length === 0) {
      console.log(`   ⚠️  資料表 ${tableName} 不存在`);
      return null;
    }

    console.log(`\n📊 欄位資訊 (共 ${columns.length} 個欄位):`);
    console.log('-'.repeat(80));

    columns.forEach((col: any, index: number) => {
      console.log(`\n${index + 1}. ${col.COLUMN_NAME}`);
      console.log(`   類型: ${col.DATA_TYPE}`);
      if (col.CHARACTER_MAXIMUM_LENGTH) {
        console.log(`   長度: ${col.CHARACTER_MAXIMUM_LENGTH}`);
      }
      console.log(`   可為空: ${col.IS_NULLABLE === 'YES' ? '是' : '否'}`);
      if (col.COLUMN_DEFAULT !== null) {
        console.log(`   預設值: ${col.COLUMN_DEFAULT}`);
      }
      if (col.COLUMN_KEY) {
        console.log(`   索引: ${col.COLUMN_KEY}`);
      }
      if (col.EXTRA) {
        console.log(`   額外: ${col.EXTRA}`);
      }
    });

    return columns;
  } catch (error) {
    console.error(`   ❌ 分析失敗:`, error);
    return null;
  }
}

/**
 * 對比 Access 和 MySQL 資料表結構
 */
function compareTableStructures(
  accessColumns: any[],
  mysqlColumns: any[],
  accessTableName: string,
  mysqlTableName: string,
) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🔍 對比分析: ${accessTableName} <-> ${mysqlTableName}`);
  console.log('='.repeat(80));

  const accessColumnNames = accessColumns.map((col) => col.name);
  const mysqlColumnNames = mysqlColumns.map(
    (col: any) => col.COLUMN_NAME,
  );

  // 共同欄位
  const commonColumns = accessColumnNames.filter((name) =>
    mysqlColumnNames.includes(name),
  );

  // 只在 Access 中的欄位
  const onlyInAccess = accessColumnNames.filter(
    (name) => !mysqlColumnNames.includes(name),
  );

  // 只在 MySQL 中的欄位
  const onlyInMySQL = mysqlColumnNames.filter(
    (name) => !accessColumnNames.includes(name),
  );

  console.log(`\n✅ 共同欄位 (${commonColumns.length} 個):`);
  if (commonColumns.length > 0) {
    commonColumns.forEach((col) => {
      const accessCol = accessColumns.find((c) => c.name === col);
      const mysqlCol = mysqlColumns.find((c: any) => c.COLUMN_NAME === col);
      const colNameUtf8 = convertBig5ToUtf8(col);
      console.log(`   - ${colNameUtf8}`);
      console.log(`     Access: ${accessCol?.type || 'N/A'}`);
      console.log(`     MySQL: ${mysqlCol?.DATA_TYPE || 'N/A'}`);
    });
  } else {
    console.log('   (無)');
  }

  if (onlyInAccess.length > 0) {
    console.log(`\n⚠️  只在 Access 中的欄位 (${onlyInAccess.length} 個):`);
    onlyInAccess.forEach((col) => {
      const accessCol = accessColumns.find((c) => c.name === col);
      const colNameUtf8 = convertBig5ToUtf8(col);
      console.log(`   - ${colNameUtf8} (${accessCol?.type || 'N/A'})`);
    });
  }

  if (onlyInMySQL.length > 0) {
    console.log(`\n⚠️  只在 MySQL 中的欄位 (${onlyInMySQL.length} 個):`);
    onlyInMySQL.forEach((col) => {
      const mysqlCol = mysqlColumns.find((c: any) => c.COLUMN_NAME === col);
      console.log(`   - ${col} (${mysqlCol?.DATA_TYPE || 'N/A'})`);
    });
  }

  return {
    commonColumns,
    onlyInAccess,
    onlyInMySQL,
  };
}

/**
 * 主函數
 */
async function analyzeAccess() {
  let targetDataSource: DataSource | null = null;

  try {
    // 檢查 Access 檔案路徑
    if (!ACCESS_FILE_PATH) {
      console.error('❌ 錯誤：請提供 Access 檔案路徑');
      console.log('使用方法：');
      console.log('  npm run analyze-access <access-file-path> [mysql-table-name]');
      console.log('或設定環境變數：');
      console.log(
        '  ACCESS_FILE_PATH=/path/to/database.mdb MYSQL_TABLE_NAME=quote npm run analyze-access',
      );
      process.exit(1);
    }

    console.log('🔍 開始分析 Access 資料庫...');
    console.log(`📁 Access 檔案: ${ACCESS_FILE_PATH}`);
    if (MYSQL_TABLE_NAME) {
      console.log(`📊 目標 MySQL 資料表: ${MYSQL_TABLE_NAME}`);
      console.log(`📊 目標資料庫: ${TARGET_DB}`);
      console.log(`🔌 資料庫主機: ${dbConfig.host}:${dbConfig.port}`);
    }

    // 讀取 Access 檔案
    console.log('\n📖 正在讀取 Access 檔案...');
    let reader: MDBReader;
    try {
      const buffer = readFileSync(ACCESS_FILE_PATH);
      const options = ACCESS_DB_PASSWORD ? { password: ACCESS_DB_PASSWORD } : undefined;
      reader = new MDBReader(buffer, options);
      console.log('✅ Access 檔案讀取成功');
      if (ACCESS_DB_PASSWORD) {
        console.log('   (已使用密碼)');
      }
    } catch (error) {
      console.error('❌ 讀取 Access 檔案失敗');
      console.error('   請檢查：');
      console.error('   1. 檔案路徑是否正確');
      console.error('   2. 檔案是否存在');
      console.error('   3. 是否有讀取權限');
      console.error('   4. 密碼是否正確（如果資料庫有密碼）');
      throw error;
    }

    // 取得所有資料表名稱
    const accessTableNames = reader.getTableNames({ normalTables: true });
    console.log(`\n📋 找到 ${accessTableNames.length} 個資料表:`);
    accessTableNames.forEach((name, index) => {
      console.log(`   ${index + 1}. ${name}`);
    });

    // 如果指定了 MySQL 資料表名稱，連接資料庫進行對比
    if (MYSQL_TABLE_NAME) {
      console.log('\n🔌 正在連接 MySQL 資料庫...');
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
        console.log('✅ MySQL 資料庫連接成功');
      } catch (error) {
        console.error('❌ MySQL 資料庫連接失敗');
        console.error('   請檢查資料庫配置');
        throw error;
      }
    }

    // 分析所有資料表，或只分析指定的資料表
    const tablesToAnalyze = MYSQL_TABLE_NAME
      ? accessTableNames.filter((name) =>
          name.toLowerCase().includes(MYSQL_TABLE_NAME.toLowerCase()),
        )
      : accessTableNames;

    if (tablesToAnalyze.length === 0 && MYSQL_TABLE_NAME) {
      console.log(
        `\n⚠️  在 Access 中找不到與 "${MYSQL_TABLE_NAME}" 相關的資料表`,
      );
      console.log('   將分析所有資料表');
    }

    const finalTablesToAnalyze =
      tablesToAnalyze.length > 0 ? tablesToAnalyze : accessTableNames;

    for (const tableName of finalTablesToAnalyze) {
      const accessAnalysis = analyzeAccessTable(reader, tableName);

      if (MYSQL_TABLE_NAME && targetDataSource && accessAnalysis) {
        // 嘗試找到對應的 MySQL 資料表
        const mysqlTableName = MYSQL_TABLE_NAME;
        const mysqlColumns = await getMySQLTableStructure(
          targetDataSource,
          mysqlTableName,
        );

        if (mysqlColumns) {
          compareTableStructures(
            accessAnalysis.columns,
            mysqlColumns,
            tableName,
            mysqlTableName,
          );
        }
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ 分析完成！');
    console.log('='.repeat(80));
  } catch (error) {
    console.error('\n❌ 發生錯誤：');

    if (error instanceof Error) {
      console.error('   錯誤訊息:', error.message);
      if (error.stack) {
        console.error('\n   堆疊追蹤:');
        const stackLines = error.stack.split('\n').slice(0, 10);
        stackLines.forEach((line) => console.error('   ' + line));
      }
    } else {
      console.error('   錯誤:', error);
    }

    process.exit(1);
  } finally {
    // 關閉資料庫連接
    if (targetDataSource && targetDataSource.isInitialized) {
      await targetDataSource.destroy();
      console.log('\n🔌 MySQL 資料庫連接已關閉');
    }
  }
}

// 執行腳本
analyzeAccess().catch((error) => {
  console.error('❌ 未預期的錯誤：', error);
  process.exit(1);
});

