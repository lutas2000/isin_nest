/**
 * 新增離職員工：僅 INSERT/UPDATE `staff` 表，不碰 `users`。
 * 到職日、離職日固定為 1990-02-28，供 legacy ACTOR_NO 等 FK 對應。
 *
 * 用法：
 *   npm run create-resigned-staff -- <員工id> <員工姓名>
 *   npm run create-resigned-staff -- A99 王小明 --force
 */
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

const envPath = resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

const PLACEHOLDER_WORK_DATE = '1990-02-28';

async function createResignedStaff() {
  const staffId = process.argv[2]?.trim();
  const staffName = process.argv[3]?.trim();
  const forceUpdate =
    process.argv.includes('--force') || process.env.FORCE_UPDATE === 'true';

  if (!staffId || !staffName) {
    console.error('❌ 錯誤：請提供員工編號與姓名');
    console.log('使用方法：');
    console.log('  npm run create-resigned-staff -- <員工id> <員工姓名>');
    console.log('範例：');
    console.log('  npm run create-resigned-staff -- A99 楊明家');
    console.log('更新已存在員工：');
    console.log('  npm run create-resigned-staff -- A99 楊明家 --force');
    process.exit(1);
  }

  if (staffId.length > 10) {
    console.error(`❌ 員工編號不可超過 10 字元（目前 ${staffId.length} 字）`);
    process.exit(1);
  }

  if (staffName.length > 50) {
    console.error(`❌ 姓名不可超過 50 字元（目前 ${staffName.length} 字）`);
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

    const existing = await dataSource.query<{ id: string; name: string }[]>(
      `SELECT id, name FROM staff WHERE id = $1`,
      [staffId],
    );

    if (existing.length > 0) {
      if (!forceUpdate) {
        console.log(`⚠️  員工 "${staffId}" 已存在（姓名：${existing[0].name}）`);
        console.log('💡 使用 --force 可更新為離職 placeholder 資料');
        process.exit(0);
      }

      console.log(`🔄 正在更新離職員工 "${staffId}"…`);
      await dataSource.query(
        `
        UPDATE staff SET
          name = $2,
          begain_work = $3::date,
          stop_work = $3::date,
          need_check = false,
          benifit = false,
          is_foreign = false,
          have_fake = false,
          wage = 0,
          allowance = 0,
          organizer = 0,
          labor_insurance = 0,
          health_insurance = 0,
          pension = 0
        WHERE id = $1
        `,
        [staffId, staffName, PLACEHOLDER_WORK_DATE],
      );
      console.log('✅ 離職員工已更新（僅 staff 表）');
    } else {
      console.log(`📝 正在建立離職員工 "${staffId}"（${staffName}）…`);
      await dataSource.query(
        `
        INSERT INTO staff (
          id, "userId", name,
          begain_work, stop_work,
          wage, allowance, organizer,
          labor_insurance, health_insurance, pension,
          is_foreign, benifit, need_check, have_fake
        ) VALUES (
          $1, NULL, $2,
          $3::date, $3::date,
          0, 0, 0,
          0, 0, 0,
          false, false, false, false
        )
        `,
        [staffId, staffName, PLACEHOLDER_WORK_DATE],
      );
      console.log('✅ 離職員工建立成功（僅 staff 表，無 users）');
    }

    const [row] = await dataSource.query<
      { id: string; name: string; begain_work: string; stop_work: string }[]
    >(
      `SELECT id, name, begain_work::text, stop_work::text FROM staff WHERE id = $1`,
      [staffId],
    );
    if (row) {
      console.log(`   員工編號: ${row.id}`);
      console.log(`   姓名: ${row.name}`);
      console.log(`   到職日期: ${row.begain_work}`);
      console.log(`   離職日期: ${row.stop_work}`);
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

createResignedStaff().catch((error) => {
  console.error('❌ 未預期的錯誤：', error);
  process.exit(1);
});
