import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import MDBReader from 'mdb-reader';
import iconv from 'iconv-lite';
import { Customer } from '../apps/backend/src/crm/customer/entities/customer.entity';
import { Contact } from '../apps/backend/src/crm/contact/entities/contact.entity';
import { Quote } from '../apps/backend/src/crm/quote/entities/quote.entity';
import { WorkOrder } from '../apps/backend/src/crm/work-order/entities/work-order.entity';
import { QuoteItem } from '../apps/backend/src/crm/quote-item/entities/quote-item.entity';
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
  process.argv[2] || process.env.ACCESS_FILE_PATH || '';

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
 * 格式: "90.04.24" -> 2001-04-24
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
    // 格式: "90.04.24" 或 "104.11.23"
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
 * 合併電話號碼為 JSON 陣列
 */
function mergePhones(tel1: string | null | undefined, tel2: string | null | undefined): string[] {
  const phones: string[] = [];
  
  if (tel1 && typeof tel1 === 'string') {
    const trimmed = tel1.trim();
    if (trimmed !== '') {
      phones.push(trimmed);
    }
  }
  
  if (tel2 && typeof tel2 === 'string') {
    const trimmed = tel2.trim();
    if (trimmed !== '' && !phones.includes(trimmed)) {
      phones.push(trimmed);
    }
  }
  
  return phones;
}

/**
 * 合併統一編號為 JSON 陣列
 */
function mergeTaxIds(coco: string | null | undefined, coco2: string | null | undefined): string[] {
  const taxIds: string[] = [];
  
  if (coco && typeof coco === 'string') {
    const trimmed = coco.trim();
    if (trimmed !== '') {
      taxIds.push(trimmed);
    }
  }
  
  if (coco2 && typeof coco2 === 'string') {
    const trimmed = coco2.trim();
    if (trimmed !== '' && !taxIds.includes(trimmed)) {
      taxIds.push(trimmed);
    }
  }
  
  return taxIds;
}

/**
 * 解析代理人字串，提取姓名和電話
 * 範例: "林東地 0933-555835 060-407730" -> { name: "林東地", phones: ["0933-555835", "060-407730"] }
 */
function parseAgent(agentStr: string | null | undefined): { name: string; phones: string[] } | null {
  if (!agentStr || typeof agentStr !== 'string') {
    return null;
  }

  const trimmed = agentStr.trim();
  if (trimmed === '') {
    return null;
  }

  // 嘗試解析電話號碼（可能包含 - 或空格）
  // 電話號碼模式: 數字、-、空格
  const phonePattern = /(\d{2,4}[-.\s]?\d{3,4}[-.\s]?\d{3,4})/g;
  const phones: string[] = [];
  let match;
  
  while ((match = phonePattern.exec(trimmed)) !== null) {
    const phone = match[1].replace(/\s+/g, '-');
    if (!phones.includes(phone)) {
      phones.push(phone);
    }
  }

  // 移除電話號碼後，剩餘部分作為姓名
  let name = trimmed;
  for (const phone of phones) {
    name = name.replace(phone.replace(/-/g, '[-.\s]?'), '').trim();
  }
  
  // 清理多餘空格
  name = name.replace(/\s+/g, ' ').trim();

  // 如果沒有找到姓名，但有電話，使用空字串
  // 如果沒有找到電話，整個字串作為姓名
  if (name === '' && phones.length > 0) {
    name = trimmed.split(phones[0])[0].trim() || '';
  }

  return {
    name: name || '',
    phones: phones,
  };
}

/**
 * 轉換 Access cust 資料為 Customer 實體資料
 */
function convertCustToCustomer(custRow: any): Partial<Customer> {
  const customer: Partial<Customer> = {
    id: custRow.code ? String(custRow.code).trim() : undefined,
    companyName: custRow.name ? String(custRow.name).trim() : undefined,
    companyShortName: custRow.cutname ? String(custRow.cutname).trim() : undefined,
    invoiceTitle: custRow.subname ? String(custRow.subname).trim() : undefined,
    phones: mergePhones(custRow.tel1, custRow.tel2),
    taxIds: mergeTaxIds(custRow.coco, custRow.coco2),
    postalCode: custRow.zipno ? String(custRow.zipno).trim() : undefined,
    address: custRow.addr ? String(custRow.addr).trim() : undefined,
    deliveryAddress: custRow.inaddr ? String(custRow.inaddr).trim() : undefined,
    bank: custRow.bank ? String(custRow.bank).trim() : undefined,
    accountNumber: custRow.account ? String(custRow.account).trim() : undefined,
    creditLimit: custRow.credit != null ? Number(custRow.credit) : 0,
    accountReceivable: custRow.debt != null ? Number(custRow.debt) : 0,
    fax: custRow.fax ? String(custRow.fax).trim() : undefined,
    email: custRow.email ? String(custRow.email).trim() : undefined,
    mainProducts: custRow.prod ? String(custRow.prod).trim() : undefined,
    notes: custRow.remark ? String(custRow.remark).trim() : undefined,
    ownerName: custRow.master ? String(custRow.master).trim() : undefined,
    dxfPath: custRow.dxfpath ? String(custRow.dxfpath).trim() : undefined,
    firstTransactionDate: convertRocDateToDate(custRow.deal_f),
    lastTransactionDate: convertRocDateToDate(custRow.deal_l),
  };

  // 移除空陣列
  if (customer.phones && customer.phones.length === 0) {
    customer.phones = undefined;
  }
  if (customer.taxIds && customer.taxIds.length === 0) {
    customer.taxIds = undefined;
  }

  return customer;
}

/**
 * 從代理人資料建立 Contact 實體
 */
function createContactsFromAgents(
  customerId: string,
  agent1: string | null | undefined,
  agent2: string | null | undefined,
  agent3: string | null | undefined,
): Partial<Contact>[] {
  const contacts: Partial<Contact>[] = [];

  [agent1, agent2, agent3].forEach((agent) => {
    const parsed = parseAgent(agent);
    if (parsed && (parsed.name || parsed.phones.length > 0)) {
      contacts.push({
        customerId: customerId,
        name: parsed.name || '代理人',
        phones: parsed.phones.length > 0 ? parsed.phones : undefined,
      });
    }
  });

  return contacts;
}

/**
 * 主函數
 */
async function migrateCustomerFromAccess() {
  let targetDataSource: DataSource | null = null;

  try {
    // 檢查 Access 檔案路徑
    if (!ACCESS_FILE_PATH) {
      console.error('❌ 錯誤：請提供 Access 檔案路徑');
      console.log('使用方法：');
      console.log('  npm run migrate-customer-from-access <access-file-path>');
      console.log('或設定環境變數：');
      console.log(
        '  ACCESS_FILE_PATH=/path/to/cust.mdb npm run migrate-customer-from-access',
      );
      process.exit(1);
    }

    console.log('🚀 開始從 Access 資料庫遷移客戶資料...');
    console.log(`📁 Access 檔案: ${ACCESS_FILE_PATH}`);
    console.log(`📊 目標資料庫: ${TARGET_DB}`);
    console.log(`🔌 資料庫主機: ${dbConfig.host}:${dbConfig.port}`);

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

    // 檢查是否有 cust 資料表
    const tableNames = reader.getTableNames({ normalTables: true });
    if (!tableNames.includes('cust')) {
      console.error('❌ 錯誤：Access 資料庫中找不到 cust 資料表');
      console.log(`   找到的資料表: ${tableNames.join(', ')}`);
      process.exit(1);
    }

    // 讀取 cust 資料表
    console.log('\n📋 正在讀取 cust 資料表...');
    const custTable = reader.getTable('cust');
    const custRows = custTable.getData();
    console.log(`✅ 讀取到 ${custRows.length} 筆客戶資料`);

    // 連接目標資料庫
    console.log('\n🔌 正在連接目標資料庫...');
    targetDataSource = new DataSource({
      type: 'mysql',
      host: dbConfig.host,
      port: dbConfig.port,
      username: dbConfig.user,
      password: dbConfig.password,
      database: TARGET_DB,
      entities: [Customer, Contact, Quote, WorkOrder, QuoteItem, WorkOrderItem, Staff, User, UserFeature, Feature],
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

    const customerRepo = targetDataSource.getRepository(Customer);
    const contactRepo = targetDataSource.getRepository(Contact);

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    let contactCount = 0;

    const batchSize = 100;
    for (let i = 0; i < custRows.length; i += batchSize) {
      const batch = custRows.slice(i, i + batchSize);
      
      for (const custRow of batch) {
        try {
          // 轉換 Big5 編碼
          const convertedRow = convertObjectBig5ToUtf8(custRow);

          // 轉換為 Customer 資料
          const customerData = convertCustToCustomer(convertedRow);

          // 檢查必要欄位
          if (!customerData.id || !customerData.companyName) {
            console.log(`   ⏭️  跳過: 缺少必要欄位 (code: ${customerData.id}, name: ${customerData.companyName})`);
            skipCount++;
            continue;
          }

          // 檢查是否已存在
          const existing = await customerRepo.findOne({
            where: { id: customerData.id },
          });

          if (existing) {
            console.log(`   ⏭️  跳過: 客戶 ${customerData.id} 已存在`);
            skipCount++;
            continue;
          }

          // 建立 Customer
          const customer = customerRepo.create(customerData);
          await customerRepo.save(customer);
          successCount++;

          // 建立 Contact（從代理人）
          const contacts = createContactsFromAgents(
            customerData.id!,
            convertedRow.agent1,
            convertedRow.agent2,
            convertedRow.agent3,
          );

          for (const contactData of contacts) {
            const contact = contactRepo.create(contactData);
            await contactRepo.save(contact);
            contactCount++;
          }

          if ((successCount + skipCount + errorCount) % 50 === 0) {
            console.log(`   📊 進度: ${successCount + skipCount + errorCount}/${custRows.length} (成功: ${successCount}, 跳過: ${skipCount}, 錯誤: ${errorCount})`);
          }
        } catch (error: any) {
          errorCount++;
          console.error(`   ❌ 處理客戶失敗 (code: ${custRow.code}):`, error.message);
        }
      }
    }

    // 完成
    console.log('\n' + '='.repeat(80));
    console.log('✅ 遷移完成！');
    console.log('='.repeat(80));
    console.log(`📊 總共處理: ${custRows.length} 筆`);
    console.log(`✅ 成功: ${successCount} 筆`);
    console.log(`⏭️  跳過: ${skipCount} 筆`);
    console.log(`❌ 錯誤: ${errorCount} 筆`);
    console.log(`👥 建立聯絡人: ${contactCount} 筆`);
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
migrateCustomerFromAccess().catch((error) => {
  console.error('❌ 未預期的錯誤：', error);
  process.exit(1);
});

