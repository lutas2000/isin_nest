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
        // 由各 module 的 TypeOrmModule.forFeature([...]) 自動註冊 entity
        // 避免 Nx webpack bundle 情境下 __dirname glob 掃描失效
        autoLoadEntities: true,
        entities: [],
        // Migration 設定
        migrationsRun: parseBool(configService.get<string>('DB_MIGRATIONS_RUN')) ?? false, // 啟動時是否自動執行 migration
        migrationsTableName: 'typeorm_migrations',
        // 開發環境可用 DB_SYNC=true 快速同步；正式環境建議關閉並使用 migration
        synchronize: parseBool(configService.get<string>('DB_SYNC')) ?? false,
        extra: {
          max: 10,
        },
        // logging: ['error', 'schema', 'migration'], // debug db 用
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
