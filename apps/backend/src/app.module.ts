import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as path from 'path';
import { HrModule } from './hr/hr.module';
import { AuthModule } from './auth/auth.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { CrmModule } from './crm/crm.module';
import { ProcessingRefactor1738764000000 } from './migrations/1738764000000-ProcessingRefactor';
import { RemoveProcessingNotes1738764100000 } from './migrations/1738764100000-RemoveProcessingNotes';
import { NestingRefactor1770712368183 } from './migrations/1770712368183-NestingRefactor';
import { AddCncFileNameToCuttingWorkOrder1773619200000 } from './migrations/1773619200000-AddCncFileNameToCuttingWorkOrder';
import { DesignWorkOrderDrawingGroup1774000000000 } from './migrations/1774000000000-DesignWorkOrderDrawingGroup';
import { AddSubstituteToOrderItem1774100000000 } from './migrations/1774100000000-AddSubstituteToOrderItem';
import { AddQuoteDeadlineAndSupplyMaterialToQuote1775900000000 } from './migrations/1775900000000-AddQuoteDeadlineAndSupplyMaterialToQuote';
import { AddSalesVoucher1776000000000 } from './migrations/1776000000000-AddSalesVoucher';
import { RemoveSalesVoucherItemCuttingTimeAndStatus1776100000000 } from './migrations/1776100000000-RemoveSalesVoucherItemCuttingTimeAndStatus';
import { RemoveSalesVoucherItemNestingId1776110000000 } from './migrations/1776110000000-RemoveSalesVoucherItemNestingId';
import { ChangeQuoteSupplyMaterialToVarchar1776200000000 } from './migrations/1776200000000-ChangeQuoteSupplyMaterialToVarchar';
import { AddCodeToProcessing1776414821092 } from './migrations/1776414821092-AddCodeToProcessing';
import { FixMissingColumnsFromSync1776500000000 } from './migrations/1776500000000-FixMissingColumnsFromSync';

function parseBool(value: string | undefined): boolean | undefined {
  if (value === undefined) return undefined;
  const v = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'y', 'on'].includes(v)) return true;
  if (['0', 'false', 'no', 'n', 'off'].includes(v)) return false;
  return undefined;
}

// 專案根目錄 .env（與 data-source.ts、scripts 一致）
const rootEnvPath = path.resolve(__dirname, '../../../.env');

@Module({
  imports: [
    // Environment variables（統一使用專案根目錄 .env）
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: rootEnvPath,
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
        // Migration 設定（webpack bundle 環境必須直接傳入類別，不能用 glob 路徑）
        migrations: [
          ProcessingRefactor1738764000000,
          RemoveProcessingNotes1738764100000,
          NestingRefactor1770712368183,
          AddCncFileNameToCuttingWorkOrder1773619200000,
          DesignWorkOrderDrawingGroup1774000000000,
          AddSubstituteToOrderItem1774100000000,
          AddQuoteDeadlineAndSupplyMaterialToQuote1775900000000,
          AddSalesVoucher1776000000000,
          RemoveSalesVoucherItemCuttingTimeAndStatus1776100000000,
          RemoveSalesVoucherItemNestingId1776110000000,
          ChangeQuoteSupplyMaterialToVarchar1776200000000,
          AddCodeToProcessing1776414821092,
          FixMissingColumnsFromSync1776500000000,
        ],
        migrationsRun: parseBool(configService.get<string>('DB_MIGRATIONS_RUN')) ?? false,
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
