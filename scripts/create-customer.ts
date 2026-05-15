/**
 * 新增客戶（公司）：僅 INSERT/UPDATE `customer` 表。
 * 供 legacy FACTOR_NO 等 FK 對應，或遷移時補齊缺少的客戶。
 *
 * 用法：
 *   npm run create-customer -- <客戶id> <公司名稱>
 *   npm run create-customer -- 111 臨時 --force
 */
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

const envPath = resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

type CustomerRow = {
  id: string;
  companyName: string;
  creditLimit: string;
  accountReceivable: string;
};

async function createCustomer() {
  const customerId = process.argv[2]?.trim();
  const companyName = process.argv[3]?.trim();
  const forceUpdate =
    process.argv.includes('--force') || process.env.FORCE_UPDATE === 'true';

  if (!customerId || !companyName) {
    console.error('❌ 錯誤：請提供客戶編號與公司名稱');
    console.log('使用方法：');
    console.log('  npm run create-customer -- <客戶id> <公司名稱>');
    console.log('範例：');
    console.log('  npm run create-customer -- 111 臨時');
    console.log('更新已存在客戶：');
    console.log('  npm run create-customer -- 111 臨時 --force');
    process.exit(1);
  }

  if (customerId.length > 50) {
    console.error(`❌ 客戶編號不可超過 50 字元（目前 ${customerId.length} 字）`);
    process.exit(1);
  }

  if (companyName.length > 200) {
    console.error(`❌ 公司名稱不可超過 200 字元（目前 ${companyName.length} 字）`);
    process.exit(1);
  }

  const dbHost = process.env.DB_HOST || 'localhost';
  const dbPort = parseInt(process.env.DB_PORT || '5432', 10);
  const dbUser = process.env.DB_USER || process.env.DB_USERNAME || 'postgres';
  const dbPass = process.env.DB_PASS || process.env.DB_PASSWORD || '';
  const dbName = process.env.DB_NAME || process.env.DB_DATABASE || 'isin_db';

  console.log(`📊 資料庫配置: ${dbUser}@${dbHost}:${dbPort}/${dbName}`);

  const dataSource = new DataSource({
    type: 'postgres',
    host: dbHost,
    port: dbPort,
    username: dbUser,
    password: dbPass,
    database: dbName,
  });

  try {
    console.log('🔌 正在連接資料庫...');
    await dataSource.initialize();
    console.log('✅ 資料庫連接成功');

    const existing = await dataSource.query<CustomerRow[]>(
      `SELECT id, "companyName", "creditLimit"::text, "accountReceivable"::text
       FROM customer WHERE id = $1`,
      [customerId],
    );

    if (existing.length > 0) {
      if (!forceUpdate) {
        console.log(
          `⚠️  客戶 "${customerId}" 已存在（公司名稱：${existing[0].companyName}）`,
        );
        console.log('💡 使用 --force 可更新公司名稱');
        process.exit(0);
      }

      console.log(`🔄 正在更新客戶 "${customerId}"…`);
      await dataSource.query(
        `
        UPDATE customer SET
          "companyName" = $2,
          updated_at = NOW()
        WHERE id = $1
        `,
        [customerId, companyName],
      );
      console.log('✅ 客戶已更新（僅 customer 表）');
    } else {
      console.log(`📝 正在建立客戶 "${customerId}"（${companyName}）…`);
      await dataSource.query(
        `
        INSERT INTO customer (id, "companyName", "creditLimit", "accountReceivable")
        VALUES ($1, $2, 0, 0)
        `,
        [customerId, companyName],
      );
      console.log('✅ 客戶建立成功（僅 customer 表）');
    }

    const [row] = await dataSource.query<CustomerRow[]>(
      `SELECT id, "companyName", "creditLimit"::text, "accountReceivable"::text
       FROM customer WHERE id = $1`,
      [customerId],
    );
    if (row) {
      console.log(`   客戶編號: ${row.id}`);
      console.log(`   公司名稱: ${row.companyName}`);
      console.log(`   信用額度: ${row.creditLimit}`);
      console.log(`   帳款: ${row.accountReceivable}`);
    }
  } catch (error) {
    console.error('❌ 發生錯誤：', error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
      console.log('🔌 資料庫連接已關閉');
    }
  }
}

createCustomer().catch((error) => {
  console.error('❌ 未預期的錯誤：', error);
  process.exit(1);
});
