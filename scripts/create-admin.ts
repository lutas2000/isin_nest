import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import { User } from '../apps/backend/src/auth/entities/user.entity';
import { Staff } from '../apps/backend/src/hr/staff/entities/staff.entity';
import { resolve } from 'path';

// 載入環境變數
const envPath = resolve(__dirname, '../apps/backend/.env');
dotenv.config({ path: envPath });

async function createAdminUser() {
  // 從命令列參數或環境變數取得用戶名和密碼
  const userName = process.argv[2] || process.env.ADMIN_USERNAME || 'admin';
  const password = process.argv[3] || process.env.ADMIN_PASSWORD;

  if (!password) {
    console.error('❌ 錯誤：請提供密碼');
    console.log('使用方法：');
    console.log('  npm run create-admin <username> <password>');
    console.log('或設定環境變數：');
    console.log('  ADMIN_USERNAME=admin ADMIN_PASSWORD=yourpassword npm run create-admin');
    process.exit(1);
  }

  // 建立資料庫連接
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
    entities: [User, Staff],
    synchronize: false,
  });

  try {
    console.log('🔌 正在連接資料庫...');
    await dataSource.initialize();
    console.log('✅ 資料庫連接成功');

    const userRepository = dataSource.getRepository(User);

    // 檢查用戶是否已存在
    const existingUser = await userRepository.findOne({
      where: { userName },
    });

    if (existingUser) {
      console.log(`⚠️  用戶 "${userName}" 已存在`);
      
      // 詢問是否要更新為管理員
      const updateToAdmin = process.argv[4] === '--force' || process.env.FORCE_UPDATE === 'true';
      
      if (updateToAdmin) {
        console.log('🔄 正在更新用戶為管理員...');
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        
        existingUser.password = hashedPassword;
        existingUser.isAdmin = true;
        await userRepository.save(existingUser);
        
        console.log(`✅ 用戶 "${userName}" 已更新為管理員`);
        console.log(`   用戶名: ${existingUser.userName}`);
        console.log(`   管理員權限: ${existingUser.isAdmin ? '是' : '否'}`);
      } else {
        console.log('💡 提示：使用 --force 參數可以更新現有用戶為管理員');
        console.log('   例如: npm run create-admin admin newpassword --force');
      }
    } else {
      // 建立新用戶
      console.log(`📝 正在建立管理員用戶 "${userName}"...`);
      
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      const newUser = userRepository.create({
        userName,
        password: hashedPassword,
        isAdmin: true,
        features: [],
      });

      const savedUser = await userRepository.save(newUser);

      console.log('✅ 管理員用戶建立成功！');
      console.log(`   用戶名: ${savedUser.userName}`);
      console.log(`   管理員權限: ${savedUser.isAdmin ? '是' : '否'}`);
      console.log(`   用戶 ID: ${savedUser.id}`);
    }
  } catch (error) {
    console.error('❌ 發生錯誤：', error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    // 關閉資料庫連接
    if (dataSource.isInitialized) {
      await dataSource.destroy();
      console.log('🔌 資料庫連接已關閉');
    }
  }
}

// 執行腳本
createAdminUser().catch((error) => {
  console.error('❌ 未預期的錯誤：', error);
  process.exit(1);
});

