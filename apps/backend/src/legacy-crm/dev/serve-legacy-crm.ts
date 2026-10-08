/**
 * 開發與比對用：只載入登入、權限與舊版銷管模組的後端，不讀 .env、不啟動排程與打卡機連線。
 * 用來對測試資料庫驗證 legacy-crm API（例如與 isin_vb6 API 的錄製比對）；不要指向正式資料庫。
 *
 *   DB_HOST=127.0.0.1 DB_PORT=55432 DB_USER=test DB_PASS=test DB_NAME=isin_test \
 *   JWT_SECRET=dev-only PORT=3100 npx ts-node -r tsconfig-paths/register \
 *     apps/backend/src/legacy-crm/dev/serve-legacy-crm.ts
 */
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../../auth/auth.module';
import { GlobalExceptionFilter } from '../../common/filters/global-exception.filter';
import { LegacyCrmModule } from '../legacy-crm.module';

for (const name of ['DB_HOST', 'DB_USER', 'DB_NAME', 'JWT_SECRET']) {
  if (!process.env[name])
    throw new Error(`請設定環境變數 ${name}（此伺服器不讀 .env）`);
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT) || 5432,
      username: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
      autoLoadEntities: true,
      synchronize: false,
    }),
    AuthModule,
    LegacyCrmModule,
  ],
})
class LegacyCrmDevModule {}

async function bootstrap() {
  const app = await NestFactory.create(LegacyCrmDevModule, {
    logger: ['error', 'warn'],
  });
  app.useGlobalFilters(new GlobalExceptionFilter());
  const port = Number(process.env.PORT) || 3100;
  await app.listen(port, '127.0.0.1');
  console.log(
    `legacy-crm dev server: http://127.0.0.1:${port}（DB ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}）`,
  );
}
void bootstrap();
