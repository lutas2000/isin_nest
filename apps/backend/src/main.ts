import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from '@nestjs/common';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { FileLoggerService } from './common/logger/file-logger.service';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const fileLogger = new FileLoggerService();
  
  // 處理未捕獲的異常
  process.on('uncaughtException', (error: Error) => {
    logger.error('未捕獲的異常:', error);
    fileLogger.error(
      `未捕獲的異常: ${error.message}`,
      error.stack,
      'UncaughtException',
    );
    process.exit(1);
  });

  // 處理未處理的 Promise rejection
  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    logger.error('未處理的 Promise rejection:', reason);
    const errorMessage = reason instanceof Error 
      ? reason.message 
      : String(reason);
    const errorStack = reason instanceof Error 
      ? reason.stack 
      : JSON.stringify(reason, null, 2);
    fileLogger.error(
      `未處理的 Promise rejection: ${errorMessage}`,
      errorStack,
      'UnhandledRejection',
    );
  });
  
  try {
    logger.log('正在啟動應用程式...');
    const app = await NestFactory.create(AppModule, {
      logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    });

    // 註冊全局異常過濾器
    app.useGlobalFilters(new GlobalExceptionFilter());

  // 啟用 CORS
  app.enableCors({
    origin: [
      'http://localhost:3000',  // 前端默認端口
      'http://localhost:3001',  // 前端開發端口
      'http://localhost:5173',  // Vite 默認端口
      'http://localhost:8080',  // 其他可能的端口
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  // Swagger 配置
  const config = new DocumentBuilder()
    .setTitle('ISIN Nest API')
    .setDescription('ISIN Nest API 文件')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: '請輸入 JWT token',
        in: 'header',
      },
      'JWT-auth', // 这里是 security scheme name
    )
    .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);

    const port = process.env.PORT ?? 3000;
    await app.listen(port, '0.0.0.0');
    logger.log(`✅ 應用程式已成功啟動在端口 ${port}`);
    logger.log(`📚 Swagger 文件: http://localhost:${port}/api`);
  } catch (error) {
    logger.error('❌ 應用程式啟動失敗:', error);
    
    // 將啟動錯誤寫入檔案
    if (error instanceof Error) {
      fileLogger.error(
        `應用程式啟動失敗: ${error.message}`,
        error.stack,
        'Bootstrap',
      );
      logger.error('錯誤訊息:', error.message);
      logger.error('錯誤堆疊:', error.stack);
    } else {
      fileLogger.error(
        `應用程式啟動失敗: ${String(error)}`,
        undefined,
        'Bootstrap',
      );
    }
    
    process.exit(1);
  }
}
void bootstrap();
