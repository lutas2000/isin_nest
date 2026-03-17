import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as readline from 'readline';

// 載入環境變數（專案根目錄 .env）
const envPath = resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

type BackupMode = 'full' | 'schema' | 'data';

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

function getBackupModeFromAnswer(answer: string): BackupMode {
  switch (answer) {
    case '2':
      return 'schema';
    case '3':
      return 'data';
    case '1':
    default:
      return 'full';
  }
}

function buildDefaultFilename(mode: BackupMode): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const mi = String(now.getMinutes()).padStart(2, '0');

  const dbName = process.env.DB_NAME || process.env.DB_DATABASE || 'database';
  const modeSuffix =
    mode === 'schema' ? 'schema' : mode === 'data' ? 'data' : 'full';

  return `backups/${dbName}-${yyyy}${mm}${dd}-${hh}${mi}-${modeSuffix}.sql`;
}

function ensureBackupDir(filePath: string) {
  const dir = resolve(process.cwd(), filePath, '..');
  const dirPath = filePath.includes('/')
    ? resolve(process.cwd(), filePath.split('/').slice(0, -1).join('/'))
    : resolve(process.cwd(), 'backups');

  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

async function main() {
  const dbHost = process.env.DB_HOST || 'localhost';
  const dbPort = parseInt(process.env.DB_PORT || '5432', 10);
  const dbUser = process.env.DB_USER || process.env.DB_USERNAME || 'postgres';
  const dbPass = process.env.DB_PASS || process.env.DB_PASSWORD || '';
  const dbName = process.env.DB_NAME || process.env.DB_DATABASE || 'postgres';

  console.log('📦 PostgreSQL 資料庫備份工具');
  console.log(`📊 目標資料庫: ${dbUser}@${dbHost}:${dbPort}/${dbName}`);

  // 1. 選擇備份模式
  console.log('\n請選擇備份內容:');
  console.log('  1) 結構 + 資料（預設）');
  console.log('  2) 只有結構');
  console.log('  3) 只有資料');

  const modeAnswer =
    process.argv[2] && ['1', '2', '3'].includes(process.argv[2])
      ? process.argv[2]
      : await askQuestion('請輸入選項 (1/2/3)：');

  const backupMode = getBackupModeFromAnswer(modeAnswer);

  // 2. 取得輸出檔案路徑
  const defaultFile = buildDefaultFilename(backupMode);
  const cliFileArg = process.argv[3];

  let outputFile = cliFileArg || (await askQuestion(`輸出檔案路徑（預設: ${defaultFile}）：`));
  if (!outputFile) {
    outputFile = defaultFile;
  }

  ensureBackupDir(outputFile);

  console.log(`\n📝 備份模式: ${
    backupMode === 'schema'
      ? '只有結構'
      : backupMode === 'data'
      ? '只有資料'
      : '結構 + 資料'
  }`);
  console.log(`💾 輸出檔案: ${outputFile}`);

  const args: string[] = [];

  // 主機與連線設定
  args.push('-h', dbHost);
  args.push('-p', String(dbPort));
  args.push('-U', dbUser);

  // 模式
  if (backupMode === 'schema') {
    args.push('-s');
  } else if (backupMode === 'data') {
    args.push('-a');
  }

  // 輸出到檔案
  args.push('-f', outputFile);
  args.push(dbName);

  console.log('\n🚀 開始備份（使用 pg_dump）...');

  const env = {
    ...process.env,
    PGPASSWORD: dbPass,
  };

  const pgDump = spawn('pg_dump', args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    env,
  });

  pgDump.stdout.on('data', (data) => {
    process.stdout.write(data);
  });

  pgDump.stderr.on('data', (data) => {
    process.stderr.write(data);
  });

  pgDump.on('close', (code) => {
    if (code === 0) {
      console.log('\n✅ 備份完成');
      console.log(`   檔案位置: ${outputFile}`);
      process.exit(0);
    } else {
      console.error(`\n❌ 備份失敗，pg_dump 退出碼: ${code}`);
      process.exit(code ?? 1);
    }
  });
}

main().catch((error) => {
  console.error('❌ 未預期的錯誤：', error);
  process.exit(1);
});

