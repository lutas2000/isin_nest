import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { StaffModule } from './hr/staff/staff.module';
import { StaffLeaveModule } from './hr/staff-leave/staff-leave.module';
import { StaffManhourModule } from './hr/staff-manhour/staff-manhour.module';
import { StaffManhour2Module } from './hr/staff-manhour/staff-manhour2.module';
import { StaffSegmentModule } from './hr/staff-segment/staff-segment.module';
import { AuthModule } from './auth/auth.module';

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
        type: 'mysql', // 資料庫類型，可改為 mysql、sqlite 等
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USER'),
        password: configService.get<string>('DB_PASS'),
        database: configService.get<string>('DB_NAME'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'], // 定義實體的位置
        synchronize: true,
        charset: 'utf8mb4',
        extra: {
          charset: 'utf8mb4',
          collation: 'utf8mb4_unicode_ci',
          connectionLimit: 10,
          acquireTimeout: 60000,
          timeout: 60000,
        },
      }),
    }),
    // 業務模組
    StaffModule,
    StaffLeaveModule,
    StaffManhourModule,
    StaffManhour2Module,
    StaffSegmentModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
