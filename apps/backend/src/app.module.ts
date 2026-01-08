import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HrModule } from './hr/hr.module';
import { AuthModule } from './auth/auth.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { CrmModule } from './crm/crm.module';

function parseBool(value: string | undefined): boolean | undefined {
  if (value === undefined) return undefined;
  const v = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'y', 'on'].includes(v)) return true;
  if (['0', 'false', 'no', 'n', 'off'].includes(v)) return false;
  return undefined;
}

@Module({
  imports: [
    // Environment variables
    ConfigModule.forRoot({
      isGlobal: true, // 設置為全局模塊（不需要在其他模塊中再次導入）
      envFilePath: '.env', // 指定 .env 文件的路徑（默認為根目錄）
    }),
    // Database
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST'),
        port: Number(configService.get<string>('DB_PORT')) || 5432,
        username: configService.get<string>('DB_USER'),
        password: configService.get<string>('DB_PASS'),
        database: configService.get<string>('DB_NAME'),
        // 注意：本專案後端是用 Nx webpack bundle 成單一檔案，`__dirname` 掃描在容器內可能找不到 entity 檔。
        // 因此改用 autoLoadEntities，讓各 Module 的 TypeOrmModule.forFeature([Entity]) 自動註冊到 DataSource。
        autoLoadEntities: true,
        entities: [], // 避免 bundle 情境下 glob 掃描失敗造成 EntityMetadataNotFoundError
        // Docker/本機快速啟動可用 DB_SYNC=true 自動建表；正式環境建議關閉並改用 migration
        synchronize:
          parseBool(configService.get<string>('DB_SYNC')) ??
          process.env.NODE_ENV === 'development', // 只在開發環境預設啟用同步
        extra: {
          max: 10,
        },
        // logging: ['error', 'schema'], // debug db 用
      }),
    }),
    HrModule,
    AuthModule,
    SchedulerModule,
    CrmModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
