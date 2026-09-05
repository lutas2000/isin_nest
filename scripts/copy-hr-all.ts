import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

const envPath = resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

const SOURCE_DB =
  process.env.SOURCE_DB_NAME || process.env.SOURCE_DB_DATABASE || 'isin2';

const sourceDbConfig = {
  host: process.env.SOURCE_DB_HOST || process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.SOURCE_DB_PORT || '3306', 10),
  user:
    process.env.SOURCE_DB_USER ||
    process.env.SOURCE_DB_USERNAME ||
    process.env.DB_USER ||
    'root',
  password:
    process.env.SOURCE_DB_PASS ||
    process.env.SOURCE_DB_PASSWORD ||
    process.env.DB_PASS ||
    '',
};

const TARGET_DB = process.env.DB_NAME || process.env.DB_DATABASE || 'isin_db';

const targetDbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER || process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASS || process.env.DB_PASSWORD || '',
};

const HR_TABLES = [
  'staff',
  'staff_leave',
  'staff_manhour',
  'staff_manhour2',
  'staff_segment',
  'staff_vacation',
  'staff_workhour',
  'staff_authority',
  'attend_record',
];

async function getCommonColumns(
  sourceDataSource: DataSource,
  targetDataSource: DataSource,
  tableName: string,
): Promise<string[]> {
  const sourceColumns = await sourceDataSource.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = '${SOURCE_DB}' AND TABLE_NAME = '${tableName}'
     ORDER BY ORDINAL_POSITION`,
  );
  const sourceColumnNames = sourceColumns.map((row: { COLUMN_NAME: string }) => row.COLUMN_NAME);

  const targetColumns = await targetDataSource.query(
    `SELECT column_name AS "COLUMN_NAME"
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = '${tableName}'
     ORDER BY ordinal_position`,
  );
  const targetColumnNames = targetColumns.map((row: { COLUMN_NAME: string }) => row.COLUMN_NAME);

  return sourceColumnNames.filter((col: string) => targetColumnNames.includes(col));
}

async function copyTable(
  sourceDataSource: DataSource,
  targetDataSource: DataSource,
  tableName: string,
): Promise<number> {
  const columns = await getCommonColumns(sourceDataSource, targetDataSource, tableName);
  if (columns.length === 0) {
    console.log(`⚠️  跳過 ${tableName}: 無共同欄位`);
    return 0;
  }

  const quotedCols = columns.map((c) => `"${c}"`).join(', ');
  const rows = await sourceDataSource.query(`SELECT ${columns.join(', ')} FROM \`${tableName}\``);

  await targetDataSource.query(`DELETE FROM "${tableName}"`);

  let copied = 0;
  for (const row of rows) {
    const values = columns.map((_, i) => `$${i + 1}`);
    await targetDataSource.query(
      `INSERT INTO "${tableName}" (${quotedCols}) VALUES (${values.join(', ')})`,
      columns.map((col) => row[col]),
    );
    copied++;
  }

  console.log(`✅ ${tableName}: 複製 ${copied} 筆`);
  return copied;
}

async function main(): Promise<void> {
  const sourceDataSource = new DataSource({
    type: 'mysql',
    host: sourceDbConfig.host,
    port: sourceDbConfig.port,
    username: sourceDbConfig.user,
    password: sourceDbConfig.password,
    database: SOURCE_DB,
  });

  const targetDataSource = new DataSource({
    type: 'postgres',
    host: targetDbConfig.host,
    port: targetDbConfig.port,
    username: targetDbConfig.user,
    password: targetDbConfig.password,
    database: TARGET_DB,
  });

  await sourceDataSource.initialize();
  await targetDataSource.initialize();

  console.log('開始複製 HR 資料表...');
  let total = 0;
  for (const table of HR_TABLES) {
    total += await copyTable(sourceDataSource, targetDataSource, table);
  }
  console.log(`\n完成，共複製 ${total} 筆記錄`);

  await sourceDataSource.destroy();
  await targetDataSource.destroy();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
