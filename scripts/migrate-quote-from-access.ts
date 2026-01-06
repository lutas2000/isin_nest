import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import MDBReader from 'mdb-reader';
import iconv from 'iconv-lite';
import { Quote } from '../apps/backend/src/crm/quote/entities/quote.entity';
import { QuoteItem } from '../apps/backend/src/crm/quote-item/entities/quote-item.entity';
import { Customer } from '../apps/backend/src/crm/customer/entities/customer.entity';
import { Contact } from '../apps/backend/src/crm/contact/entities/contact.entity';
import { WorkOrder } from '../apps/backend/src/crm/work-order/entities/work-order.entity';
import { WorkOrderItem } from '../apps/backend/src/crm/work-order-item/entities/work-order-item.entity';
import { Staff } from '../apps/backend/src/hr/staff/entities/staff.entity';
import { User } from '../apps/backend/src/auth/entities/user.entity';
import { UserFeature } from '../apps/backend/src/auth/entities/user-feature.entity';
import { Feature } from '../apps/backend/src/auth/entities/feature.entity';

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

const TARGET_DB = process.env.DB_NAME || process.env.DB_DATABASE || 'isin_db';
const ACCESS_DB_PASSWORD = process.env.ACCESS_DB_PASSWORD || '';

// 從命令列參數或環境變數取得 Access 檔案路徑
const ACCESS_FILE_PATH =
  process.argv[2] || process.env.ACCESS_FILE_PATH || 'legacy/quote.mdb';

// 從命令列參數或環境變數取得 skip 數量
const SKIP_COUNT = parseInt(
  process.argv.find((arg) => arg.startsWith('--skip='))?.split('=')[1] ||
    process.env.SKIP_COUNT ||
    '0',
  10,
);

/**
 * 清理字串，移除無效字符和控制字符
 * 保留常見的空白字符（空格、換行、Tab）
 */
function cleanString(value: string | null | undefined): string | undefined {
  if (!value || typeof value !== 'string') {
    return undefined;
  }

  // 移除 NULL 字節和其他控制字符（保留常見的空白字符）
  // \x09 = Tab, \x0A = 換行, \x0D = 回車
  let cleaned = value
    .replace(/\0/g, '') // 移除 NULL 字節
    .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '') // 移除控制字符（保留 \x09 Tab, \x0A 換行, \x0D 回車）
    .trim();

  // 如果清理後為空，返回 undefined
  if (cleaned === '') {
    return undefined;
  }

  // 驗證並修復 UTF-8 編碼
  try {
    // 先嘗試直接驗證是否為有效的 UTF-8
    const buffer = Buffer.from(cleaned, 'utf8');
    const validated = buffer.toString('utf8');
    
    // 檢查是否包含有效的 UTF-8 字符
    if (validated.length === 0) {
      return undefined;
    }
    
    // 再次移除可能產生的 NULL 字節
    const final = validated.replace(/\0/g, '').trim();
    
    return final || undefined;
  } catch (error) {
    // 如果 UTF-8 轉換失敗，嘗試從 latin1 修復
    // 這通常發生在編碼轉換不完整的情況下
    try {
      // 將字串視為 latin1 編碼的位元組序列，然後嘗試解碼為 UTF-8
      const latin1Buffer = Buffer.from(cleaned, 'latin1');
      // 嘗試將 latin1 位元組重新解釋為 UTF-8
      const repaired = latin1Buffer.toString('utf8');
      
      // 移除無效字符
      const final = repaired
        .replace(/\0/g, '')
        .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '')
        .trim();
      
      return final || undefined;
    } catch (e) {
      // 如果所有嘗試都失敗，返回 undefined
      return undefined;
    }
  }
}

/**
 * 將 Big5 編碼的字串轉換為 UTF-8
 */
function convertBig5ToUtf8(value: any): any {
  if (typeof value === 'string' && value.length > 0) {
    try {
      const buffer = Buffer.from(value, 'latin1');
      return iconv.decode(buffer, 'big5');
    } catch (error) {
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
 * 將民國年格式轉換為西元年 Date 物件
 * 格式: "100.01.03" -> 2011-01-03
 */
function convertRocDateToDate(rocDateStr: string | null | undefined): Date | undefined {
  if (!rocDateStr || typeof rocDateStr !== 'string') {
    return undefined;
  }

  const trimmed = rocDateStr.trim();
  if (!trimmed || trimmed === '') {
    return undefined;
  }

  try {
    // 格式: "100.01.03" 或 "104.11.23"
    const parts = trimmed.split('.');
    if (parts.length !== 3) {
      return undefined;
    }

    const rocYear = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);

    if (isNaN(rocYear) || isNaN(month) || isNaN(day)) {
      return undefined;
    }

    // 民國年轉西元年: 西元年 = 民國年 + 1911
    const adYear = rocYear + 1911;

    // 驗證日期有效性
    if (month < 1 || month > 12 || day < 1 || day > 31) {
      return undefined;
    }

    const date = new Date(adYear, month - 1, day);
    
    // 驗證日期是否有效（處理 2 月 30 日等情況）
    if (
      date.getFullYear() !== adYear ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      return undefined;
    }

    return date;
  } catch (error) {
    return undefined;
  }
}

/**
 * 轉換 Access gtable 資料為 Quote 實體資料
 */
function convertGtableToQuote(gtableRow: any): Partial<Quote> {
  const quote: Partial<Quote> = {
    id: gtableRow.QNO ? String(gtableRow.QNO).trim() : undefined,
    staffId: gtableRow.ACTOR_NO ? String(gtableRow.ACTOR_NO).trim() : undefined,
    customerId: gtableRow.FACTOR_NO ? String(gtableRow.FACTOR_NO).trim() : undefined,
    totalAmount: gtableRow.AMOUNT != null ? Number(gtableRow.AMOUNT) : 0,
    notes: cleanString(gtableRow.ATTEN),
    createdAt: convertRocDateToDate(gtableRow.DATE_R),
  };

  return quote;
}

/**
 * 轉換 Access itable 和 jtable 資料為 QuoteItem 實體資料
 */
function convertItableJtableToQuoteItem(
  itableRow: any,
  jtableRow: any | null,
): Partial<QuoteItem> {
  const qno = itableRow.QNO ? String(itableRow.QNO).trim() : '';
  const sn = itableRow.SN ? String(itableRow.SN).trim() : '';
  const itemId = qno && sn ? `${qno}_${sn}` : undefined;

  const quoteItem: Partial<QuoteItem> = {
    id: itemId,
    quoteId: qno || undefined,
    customerFile: cleanString(itableRow.DWG_REF),
    material: cleanString(itableRow.METAL),
    thickness: cleanString(itableRow.THICK),
    processing: cleanString(itableRow.WORK),
    quantity: itableRow.QTY != null ? Math.round(Number(itableRow.QTY)) : 0,
    unitPrice: itableRow.PRICE != null ? Number(itableRow.PRICE) : 0,
    notes: jtableRow?.DWG_REF ? cleanString(jtableRow.DWG_REF) : undefined,
  };

  return quoteItem;
}

/**
 * 主函數
 */
async function migrateQuoteFromAccess() {
  let targetDataSource: DataSource | null = null;

  try {
    // 檢查 Access 檔案路徑
    if (!ACCESS_FILE_PATH) {
      console.error('❌ 錯誤：請提供 Access 檔案路徑');
      console.log('使用方法：');
      console.log('  npm run migrate-quote-from-access <access-file-path>');
      console.log('或設定環境變數：');
      console.log(
        '  ACCESS_FILE_PATH=/path/to/quote.mdb npm run migrate-quote-from-access',
      );
      process.exit(1);
    }

    console.log('🚀 開始從 Access 資料庫遷移報價單資料...');
    console.log(`📁 Access 檔案: ${ACCESS_FILE_PATH}`);
    console.log(`📊 目標資料庫: ${TARGET_DB}`);
    console.log(`🔌 資料庫主機: ${dbConfig.host}:${dbConfig.port}`);
    if (SKIP_COUNT > 0) {
      console.log(`⏭️  將跳過前 ${SKIP_COUNT} 筆資料`);
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

    // 檢查是否有必要的資料表
    const tableNames = reader.getTableNames({ normalTables: true });
    const requiredTables = ['gtable', 'itable', 'jtable'];
    const missingTables = requiredTables.filter((table) => !tableNames.includes(table));
    
    if (missingTables.length > 0) {
      console.error(`❌ 錯誤：Access 資料庫中找不到以下資料表: ${missingTables.join(', ')}`);
      console.log(`   找到的資料表: ${tableNames.join(', ')}`);
      process.exit(1);
    }

    // 讀取資料表
    console.log('\n📋 正在讀取資料表...');
    const gtable = reader.getTable('gtable');
    const itable = reader.getTable('itable');
    const jtable = reader.getTable('jtable');
    
    const gtableRows = gtable.getData();
    const itableRows = itable.getData();
    const jtableRows = jtable.getData();
    
    console.log(`✅ 讀取到 ${gtableRows.length} 筆報價單資料 (gtable)`);
    console.log(`✅ 讀取到 ${itableRows.length} 筆報價單工件資料 (itable)`);
    console.log(`✅ 讀取到 ${jtableRows.length} 筆備註資料 (jtable)`);

    // 建立 jtable 的索引（QNO + SN 作為 key）
    const jtableIndex: Map<string, any> = new Map();
    for (const jrow of jtableRows) {
      const qno = jrow.QNO ? String(jrow.QNO).trim() : '';
      const sn = jrow.SN ? String(jrow.SN).trim() : '';
      if (qno && sn) {
        const key = `${qno}_${sn}`;
        jtableIndex.set(key, jrow);
      }
    }
    console.log(`✅ 建立 jtable 索引，共 ${jtableIndex.size} 筆`);

    // 連接目標資料庫
    console.log('\n🔌 正在連接目標資料庫...');
    targetDataSource = new DataSource({
      type: 'mysql',
      host: dbConfig.host,
      port: dbConfig.port,
      username: dbConfig.user,
      password: dbConfig.password,
      database: TARGET_DB,
      entities: [
        Quote,
        QuoteItem,
        Customer,
        Contact,
        WorkOrder,
        WorkOrderItem,
        Staff,
        User,
        UserFeature,
        Feature,
      ],
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
      console.error('   請檢查資料庫配置');
      throw error;
    }

    // 開始遷移
    console.log('\n🔄 開始遷移資料...');
    console.log('='.repeat(80));

    const quoteRepo = targetDataSource.getRepository(Quote);
    const quoteItemRepo = targetDataSource.getRepository(QuoteItem);
    const staffRepo = targetDataSource.getRepository(Staff);
    const customerRepo = targetDataSource.getRepository(Customer);

    let quoteSuccessCount = 0;
    let quoteSkipCount = 0;
    let quoteErrorCount = 0;
    let quoteItemSuccessCount = 0;
    let quoteItemSkipCount = 0;
    let quoteItemErrorCount = 0;
    let currentIndex = 0;

    // 處理報價單 (gtable)
    const gtableRowsToProcess = gtableRows.slice(SKIP_COUNT);
    console.log(`\n📝 處理報價單資料 (共 ${gtableRowsToProcess.length} 筆，已跳過 ${SKIP_COUNT} 筆)...`);

    for (let i = 0; i < gtableRowsToProcess.length; i++) {
      currentIndex = SKIP_COUNT + i + 1;
      const gtableRow = gtableRowsToProcess[i];

      try {
        // 轉換 Big5 編碼
        const convertedRow = convertObjectBig5ToUtf8(gtableRow);

        // 轉換為 Quote 資料
        const quoteData = convertGtableToQuote(convertedRow);

        // 檢查必要欄位
        if (!quoteData.id) {
          console.log(`   ⏭️  跳過第 ${currentIndex} 筆: 缺少 QNO`);
          quoteSkipCount++;
          continue;
        }

        // 檢查是否已存在
        const existing = await quoteRepo.findOne({
          where: { id: quoteData.id },
        });

        if (existing) {
          console.log(`   ⏭️  跳過第 ${currentIndex} 筆: 報價單 ${quoteData.id} 已存在`);
          quoteSkipCount++;
          continue;
        }

        // 檢查 Staff 是否存在，如果不存在則設為 null
        if (quoteData.staffId) {
          const staffExists = await staffRepo.findOne({
            where: { id: quoteData.staffId },
          });
          if (!staffExists) {
            // Staff 不存在，將 staffId 設為 null（不顯示錯誤）
            quoteData.staffId = undefined;
          }
        }

        // 檢查 Customer 是否存在，如果不存在則設為 null
        if (quoteData.customerId) {
          const customerExists = await customerRepo
            .createQueryBuilder('customer')
            .where('customer.id = CONVERT(:id USING utf8mb4)', { id: quoteData.customerId })
            .getOne();
          if (!customerExists) {
            // Customer 不存在，將 customerId 設為 null（不顯示錯誤）
            quoteData.customerId = undefined;
          }
        }

        // 建立 Quote
        const quote = quoteRepo.create(quoteData);
        await quoteRepo.save(quote);
        quoteSuccessCount++;

        if (quoteSuccessCount % 50 === 0) {
          console.log(`   📊 進度: ${i + 1}/${gtableRowsToProcess.length} (成功: ${quoteSuccessCount}, 跳過: ${quoteSkipCount}, 錯誤: ${quoteErrorCount})`);
        }
      } catch (error: any) {
        // 檢查是否為可跳過的錯誤
        const errorMessage = error.message || '';
        const errorCode = error.code || '';
        
        // ER_TRUNCATED_WRONG_VALUE_FOR_FIELD 或其他可跳過的錯誤
        if (
          errorCode === 'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD' ||
          errorMessage.includes('ER_TRUNCATED_WRONG_VALUE_FOR_FIELD') ||
          errorMessage.includes('Incorrect string value') ||
          errorMessage.includes('customer_id') && errorMessage.includes('foreign key')
        ) {
          console.log(`   ⏭️  跳過第 ${currentIndex} 筆: 資料格式錯誤或 customer_id 不存在 (QNO: ${gtableRow.QNO})`);
          quoteSkipCount++;
          quoteErrorCount++;
          continue;
        }
        
        // 其他錯誤仍然中斷
        console.error(`\n❌ 處理報價單失敗 (第 ${currentIndex} 筆, QNO: ${gtableRow.QNO}):`);
        console.error(`   錯誤訊息: ${error.message}`);
        if (error.stack) {
          console.error('\n   堆疊追蹤:');
          const stackLines = error.stack.split('\n').slice(0, 10);
          stackLines.forEach((line) => console.error('   ' + line));
        }
        throw error; // 立即中斷
      }
    }

    // 處理報價單工件 (itable + jtable)
    console.log(`\n📝 處理報價單工件資料 (共 ${itableRows.length} 筆)...`);
    
    // 建立 itable 的索引，按 QNO 分組
    const itableByQno: Map<string, any[]> = new Map();
    for (const irow of itableRows) {
      const qno = irow.QNO ? String(irow.QNO).trim() : '';
      if (qno) {
        if (!itableByQno.has(qno)) {
          itableByQno.set(qno, []);
        }
        itableByQno.get(qno)!.push(irow);
      }
    }

    let processedItemCount = 0;
    for (const itableRow of itableRows) {
      processedItemCount++;
      
      try {
        // 轉換 Big5 編碼
        const convertedItableRow = convertObjectBig5ToUtf8(itableRow);

        // 取得對應的 jtable 資料
        const qno = convertedItableRow.QNO ? String(convertedItableRow.QNO).trim() : '';
        const sn = convertedItableRow.SN ? String(convertedItableRow.SN).trim() : '';
        const jtableKey = qno && sn ? `${qno}_${sn}` : '';
        const jtableRow = jtableKey ? jtableIndex.get(jtableKey) : null;

        // 轉換為 QuoteItem 資料
        const quoteItemData = convertItableJtableToQuoteItem(convertedItableRow, jtableRow);

        // 檢查必要欄位
        if (!quoteItemData.id || !quoteItemData.quoteId) {
          console.log(`   ⏭️  跳過第 ${processedItemCount} 筆: 缺少必要欄位 (QNO: ${qno}, SN: ${sn})`);
          quoteItemSkipCount++;
          continue;
        }

        // 檢查是否已存在
        const existing = await quoteItemRepo.findOne({
          where: { id: quoteItemData.id },
        });

        if (existing) {
          quoteItemSkipCount++;
          continue;
        }

        // 建立 QuoteItem
        const quoteItem = quoteItemRepo.create(quoteItemData);
        await quoteItemRepo.save(quoteItem);
        quoteItemSuccessCount++;

        if (quoteItemSuccessCount % 100 === 0) {
          console.log(`   📊 進度: ${processedItemCount}/${itableRows.length} (成功: ${quoteItemSuccessCount}, 跳過: ${quoteItemSkipCount}, 錯誤: ${quoteItemErrorCount})`);
        }
      } catch (error: any) {
        // 檢查是否為可跳過的錯誤
        const errorMessage = error.message || '';
        const errorCode = error.code || '';
        
        // ER_TRUNCATED_WRONG_VALUE_FOR_FIELD 或其他可跳過的錯誤
        if (
          errorCode === 'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD' ||
          errorMessage.includes('ER_TRUNCATED_WRONG_VALUE_FOR_FIELD') ||
          errorMessage.includes('Incorrect string value') ||
          errorMessage.includes('customer_id') && errorMessage.includes('foreign key')
        ) {
          console.log(`   ⏭️  跳過第 ${processedItemCount} 筆: 資料格式錯誤或 customer_id 不存在 (QNO: ${itableRow.QNO}, SN: ${itableRow.SN})`);
          quoteItemSkipCount++;
          quoteItemErrorCount++;
          continue;
        }
        
        // 其他錯誤仍然中斷
        console.error(`\n❌ 處理報價單工件失敗 (第 ${processedItemCount} 筆, QNO: ${itableRow.QNO}, SN: ${itableRow.SN}):`);
        console.error(`   錯誤訊息: ${error.message}`);
        if (error.stack) {
          console.error('\n   堆疊追蹤:');
          const stackLines = error.stack.split('\n').slice(0, 10);
          stackLines.forEach((line) => console.error('   ' + line));
        }
        throw error; // 立即中斷
      }
    }

    // 完成
    console.log('\n' + '='.repeat(80));
    console.log('✅ 遷移完成！');
    console.log('='.repeat(80));
    console.log(`📊 報價單處理統計:`);
    console.log(`   總共: ${gtableRowsToProcess.length} 筆`);
    console.log(`   ✅ 成功: ${quoteSuccessCount} 筆`);
    console.log(`   ⏭️  跳過: ${quoteSkipCount} 筆`);
    if (quoteErrorCount > 0) {
      console.log(`   ⚠️  錯誤跳過: ${quoteErrorCount} 筆`);
    }
    console.log(`\n📊 報價單工件處理統計:`);
    console.log(`   總共: ${itableRows.length} 筆`);
    console.log(`   ✅ 成功: ${quoteItemSuccessCount} 筆`);
    console.log(`   ⏭️  跳過: ${quoteItemSkipCount} 筆`);
    if (quoteItemErrorCount > 0) {
      console.log(`   ⚠️  錯誤跳過: ${quoteItemErrorCount} 筆`);
    }
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
      console.log('\n🔌 資料庫連接已關閉');
    }
  }
}

// 執行腳本
migrateQuoteFromAccess().catch((error) => {
  console.error('❌ 未預期的錯誤：', error);
  process.exit(1);
});

