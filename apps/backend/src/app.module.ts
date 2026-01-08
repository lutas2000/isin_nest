import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HrModule } from './hr/hr.module';
import { AuthModule } from './auth/auth.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { CrmModule } from './crm/crm.module';

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
        entities: [__dirname + '/**/*.entity{.ts,.js}'], // 定義實體的位置
        synchronize: process.env.NODE_ENV === 'development', // 只在開發環境啟用同步
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
