import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as readline from 'readline';

// 載入環境變數（專案根目錄 .env）
const envPath = resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

function askQuestion(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolveAnswer) => {
    rl.question(question, (answer) => {
      rl.close();
      resolveAnswer(answer.trim());
    });
  });
}

async function main() {
  const dbHost = process.env.DB_HOST || 'localhost';
  const dbPort = parseInt(process.env.DB_PORT || '5432', 10);
  const dbUser = process.env.DB_USER || process.env.DB_USERNAME || 'postgres';
  const dbPass = process.env.DB_PASS || process.env.DB_PASSWORD || '';
  const dbName = process.env.DB_NAME || process.env.DB_DATABASE || 'postgres';

  console.log('🧩 PostgreSQL 資料庫恢復工具');
  console.log(`📊 目標資料庫: ${dbUser}@${dbHost}:${dbPort}/${dbName}`);

  const cliFileArg = process.argv[2];
  let inputFile =
    cliFileArg ||
    (await askQuestion('請輸入要恢復的備份檔路徑（例如：backups/xxxx.sql）：'));

  inputFile = inputFile.trim();

  if (!inputFile) {
    console.error('❌ 錯誤：必須提供備份檔路徑');
    process.exit(1);
  }

  if (!fs.existsSync(inputFile)) {
    console.error(`❌ 錯誤：檔案不存在：${inputFile}`);
    process.exit(1);
  }

  console.log('\n⚠️  注意：此操作可能會覆蓋現有資料。');
  const confirm = await askQuestion('確認要繼續嗎？(yes/no)：');
  if (!['y', 'yes', 'Y', 'YES'].includes(confirm.trim())) {
    console.log('⏹ 已取消恢復操作');
    process.exit(0);
  }

  console.log(`\n📥 即將從檔案恢復：${inputFile}`);
  console.log('🚀 開始恢復（使用 psql）...');

  const env = {
    ...process.env,
    PGPASSWORD: dbPass,
  };

  const args: string[] = [];
  args.push('-h', dbHost);
  args.push('-p', String(dbPort));
  args.push('-U', dbUser);
  args.push('-d', dbName);
  args.push('-f', inputFile);

  const psql = spawn('psql', args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    env,
  });

  psql.stdout.on('data', (data) => {
    process.stdout.write(data);
  });

  psql.stderr.on('data', (data) => {
    process.stderr.write(data);
  });

  psql.on('close', (code) => {
    if (code === 0) {
      console.log('\n✅ 恢復完成');
      process.exit(0);
    } else {
      console.error(`\n❌ 恢復失敗，psql 退出碼: ${code}`);
      process.exit(code ?? 1);
    }
  });
}

main().catch((error) => {
  console.error('❌ 未預期的錯誤：', error);
  process.exit(1);
});

