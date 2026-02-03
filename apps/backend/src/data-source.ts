import { DataSource, DataSourceOptions } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

// 載入 .env 檔案（從專案根目錄）
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

function parseBool(value: string | undefined): boolean | undefined {
  if (value === undefined) return undefined;
  const v = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'y', 'on'].includes(v)) return true;
  if (['0', 'false', 'no', 'n', 'off'].includes(v)) return false;
  return undefined;
}

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  username: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  // Entity 路徑 - 使用 glob pattern
  entities: [path.join(__dirname, '**/*.entity{.ts,.js}')],
  // Migration 設定
  migrations: [path.join(__dirname, 'migrations/*{.ts,.js}')],
  migrationsTableName: 'typeorm_migrations',
  // 關閉自動同步，使用 migration 管理 schema
  synchronize: parseBool(process.env.DB_SYNC) ?? false,
  // 日誌設定
  logging: process.env.NODE_ENV === 'development' ? ['error', 'schema', 'migration'] : ['error'],
};

// 用於 TypeORM CLI
const dataSource = new DataSource(dataSourceOptions);
export default dataSource;
